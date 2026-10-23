# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

- Nothing yet.

## [0.1.0] - 2025-02-20

Initial release. Stateless resume parsing API with FastAPI, LangGraph, and Pydantic.

### Added

- **API**
  - `POST /api/v1/parse` — upload PDF, DOCX, or image; returns structured JSON (personal info, experience, education, skills).
  - Health check: `GET /api/v1/health`.
  - OpenAPI docs at `/docs`.

- **Authentication & limits**
  - API key auth with pluggable provider (default: keys from env).
  - Per-key rate limiting via SlowAPI (configurable, e.g. `60/minute`).

- **Pipeline**
  - Algorithmic text extraction for PDF (PyMuPDF) and DOCX (python-docx).
  - Text quality scoring; OCR via LLM vision models when text is missing or low quality.
  - LLM-based structured extraction with Pydantic v2 schema validation.
  - LangGraph pipeline with fallback: try cheaper model first, escalate on validation failure.
  - Usage reporting: per-model token counts and page count in response metadata.

- **Providers**
  - OpenRouter as default LLM provider (one key, many models).
  - Provider abstraction for adding direct OpenAI, Anthropic, etc.

- **Operations**
  - Docker image (multi-stage, Python 3.12-slim) with HEALTHCHECK and OCI labels.
  - Docker Compose for local dev with live reload.
  - CI workflow: lint (Ruff), typecheck (mypy), tests (pytest, non-E2E), Docker build on every PR and push to `main`.
  - Release workflow: on tag `v*`, run CI then build and push image to GHCR with tags `x.y.z`, `x.y`, `latest`.
  - Image `main` tag pushed to GHCR on every successful push to `main`.

- **Development**
  - Structured logging (structlog).
  - Strict mypy and Ruff lint/format.
  - Unit, integration, and E2E test layout (E2E excluded from CI).

### Technical

- Python 3.12+, [uv](https://docs.astral.sh/uv/) for dependency management.
- No database; API keys and rate limits from configuration / in-memory.

[Unreleased]: https://github.com/yourorg/resume-parser-api/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourorg/resume-parser-api/releases/tag/v0.1.0
