# Resume Parser API

An open-source resume parsing engine built with **FastAPI**, **LangGraph**, and **Pydantic**. Upload a resume as PDF, DOCX, MD, or TXT and get back clean, structured JSON — powered by a smart extraction pipeline that tries the cheapest approach first and escalates only when needed.

Built as a stateless microservice. No database, no billing — just parsing. Designed to be called from any backend.

## Tech Stack

| Layer | Technology |
| --- | --- |
| **API Framework** | FastAPI, Uvicorn, async/await |
| **API Protection** | API key auth (pluggable backend), SlowAPI rate limiting |
| **Pipeline Orchestration** | LangGraph (conditional state machine) |
| **Structured Output** | Pydantic v2 (schema definition, LLM output validation) |
| **Text Extraction** | PyMuPDF (PDF), python-docx (DOCX) |
| **OCR** | LLM vision models via provider API |
| **LLM Integration** | OpenRouter (default), pluggable provider interface |
| **Prompt Engineering** | Structured extraction prompts with JSON schema constraints |
| **Testing** | pytest, pytest-asyncio, HTTPX async test client |
| **Code Quality** | Ruff (linting + formatting), mypy (type checking) |
| **Containerization** | Docker |

## How It Works

```
  Upload file (PDF, DOCX, MD, or TXT)
         │
         ▼
  ┌──────────────┐
  │  Algorithmic  │ ── extract text without AI
  │  Extraction   │
  └──────┬───────┘
         │
    Text OK? ──no──▶ OCR via base vision model
         │                    │
        yes                   │
         │◀───────────────────┘
         ▼
  ┌──────────────┐
  │  Base Model   │ ── extract structured JSON
  │  Extraction   │
  └──────┬───────┘
         │
   Valid JSON? ──no──▶ Advanced model retry
         │                    │
        yes                   │
         │◀───────────────────┘
         ▼
  Return result + usage report
```

The philosophy: **don't spend money when you don't have to.** A clean PDF with selectable text never touches an OCR model. A well-formatted resume parsed by a cheap model doesn't need a premium one.

## Quick Start

### Prerequisites

