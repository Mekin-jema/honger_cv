"""End-to-end parse test: real server, real LLM calls, configurable file & models.

Uploads a resume, parses it via the API, validates the response structure,
and saves the full JSON response to fixtures/output/<timestamp>/.

CLI options (via pytest):
  --file          Path to resume file (default: fixtures/senior-backend-developer.pdf)
  --parse-model   Parse model (default: server-configured)
  --ocr-model     OCR model, "none" to skip (default: none)

Requirements:
  - .env with a valid OPENROUTER_API_KEY
  - .env API_KEYS containing the key used below
  - Network access to https://openrouter.ai

Run:
  uv run pytest tests/e2e/ -m e2e -v -s
  uv run pytest tests/e2e/ -m e2e -v -s --parse-model "openrouter/..."
"""

from __future__ import annotations

import json
import mimetypes
import subprocess
from pathlib import Path

import httpx
import pytest

SERVER_PORT = 9876
BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"

API_KEY = "sk-parse-dev-key-1"
HEADERS = {"X-API-Key": API_KEY}

REQUEST_TIMEOUT = 180


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _save_result(results_dir: Path, name: str, data: dict) -> Path:
    out = results_dir / f"{name}.json"
    out.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    return out


def _model_tag(model: str | None) -> str:
    """Extract a short tag from a model string for file naming."""
    if not model:
        return "default"
    return model.rsplit("/", 1)[-1]


def _check_server_health() -> None:
    resp = httpx.get(f"{BASE_URL}/api/v1/health", timeout=10)
    assert resp.status_code == 200, f"Server health check failed: {resp.status_code}"


# ---------------------------------------------------------------------------
# Test
# ---------------------------------------------------------------------------


@pytest.mark.e2e
def test_parse(
    server: subprocess.Popen,
    results_dir: Path,
    resume_file: Path,
    parse_model: str | None,
    ocr_model: str,
) -> None:
    """Upload a resume and validate the parsed response."""
    _check_server_health()

    options: dict[str, str] = {}
    if parse_model:
        options["parse_models"] = parse_model

    if ocr_model.lower() == "none":
        options["ocr_models"] = "none"
        options["ocr"] = "skip"
    else:
        options["ocr_models"] = ocr_model
        options["ocr"] = "force"

    mime_type = mimetypes.guess_type(str(resume_file))[0] or "application/octet-stream"

    with open(resume_file, "rb") as f:
        resp = httpx.post(
            f"{BASE_URL}/api/v1/parse",
            headers=HEADERS,
            files={"file": (resume_file.name, f, mime_type)},
            data={"options": json.dumps(options)},
            timeout=REQUEST_TIMEOUT,
        )

    assert resp.status_code == 200, f"HTTP {resp.status_code}: {resp.text}"
    data = resp.json()

    assert data["success"] is True, f"Parse failed: {data.get('error')}"
    assert data["error"] is None
    assert data["data"] is not None
    assert data["data"]["personal_info"] is not None
    assert data["metadata"]["processing_time_ms"] > 0
    assert data["metadata"]["pages"] >= 1

    if ocr_model.lower() != "none":
        usage_steps = [u["step"] for u in data["metadata"]["usage"]]
        assert "ocr" in usage_steps, f"Expected OCR step in usage, got {usage_steps}"

    tag = f"{resume_file.stem}_{_model_tag(parse_model)}"
    if ocr_model.lower() != "none":
        tag += f"_ocr_{_model_tag(ocr_model)}"

    out = _save_result(results_dir, tag, data)
    print(f"\n  Result saved: {out}")
