"""Fixtures for end-to-end tests that start a real API server subprocess.

CLI options (passed via ``pytest --option``):
  --file          Path to resume file (default: fixtures/senior-backend-developer.pdf)
  --parse-model   Parse model identifier (default: server-configured)
  --ocr-model     OCR model identifier, "none" to skip (default: none)
"""

from __future__ import annotations

import subprocess
import sys
import time
from collections.abc import Generator
from datetime import UTC, datetime
from pathlib import Path

import httpx
import pytest

SERVER_PORT = 9876
BASE_URL = f"http://127.0.0.1:{SERVER_PORT}"
PROJECT_ROOT = Path(__file__).resolve().parents[2]
E2E_DIR = Path(__file__).resolve().parent

STARTUP_TIMEOUT_S = 30
SHUTDOWN_TIMEOUT_S = 10


# ---------------------------------------------------------------------------
# CLI options
# ---------------------------------------------------------------------------


def pytest_addoption(parser: pytest.Parser) -> None:
    parser.addoption(
        "--file",
        default=None,
        help="Path to resume file (default: fixtures/senior-backend-developer.pdf)",
    )
    parser.addoption(
        "--parse-model",
        default=None,
        help=(
            "Parse model, e.g. openrouter/google/gemini-2.5-flash "
            "(default: server-configured)"
        ),
    )
    parser.addoption(
        "--ocr-model",
        default="none",
        help='OCR model, "none" to skip (default: none)',
    )


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture(scope="module")
def resume_file(request: pytest.FixtureRequest) -> Path:
    raw = request.config.getoption("--file")
    if raw:
        p = Path(raw).resolve()
        assert p.is_file(), f"Resume file not found: {p}"
        return p
    return E2E_DIR / "fixtures" / "senior-backend-developer.pdf"


@pytest.fixture(scope="module")
def parse_model(request: pytest.FixtureRequest) -> str | None:
    return request.config.getoption("--parse-model")


@pytest.fixture(scope="module")
def ocr_model(request: pytest.FixtureRequest) -> str:
    return request.config.getoption("--ocr-model")


@pytest.fixture(scope="module")
def results_dir() -> Path:
    """Timestamped directory inside fixtures/output for this test run's results."""
    stamp = datetime.now(tz=UTC).strftime("%Y-%m-%d_%H-%M-%S")
    d = E2E_DIR / "fixtures" / "output" / stamp
    d.mkdir(parents=True, exist_ok=True)
    print(f"\n  E2E results directory: {d}")
    return d


@pytest.fixture(scope="module")
def server(results_dir: Path) -> Generator[subprocess.Popen[bytes], None, None]:
    """Start uvicorn in a subprocess and wait until the health endpoint responds.

    Server stdout/stderr is streamed to ``run.log`` inside the results directory.
    """
    log_path = results_dir / "run.log"
    log_file = open(log_path, "wb")  # noqa: SIM115
    print(f"  Server log: {log_path}")

    proc = subprocess.Popen(
        [
            sys.executable,
            "-m",
            "uvicorn",
            "src.main:app",
            "--host",
            "127.0.0.1",
            "--port",
            str(SERVER_PORT),
        ],
        cwd=str(PROJECT_ROOT),
        stdout=log_file,
        stderr=subprocess.STDOUT,
    )

    deadline = time.monotonic() + STARTUP_TIMEOUT_S
    while time.monotonic() < deadline:
        try:
            r = httpx.get(f"{BASE_URL}/api/v1/health", timeout=2)
            if r.status_code == 200:
                break
        except (httpx.ConnectError, httpx.ReadError):
            pass

        if proc.poll() is not None:
            log_file.close()
            log_content = log_path.read_text(encoding="utf-8", errors="replace")
            pytest.fail(
                f"Server process exited early (code {proc.returncode}).\n{log_content}"
            )

        time.sleep(0.5)
    else:
        proc.kill()
        log_file.close()
        log_content = log_path.read_text(encoding="utf-8", errors="replace")
        pytest.fail(
            f"Server did not become healthy within {STARTUP_TIMEOUT_S}s.\n{log_content}"
        )

    yield proc

    proc.terminate()
    try:
        proc.wait(timeout=SHUTDOWN_TIMEOUT_S)
    except subprocess.TimeoutExpired:
        proc.kill()
        proc.wait(timeout=5)
    finally:
        log_file.close()