- Python 3.12+
- [uv](https://docs.astral.sh/uv/) (Python package manager)
- An API key from [OpenRouter](https://openrouter.ai/) or another supported LLM provider

### Installation

```bash
git clone https://github.com/yourorg/resume-parser-api.git
cd resume-parser-api
uv sync
```


### Configuration

```bash
cp .env.example .env
```

```env
# API Protection
AUTH_PROVIDER=env                    # "env" (default) or implement your own (e.g. "database")
API_KEYS=sk-parse-abc123,sk-parse-def456
RATE_LIMIT=60/minute                 # Per-key rate limit

# Provider credentials (only configure providers you reference in model chains)
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Model chains — ordered left to right, provider prefix required
# Format: provider/model_name (comma-separated for fallback chain)
# OCR accepts "none" to disable OCR entirely
DEFAULT_OCR_MODELS=openrouter/google/gemini-flash-1.5,openrouter/google/gemini-pro-vision
DEFAULT_PARSE_MODELS=openrouter/google/gemini-flash-1.5,openrouter/openai/gpt-4o-mini

# Limits
MAX_FILE_SIZE_MB=10
REQUEST_TIMEOUT_SECONDS=60
LOG_LEVEL=info
```

**Model chains** define the escalation order. The pipeline tries models left to right — if the first model's output fails validation, the next model in the chain is tried. Each entry includes a provider prefix (`openrouter/`, `anthropic/`, `openai/`) so different models in the same chain can use different providers.

Set `DEFAULT_OCR_MODELS=none` to disable OCR entirely (useful when inputs are always clean PDFs with selectable text).

All default chains can be overridden per request via the API payload.

### Run

From the project root:

```bash
uv run uvicorn src.main:app --reload
```

Docs at `http://localhost:8000/docs`.

To verify the setup, run the test suite from the project root: `uv run pytest tests/ -v`.

## Usage

```bash
curl -X POST http://localhost:8000/api/v1/parse \
  -H "X-API-Key: sk-parse-abc123" \
  -F "file=@resume.pdf"
```

With model chain overrides:

```bash
curl -X POST http://localhost:8000/api/v1/parse \
  -H "X-API-Key: sk-parse-abc123" \
  -F "file=@resume.pdf" \
  -F 'options={"parse_models": "openrouter/google/gemini-flash-1.5,openrouter/openai/gpt-4o-mini", "ocr_models": "openrouter/google/gemini-flash-1.5"}'
```

Skip OCR for a single request (`ocr_models: "none"`) or force/skip OCR (`ocr: "force"` or `"skip"`):

```bash
curl -X POST http://localhost:8000/api/v1/parse \
  -H "X-API-Key: sk-parse-abc123" \
  -F "file=@resume.pdf" \
  -F 'options={"ocr_models": "none"}'
# Or: options={"ocr": "skip"} to never run OCR; ocr: "force" to always run it.
```

Response:

```json
{
  "success": true,
  "data": {
    "personal_info": { "name": "Jane Smith", "email": "jane@example.com" },
    "experience": [],
    "education": [],
    "skills": []
  },
  "metadata": {
    "extraction_method": "algorithmic",
    "ocr_used": false,
    "pages": 2,
    "processing_time_ms": 2340,
    "usage": [
      {
        "step": "parse",
        "model": "google/gemini-flash-1.5",
        "input_tokens": 1820,
        "output_tokens": 940
      }
    ]
  }
}
```

The full output schema is defined as Pydantic models in [`src/llm/schemas.py`](src/llm/schemas.py). LLM responses are validated against these models — if validation fails, the pipeline escalates to a more capable model.

## Project Structure

```
src/
├── main.py                  # App entrypoint
├── config.py                # Global settings
├── health.py                # Health check endpoint
├── logging.py               # Structlog setup
├── rate_limit.py            # SlowAPI limiter instance
├── exceptions.py            # HTTP exception classes
├── auth/                    # API key auth and rate limiting
│   ├── base.py              # Abstract auth provider interface
│   ├── env.py               # Default: validate keys from env vars
│   ├── dependencies.py      # FastAPI dependencies (key check, rate limit)
│   └── factory.py           # Auth provider factory
├── parsing/                 # Parse endpoint and orchestration
│   ├── router.py            # POST /api/v1/parse
│   ├── dependencies.py      # File validation
│   └── schemas.py           # ParseOptions, ParseResponse, etc.
├── extraction/              # Algorithmic text extraction
│   ├── base.py              # ExtractionResult, ExtractionError
│   ├── pdf.py               # PDF via PyMuPDF
│   ├── docx.py              # DOCX via python-docx
│   ├── quality.py           # Text quality scoring (triggers OCR when low)
│   └── factory.py           # Dispatcher by content type / extension
├── ocr/                     # OCR via vision models
│   ├── service.py           # OCR pipeline (PDF→images, vision API)
│   ├── prompts.py           # OCR prompt and message building
│   └── imaging.py           # PDF pages → PNG images (PyMuPDF)
├── llm/                     # LLM structured extraction
│   ├── service.py           # Extract resume JSON with fallback chain
│   ├── schemas.py           # Pydantic models for resume data
│   ├── prompts.py           # Extraction prompts and JSON schema
│   └── validation.py        # LLM output validation helpers
├── pipeline/                # LangGraph pipeline
│   ├── graph.py             # Graph definition and conditional edges
│   ├── nodes.py             # extract, ocr, parse nodes
│   ├── state.py             # PipelineState typings
│   └── service.py           # run_pipeline entrypoint
├── providers/               # LLM provider abstraction
│   ├── base.py              # Abstract provider interface
│   ├── openrouter.py        # OpenRouter implementation
│   ├── exceptions.py        # ProviderError and retry handling
│   └── factory.py           # Provider factory (resolves by ModelRef.provider)
```

**Tests**

```
tests/
├── conftest.py              # Shared fixtures (client, auth override, sample files)
├── unit/                    # Pure logic tests — no FastAPI app, no AsyncClient
│   ├── test_config.py
│   ├── test_extraction/     # PDF, DOCX, factory, quality
│   ├── test_llm/            # service, schemas, prompts, validation
│   ├── test_ocr/            # service, prompts, imaging
│   ├── test_pipeline/       # graph, nodes, routing
│   └── test_providers/      # factory, openrouter
├── integration/             # Full app via AsyncClient; external deps mocked via DI
│   ├── conftest.py          # Integration-specific fixtures (root conftest inherited)
│   ├── test_health.py
│   ├── test_auth.py
│   ├── test_parse.py
│   └── test_rate_limiting.py
└── e2e/                     # Real external services; skipped by default (marker: e2e)
    ├── conftest.py          # Server lifecycle fixture (starts/stops uvicorn subprocess)
    ├── test_parse_e2e.py    # Parse tests against real OpenRouter models
    └── fixtures/            # Sample resume files used by e2e tests
        ├── senior-backend-developer.pdf
        └── senior-backend-developer.png
```

Run all tests: `uv run pytest tests/ -v`. E2E tests are excluded by default (marked with `@pytest.mark.e2e`).

 Run only integration: `uv run pytest tests/integration/ -v`. 
 
 Run only e2e tests, use `uv run pytest tests/e2e/ -m e2e -v -s`.

## API Protection

All endpoints require a valid API key in the `X-API-Key` header. Authentication is abstracted behind a provider interface — the default implementation validates keys from environment variables, but you can implement a database-backed provider for production use.

| Provider | Backend | Use case |
| --- | --- | --- |
| `env` (default) | `API_KEYS` env var | Development, single-service deployments |
| Custom | Database, Redis, external service | Multi-tenant SaaS, dynamic key management |

To implement a custom provider, extend the base auth interface and register it in the factory. Switch providers via the `AUTH_PROVIDER` environment variable.

Rate limiting is applied per API key via SlowAPI. Responses include standard rate limit headers:

```
X-RateLimit-Limit: 60
X-RateLimit-Remaining: 58
X-RateLimit-Reset: 1708300800
```

## Provider Abstraction

The API is not locked to any single LLM vendor. All model calls go through an abstract provider interface. Each model chain entry includes a provider prefix (e.g. `openrouter/`, `anthropic/`, `openai/`), so different models in the same chain can use different providers. OpenRouter ships as the default — to add a new provider (direct OpenAI, Anthropic, Azure, etc.), implement the `BaseProvider` interface in `src/providers/` and register it in the factory. Only providers referenced in your model chains need credentials configured.

```env
# Mix providers in a single chain
DEFAULT_PARSE_MODELS=openrouter/google/gemini-flash-1.5,anthropic/claude-haiku
```

## Usage Reporting

Every response includes a `usage` array in metadata, reporting the raw consumption for each model call made during the pipeline:

```json
"usage": [
  { "step": "ocr", "model": "google/gemini-flash-1.5", "input_tokens": 3200, "output_tokens": 1500 },
  { "step": "parse", "model": "openai/gpt-4o-mini", "input_tokens": 2100, "output_tokens": 860 }
]
```

The response also includes `pages` (number of document pages) and `ocr_used` (whether OCR was triggered). The calling service can use these raw metrics to calculate credits, costs, or billing however it sees fit — this API does not impose a pricing model.

## Development

Install dev dependencies: `uv sync --all-extras`

**Tests**

| Command | What runs |
| --- | --- |
| `uv run pytest tests/` | Unit + integration (e2e excluded by default) |
| `uv run pytest tests/integration/` | Integration only (FastAPI app, mocked deps) |
| `uv run pytest tests/unit/` | Unit only (pure logic, no app) |
| `uv run pytest tests/e2e/ -m e2e -s` | E2e only (real server + OpenRouter, costs money) |

Root `tests/conftest.py` provides shared fixtures (AsyncClient, auth stub, sample PDF). Integration tests use the full app with DI overrides; e2e tests hit real APIs and are marked with `@pytest.mark.e2e`.

**End-to-end tests**

E2e tests start a real uvicorn server as a subprocess, upload a resume, call the OpenRouter API with real models, and validate the parsed output. They require a configured `.env` with a valid `OPENROUTER_API_KEY` and at least one entry in `API_KEYS`.

| Option | Description | Default |
| --- | --- | --- |
| `--file` | Path to resume file | `fixtures/senior-backend-developer.pdf` |
| `--parse-model` | Parse model identifier | Server-configured default |
| `--ocr-model` | OCR model identifier (`"none"` to skip) | `none` (OCR skipped) |

```bash
# Default: built-in PDF, server-configured models, no OCR
uv run pytest tests/e2e/ -m e2e -v -s

# Gemini 2.5 Flash
uv run pytest tests/e2e/ -m e2e -v -s --parse-model "openrouter/google/gemini-2.5-flash"

# Grok 4.1 Fast
uv run pytest tests/e2e/ -m e2e -v -s --parse-model "openrouter/x-ai/grok-4.1-fast"

# Gemini with forced OCR
uv run pytest tests/e2e/ -m e2e -v -s \
  --parse-model "openrouter/google/gemini-2.5-flash" \
  --ocr-model "openrouter/google/gemini-2.5-flash"

# Custom resume file
uv run pytest tests/e2e/ -m e2e -v -s --file path/to/resume.pdf
```

Each run creates a timestamped results directory under `tests/e2e/fixtures/output/` containing:
- A JSON file with the full parsed response (named after the file and model)
- `run.log` with the complete server console output (structlog + uvicorn access logs)

```bash
uv run pytest tests/ -v              # Tests
uv run pytest --cov=src tests/       # Coverage
uv run ruff check --fix src/         # Lint
uv run ruff format src/              # Format
uv run mypy src/                     # Type checking
```

Pytest, Ruff, and mypy are configured in `pyproject.toml`; run commands from the project root.

**Docker**

Pre-built images are published to GitHub Container Registry (GHCR). 

```bash
# Latest stable release
docker pull ghcr.io/theresumeparser/resume-parser-api:latest
docker run --rm -p 8000:8000 --env-file .env ghcr.io/theresumeparser/resume-parser-api:latest

# Specific version
docker pull ghcr.io/theresumeparser/resume-parser-api:0.1.0

# Bleeding edge (latest main branch build)
docker pull ghcr.io/theresumeparser/resume-parser-api:main
```

Build locally (use `--pull` for latest base image; pass `--build-arg VERSION=x.y.z` to set image metadata):

```bash
docker build -t resume-parser-api .
# Optional: reproducible builds with a fresh base
# docker build --pull -t resume-parser-api .
docker run --rm -p 8000:8000 --env-file .env resume-parser-api
```

Local development with live reload (mounts `./src`, uses `.env`):

```bash
docker compose up
```

Verify: `curl http://localhost:8000/api/v1/health` should return `{"status":"ok"}`. The image includes a `HEALTHCHECK` and OCI labels (title, description, version, license) for orchestration and registries.

## Design Decisions

**Pydantic for LLM output validation** — LLM responses are unpredictable. Every extraction result is validated against strict Pydantic v2 models before being returned. Failed validation is what triggers the fallback to a more capable model — not guesswork.

**Synchronous HTTP** — The full pipeline takes 2–20 seconds, well within timeout limits. FastAPI handles concurrent requests naturally since LLM calls are I/O-bound.

**Provider abstraction** — Start with OpenRouter for convenience (one key, many models), swap to direct APIs when you need lower latency or specific features.

**LangGraph** — The pipeline is a conditional graph with branching on quality checks and validation. LangGraph makes this explicit, testable, and easy to extend.

**Stateless by default** — No database. API keys validated from env vars, rate limits in memory. Swap in a database-backed auth provider when you need dynamic key management. Billing belongs in the calling application.

## Roadmap

- **Direct image upload** — Accept PNG/JPEG uploads and run OCR-only (no algorithmic extraction).
- **More LLM providers** — Implement `BaseProvider` for direct OpenAI, Anthropic, and Azure; document in README.
- **Database-backed auth** — Optional auth provider that validates API keys and rate limits from a database (e.g. PostgreSQL).
- **Async / webhook mode** — reporting progress to the caller.
- **Output variants** — Alternative schemas (e.g. ATS-focused, minimal) or configurable fields via options.
- **Observability** — OpenTelemetry tracing and/or Prometheus metrics for pipeline steps and latency.

## Contributing

Contributions are welcome. Please open an issue before submitting a PR for any significant change.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Open a Pull Request

## License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPL-3.0)**.

You are free to use, modify, and distribute this software. If you run a modified version as a network service, you must make your source code available under the same license. See [LICENSE](LICENSE) for full terms.