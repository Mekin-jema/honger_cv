import contextlib
import io
from collections.abc import AsyncGenerator, Generator

import pytest
from httpx import ASGITransport, AsyncClient

from src.auth.base import BaseAuthProvider
from src.auth.factory import reset_auth_provider
from src.main import app

TEST_API_KEY = "sk-parse-test-key"
TEST_API_KEY_2 = "sk-parse-test-key-2"
INVALID_API_KEY = "sk-parse-invalid"

# Identity strings for rate-limit tests (per-key limits).
STUB_IDENTITY = "test-identity"
STUB_IDENTITY_2 = "test-identity-2"


class StubAuthProvider(BaseAuthProvider):
    """Auth provider for tests — accepts TEST_API_KEY and TEST_API_KEY_2."""

    async def validate_key(self, api_key: str) -> bool:
        return api_key in (TEST_API_KEY, TEST_API_KEY_2)

    async def get_key_identity(self, api_key: str) -> str:
        if api_key == TEST_API_KEY:
            return STUB_IDENTITY
        if api_key == TEST_API_KEY_2:
            return STUB_IDENTITY_2
        return "unknown"


@pytest.fixture(autouse=True)
def _override_auth(monkeypatch: pytest.MonkeyPatch) -> Generator[None, None, None]:
    """Replace auth provider with a test stub for all tests."""
    reset_auth_provider()
    _stub = StubAuthProvider()
    monkeypatch.setattr(
        "src.auth.factory._instance",
        _stub,
    )
    yield
    reset_auth_provider()


@pytest.fixture(autouse=True)
def _reset_rate_limiter() -> Generator[None, None, None]:
    """Reset rate limiter storage before each test for isolation."""
    yield
    limiter_instance = getattr(app.state, "limiter", None)
    if limiter_instance is not None and hasattr(limiter_instance, "reset"):
        with contextlib.suppress(NotImplementedError, Exception):
            limiter_instance.reset()


@pytest.fixture
async def client() -> AsyncGenerator[AsyncClient, None]:
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"X-API-Key": TEST_API_KEY}


@pytest.fixture
def auth_headers_key2() -> dict[str, str]:
    """Headers for second test API key (rate-limit tests)."""
    return {"X-API-Key": TEST_API_KEY_2}


@pytest.fixture
def invalid_auth_headers() -> dict[str, str]:
    return {"X-API-Key": INVALID_API_KEY}


@pytest.fixture
def sample_pdf_bytes() -> bytes:
    """Minimal valid PDF with selectable text, created via PyMuPDF."""
    import fitz

    doc = fitz.open()
    page = doc.new_page()
    page.insert_text(
        (72, 72),
        "John Doe\nSoftware Engineer\n"
        "Experienced developer with skills in Python, FastAPI, and Docker.\n"
        "Education: B.S. Computer Science",
    )
    data = doc.tobytes()
    doc.close()
    return data


@pytest.fixture
def sample_pdf_file(sample_pdf_bytes: bytes) -> tuple[str, io.BytesIO, str]:
    """Returns (filename, file-like, content_type) tuple for upload."""
    return ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")
