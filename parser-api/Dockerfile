# syntax=docker/dockerfile:1
# Multi-stage build: builder installs deps with uv, runtime is minimal.
# Base: Docker Official Image (python:3.12-slim). For reproducible builds,
# pin with digest: FROM python:3.12-slim@sha256:<digest>

# Stage 1: Build dependencies
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv (Astral-sponsored OSS; single binary, no system deps)
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files first to leverage build cache
COPY pyproject.toml uv.lock ./

# Install production dependencies only
RUN uv sync --frozen --no-dev --no-install-project

# Copy application source
COPY src/ src/

# Install the project itself
RUN uv sync --frozen --no-dev

# Stage 2: Runtime (minimal image, no build tools)
FROM python:3.12-slim AS runtime

WORKDIR /app

# OCI / Open Containers image metadata (single LABEL to reduce layers)
ARG VERSION=0.1.0
LABEL org.opencontainers.image.title="Resume Parser API" \
      org.opencontainers.image.description="Open-source resume parsing engine with FastAPI and LangGraph" \
      org.opencontainers.image.version="${VERSION}" \
      org.opencontainers.image.licenses="AGPL-3.0-or-later"
# Override version at build: docker build --build-arg VERSION=1.0.0 .

# Non-root user for least privilege
RUN groupadd --system app && useradd --system --gid app app

# Copy the virtual environment and app from builder
COPY --from=builder /app/.venv /app/.venv
COPY --from=builder /app/src /app/src
COPY --from=builder /app/pyproject.toml /app/pyproject.toml

ENV PATH="/app/.venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD ["python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/api/v1/health')"]

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
