# Resume Parser API — Technical Documentation & Architecture Guide

This document provides a comprehensive technical guide explaining how the **Resume Parser API** works under the hood, detailing its architecture, state machine, pipeline stages, models, configuration, and execution flows.

---

## Table of Contents

1. [Overview & Philosophy](#1-overview--philosophy)
2. [High-Level Architecture](#2-high-level-architecture)
3. [Component Breakdown](#3-component-breakdown)
4. [Request Lifecycle & Data Flow](#4-request-lifecycle--data-flow)
5. [The LangGraph Pipeline (State Machine)](#5-the-langgraph-pipeline-state-machine)
   - [5.1 Pipeline State Definition](#51-pipeline-state-definition)
   - [5.2 Algorithmic Text Extraction](#52-algorithmic-text-extraction)
   - [5.3 Text Quality Scoring](#53-text-quality-scoring)
   - [5.4 Vision OCR Engine](#54-vision-ocr-engine)
   - [5.5 Structured LLM Extraction & Fallback Chain](#55-structured-llm-extraction--fallback-chain)
   - [5.6 Strict Pydantic Validation](#56-strict-pydantic-validation)
6. [Multi-Provider & Model Chain System](#6-multi-provider--model-chain-system)
7. [Authentication & Rate Limiting](#7-authentication--rate-limiting)
8. [API Reference & Schema Specification](#8-api-reference--schema-specification)
9. [Configuration & Environment Variables](#9-configuration--environment-variables)
10. [Local Development & Testing](#10-local-development--testing)

---

## 1. Overview & Philosophy

The **Resume Parser API** is a high-performance, stateless microservice built using **FastAPI**, **LangGraph**, and **Pydantic v2**. Its purpose is to ingest resumes in various document formats (`.pdf`, `.docx`, `.md`, `.txt`) and transform them into normalized, validated JSON.

### Core Philosophy: *"Cheapest Approach First, Escalate on Demand"*
Parsing resumes with LLMs and Vision APIs can quickly become prohibitively slow and expensive. This engine enforces an intelligent, multi-tier escalation pipeline:

1. **Native Text Extraction First:** Clean, digital PDFs and Word documents have their text extracted instantly in-memory using native parsers (`PyMuPDF` / `python-docx`) without incurring AI latency or cost.
2. **Conditional Vision OCR:** Visual inspection using vision LLMs is only triggered if the native text quality is insufficient (e.g., scanned images, flattened PDFs, low alphanumeric ratio) or if explicitly requested.
3. **Cascading Model Fallbacks:** Extracted text is parsed first using a fast, economical model (e.g., `gemini-flash-1.5`). The resulting JSON is strictly validated against a comprehensive Pydantic schema. If validation fails, the pipeline automatically escalates to a more capable reasoning model (e.g., `gpt-4o-mini`).

---

## 2. High-Level Architecture

The following diagram illustrates the complete processing journey of a file through the application:

```
  +-------------------------------------------------------------+
  |              HTTP Request (POST /api/v1/parse)              |
  |         (API Key Header + File Upload + Optional Options)   |
  +-------------------------------------------------------------+
                                │
                                ▼
  +─────────────────────────────────────────────────────────────+
  |                 Security & Request Validation               |
  |   • API Key Check (EnvAuthProvider)                         |
  |   • Rate Limiting (SlowAPI per-key bucket)                  |
  |   • File Validation (MIME type, extension, size limit)      |
  +─────────────────────────────────────────────────────────────+
                                │
                                ▼
  +─────────────────────────────────────────────────────────────+
  |                LangGraph State Machine Pipeline             |
  |                                                             |
  |  [ Step 1: extract_node ]                                   |
  |    Extract text algorithmically (PyMuPDF / python-docx)     |
  |                                                             |
  |  [ Step 2: check_ocr / route_ocr ]                          |
  |    Evaluate text quality:                                   |
  |    - char_count >= 50?                                      |
  |    - word_count >= 15?                                      |
  |    - alpha_ratio >= 0.5?                                    |
  |               │                                             |
  |        Sufficient / Skip               Insufficient / Force |
  |               │                                  │          |
  |               │                         [ Step 3: ocr_node ]|
  |               │                         Render PDF pages    |
  |               │                         to PNG (200 DPI),   |
  |               │                         call Vision LLM     |
  |               │                                  │          |
  |               │                    [ check_ocr_quality_node]|
  |               │                    Adopt OCR text if longer |
  |               │                                  │          |
  |               └─────────────────┬────────────────┘          |
  |                                 ▼                           |
  |  [ Step 4: parse_node ]                                     |
  |    Prompt LLM with structured schema constraints            |
  |                                                             |
  |  [ Step 5: check_parse / route_parse_result ]               |
  |    Validate JSON against Pydantic ResumeData schema         |
  |    • If Valid ──▶ Finish (END)                              |
  |    • If Invalid & More Models ──▶ Retry with next model     |
  |    • If Invalid & Chain Exhausted ──▶ Finish with Error     |
  +─────────────────────────────────────────────────────────────+
                                │
                                ▼
  +─────────────────────────────────────────────────────────────+
  |                     JSON API Response                       |
  |       • success: true / false                               |
  |       • data: Structured ResumeData (or null)               |
  |       • metadata: pages, extraction_method, token usage     |
  +─────────────────────────────────────────────────────────────+
```

---

## 3. Component Breakdown

The codebase is organized by domain in `src/`:

```
src/
├── main.py                  # Application entry point, lifespan, middleware registration
├── config.py                # Pydantic BaseSettings, model chain parsing, startup validation
├── health.py                # Health check router (/api/v1/health)
├── logging.py               # Structlog structured JSON/console logging setup
├── rate_limit.py            # SlowAPI rate limiter singleton instance
├── exceptions.py            # Custom HTTP domain exceptions (400, 413, etc.)
│
├── auth/                    # Authentication and authorization
│   ├── base.py              # BaseAuthProvider interface
│   ├── env.py               # EnvAuthProvider (validates keys against API_KEYS env var)
│   ├── factory.py           # Provider resolver (supports custom backends like DB/Redis)
│   └── dependencies.py      # FastAPI dependency (require_api_key)
│
├── parsing/                 # Parsing API layer
│   ├── router.py            # POST /api/v1/parse endpoint handler
│   ├── dependencies.py      # Upload validation (allowed MIME types, max file size)
│   └── schemas.py           # ParseOptions, ParseResponse, ParseMetadata, UsageEntry
│
├── pipeline/                # LangGraph pipeline orchestration
│   ├── state.py             # PipelineState (TypedDict holding data across nodes)
│   ├── graph.py             # LangGraph StateGraph builder, conditional routing functions
│   ├── nodes.py             # Node execution functions: extract, ocr, parse, quality checks
│   └── service.py           # run_pipeline wrapper entrypoint
│
├── extraction/              # Fast algorithmic text extraction
│   ├── base.py              # ExtractionResult dataclass, ExtractionError
│   ├── factory.py           # Content-type and extension router
│   ├── pdf.py               # PyMuPDF text and block extraction
│   ├── docx.py              # python-docx paragraph and table extraction
│   └── quality.py           # Text quality heuristics (character, word, and alpha ratios)
│
├── ocr/                     # Vision OCR subsystem
│   ├── imaging.py           # Converts PDF pages to PNG byte buffers via PyMuPDF (200 DPI)
│   ├── prompts.py           # Multimodal prompt builders (base64 image URLs)
│   └── service.py           # OCR execution via vision model
│
├── llm/                     # Structured JSON extraction & schema validation
│   ├── schemas.py           # Strict Pydantic v2 models (ResumeData, Experience, etc.)
│   ├── prompts.py           # System prompts containing JSON schema constraints
│   ├── validation.py        # Strips markdown fences, formats Pydantic error paths
│   └── service.py           # extract_resume_data calling provider & validating output
│
└── providers/               # LLM Provider abstraction
    ├── base.py              # BaseProvider interface (chat, extract_content, extract_usage)
    ├── exceptions.py        # ProviderError and network exception wrapping
    ├── factory.py           # Provider singleton cache and resolver
    └── openrouter.py        # OpenRouter HTTP implementation (httpx.AsyncClient)
```

---

## 4. Request Lifecycle & Data Flow

When a client makes a request to `POST /api/v1/parse`:

1. **Authentication Check (`src/auth/dependencies.py`):**
   - The `require_api_key` dependency retrieves the `X-API-Key` header.
   - The configured auth provider (default: `EnvAuthProvider`) validates the key against `API_KEYS`.
   - On failure, returns `401 Unauthorized`.

2. **Rate Limiting (`src/rate_limit.py`):**
   - `SlowAPI` checks the rate limit associated with the key identity (default: `60/minute`).
   - If exceeded, returns `429 Too Many Requests`.

3. **Upload & Options Validation (`src/parsing/dependencies.py`):**
   - `validate_upload` checks the file type against allowed MIME types (`application/pdf`, `.docx`, `text/markdown`, `text/plain`).
   - Reads the file stream to ensure size does not exceed `MAX_FILE_SIZE_MB` (default: 10 MB).
   - If options were supplied via the `options` form field, they are validated against `ParseOptions`.

4. **Pipeline Execution (`src/pipeline/service.py`):**
   - `run_pipeline` constructs the initial `PipelineState` and invokes the compiled LangGraph state machine.

5. **Response Packaging:**
   - Total latency is calculated and attached to `ParseMetadata.processing_time_ms`.
   - Returns a structured `ParseResponse`.

---

## 5. The LangGraph Pipeline (State Machine)

The pipeline is modeled as a compiled `StateGraph` in `src/pipeline/graph.py`.

### 5.1 Pipeline State Definition

The `PipelineState` TypedDict flows through every node and tracks all intermediate results:

```python
class PipelineState(TypedDict, total=False):
    # Inputs
    content: bytes
    content_type: str
    filename: str
    parse_chain: list[ModelRef]
    ocr_chain: list[ModelRef]
    ocr_preference: str  # "auto" | "force" | "skip"

    # Extraction Stage
    extraction_result: ExtractionResult
    text_quality: TextQuality
    text: str

    # OCR Stage
    ocr_attempted: bool
    ocr_text: str | None

    # Parse Stage
    parse_result: LLMExtractionResult | None
    resume_data: ResumeData | None

    # Telemetry & Flow Control
    usage: Annotated[list[UsageEntry], operator.add]
    current_parse_index: int
    current_ocr_index: int
    error: str | None
```

### 5.2 Algorithmic Text Extraction

The `extract_node` function routes based on MIME type or extension:
- **PDF (`src/extraction/pdf.py`):** Uses PyMuPDF (`fitz.open(stream=content)`). Iterates through pages and extracts text blocks, preserving page count.
- **DOCX (`src/extraction/docx.py`):** Uses `python-docx` (`docx.Document(io.BytesIO)`). Reads all body paragraphs and table cell contents.
- **TXT / MD (`src/extraction/factory.py`):** Decodes UTF-8 bytes directly with fallback character replacement.

### 5.3 Text Quality Scoring

In `src/extraction/quality.py`, `score_text_quality` evaluates whether the algorithmic extraction yielded usable text or if the document is likely a scanned image:

- `MIN_CHAR_COUNT = 50`: Must contain at least 50 characters.
- `MIN_WORD_COUNT = 15`: Must contain at least 15 whitespace-separated words.
- `MIN_ALPHA_RATIO = 0.5`: At least 50% of all characters must be alphabetic letters.

If any check fails, `quality.is_sufficient` is set to `False`.

### 5.4 Vision OCR Engine

When `route_ocr` determines that OCR is needed:
1. **Rasterization (`src/ocr/imaging.py`):** PyMuPDF renders each PDF page to an in-memory PNG pixmap at **200 DPI**:
   ```python
   pix = page.get_pixmap(dpi=200)
   images.append(pix.tobytes("png"))
   ```
2. **Vision Message Creation (`src/ocr/prompts.py`):** Converts each image into a base64 `data:image/png;base64,...` URL part in an OpenAI-compatible multimodal chat message.
3. **Model Fallback Loop (`src/pipeline/nodes.py`):** `ocr_node` attempts extraction with `ocr_chain[0]`. If a `ProviderError` occurs, it automatically advances to `ocr_chain[1]`.
4. **Safety Check (`check_ocr_quality_node`):** Compares `len(ocr_text)` with `len(algorithmic_text)`. The OCR text is only adopted if it yielded more text than native extraction.

### 5.5 Structured LLM Extraction & Fallback Chain

`parse_node` sends the text to the active parse model along with a prompt enforcing strict JSON output conforming to the `ResumeData` schema.

- The system prompt specifies extraction rules (e.g. how to represent dates as `YYYY-MM` or `YYYY`, splitting skills into categories, handling contact information).
- LLM response usage is converted into a `UsageEntry` (recording `step`, `model`, `input_tokens`, and `output_tokens`) and accumulated into `state["usage"]`.

### 5.6 Strict Pydantic Validation

In `src/llm/validation.py`:
1. **Fence Stripping:** Strips any surrounding ` ```json ... ``` ` markdown code blocks returned by the model.
2. **JSON Decoding:** Parses raw text into a Python dictionary via `json.loads`.
3. **Pydantic Validation:** Executes `ResumeData.model_validate(parsed)`.
4. **Conditional Routing (`route_parse_result`):**
   - **Success:** If validation succeeds, returns `"done"` and transitions to `END`.
   - **Retry:** If validation fails and further models remain in `parse_chain`, increments `current_parse_index` and routes back to `parse_node` using the next model.
   - **Failure:** If all models in the chain fail, returns `"fail"` and transitions to `END` with the detailed validation error log.

---

## 6. Multi-Provider & Model Chain System

Model chains decouple the pipeline from any single LLM vendor.

### Model Reference Format
Models are specified as `provider/model_name`:
```env
DEFAULT_PARSE_MODELS=openrouter/google/gemini-flash-1.5,openrouter/openai/gpt-4o-mini
DEFAULT_OCR_MODELS=openrouter/google/gemini-flash-1.5,openrouter/google/gemini-pro-vision
```

### Provider Architecture
- `src/config.py` converts strings into immutable `ModelRef(provider="...", model="...")` instances.
- `src/providers/factory.py` maintains cached singleton instances of providers implementing `BaseProvider`:
  - `chat(model, messages, **kwargs)`: Sends chat request.
  - `extract_content(response)`: Extracts text response from payload.
  - `extract_usage(response)`: Extracts `input_tokens` and `output_tokens`.

---

## 7. Authentication & Rate Limiting

### Authentication
- Abstracted by `BaseAuthProvider` in `src/auth/base.py`.
- **Default (`EnvAuthProvider`):** Validates the `X-API-Key` request header against comma-separated values in the `API_KEYS` environment variable.
- Custom auth providers (e.g., PostgreSQL, Redis, external OAuth) can be implemented and registered in `src/auth/factory.py` and activated using `AUTH_PROVIDER=custom`.

### Rate Limiting
- Configured using `slowapi` in `src/rate_limit.py`.
- Enforces per-key limits using standard rate-limit headers:
  ```
  X-RateLimit-Limit: 60
  X-RateLimit-Remaining: 59
  X-RateLimit-Reset: 1718000000
  ```

---

## 8. API Reference & Schema Specification

### Endpoints

#### `POST /api/v1/parse`
Extracts structured resume data from an uploaded file.

**Headers:**
- `X-API-Key: <your-api-key>` (Required)

**Form Data:**
- `file`: Resume file (`.pdf`, `.docx`, `.md`, `.txt`) — Required.
- `options`: Optional JSON string conforming to `ParseOptions`:
  ```json
  {
    "parse_models": "openrouter/google/gemini-flash-1.5,openrouter/openai/gpt-4o-mini",
    "ocr_models": "openrouter/google/gemini-flash-1.5",
    "ocr": "auto"
  }
  ```

**Success Response (`200 OK`):**
```json
{
  "success": true,
  "data": {
    "personal_info": {
      "name": "Jane Smith",
      "label": "Staff Backend Engineer",
      "email": "jane.smith@example.com",
      "phone": "+1-555-0199",
      "location": {
        "city": "San Francisco",
        "region": "CA",
        "country": "United States"
      },
      "urls": [
        { "type": "linkedin", "url": "https://linkedin.com/in/janesmith" }
      ]
    },
    "experience": [
      {
        "type": "full-time",
        "company": "Tech Solutions",
        "title": "Senior Software Engineer",
        "start_date": "2021-03",
        "end_date": null,
        "current": true,
        "highlights": [
          "Scaled API throughput by 400%",
          "Architected real-time streaming pipeline"
        ]
      }
    ],
    "education": [
      {
        "institution": "University of California, Berkeley",
        "study_type": "Bachelor of Science",
        "area": "Computer Science",
        "start_date": "2015-08",
        "end_date": "2019-05"
      }
    ],
    "skills": [
      { "name": "Python", "category": "Languages" },
      { "name": "FastAPI", "category": "Frameworks" }
    ],
    "projects": [],
    "certifications": [],
    "publications": [],
    "languages": [],
    "volunteer": [],
    "awards": [],
    "interests": [],
    "references": [],
    "custom_sections": []
  },
  "metadata": {
    "extraction_method": "algorithmic",
    "ocr_used": false,
    "pages": 2,
    "processing_time_ms": 1820,
    "usage": [
      {
        "step": "parse",
        "model": "google/gemini-flash-1.5",
        "input_tokens": 1420,
        "output_tokens": 760
      }
    ]
  },
  "error": null
}
```

#### `GET /api/v1/health`
Health check endpoint returning `{"status": "ok"}`.

---

## 9. Configuration & Environment Variables

All settings are managed via `pydantic-settings` in `src/config.py`:

| Variable | Default | Description |
|---|---|---|
| `ENVIRONMENT` | `local` | `local`, `staging`, or `production`. |
| `SHOW_DOCS_ENVIRONMENTS` | `local,staging` | Comma-separated list of environments where `/docs` is exposed. |
| `AUTH_PROVIDER` | `env` | Name of auth provider (`env` by default). |
| `API_KEYS` | `""` | Comma-separated list of valid API keys. |
| `RATE_LIMIT` | `60/minute` | Rate limit per API key. |
| `OPENROUTER_API_KEY` | `""` | API key for OpenRouter provider. |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | Base URL for OpenRouter API. |
| `DEFAULT_PARSE_MODELS` | `openrouter/google/gemini-flash-1.5,openrouter/openai/gpt-4o-mini` | Ordered fallback chain for structured JSON parsing. |
| `DEFAULT_OCR_MODELS` | `openrouter/google/gemini-flash-1.5,openrouter/google/gemini-pro-vision` | Ordered fallback chain for vision OCR (`none` to disable). |
| `MAX_FILE_SIZE_MB` | `10` | Maximum upload file size in megabytes. |
| `REQUEST_TIMEOUT_SECONDS`| `60` | Request timeout limit in seconds. |
| `LOG_LEVEL` | `info` | Logging verbosity (`debug`, `info`, `warning`, `error`). |

---

## 10. Local Development & Testing

### Installation & Execution
```bash
# Install dependencies using uv
uv sync --all-extras

# Copy environment template
cp .env.example .env

# Run development server with live reload
uv run uvicorn src.main:app --reload --port 8000
```

### Running the Test Suite
The repository includes unit, integration, and end-to-end tests:

```bash
# Run unit and integration tests (e2e skipped by default)
uv run pytest tests/ -v

# Run unit tests only
uv run pytest tests/unit/ -v

# Run integration tests only (uses AsyncClient and dependency overrides)
uv run pytest tests/integration/ -v

# Run test coverage
uv run pytest --cov=src tests/

# Run code style and linting
uv run ruff check src/
uv run ruff format src/

# Run strict type checking
uv run mypy src/
```
