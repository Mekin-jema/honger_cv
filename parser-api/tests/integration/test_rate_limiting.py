import io
from unittest.mock import AsyncMock, patch

import pytest
from httpx import AsyncClient

from src.llm.schemas import PersonalInfo, ResumeData
from src.parsing.schemas import ParseMetadata
from src.pipeline.service import PipelineResult


def _stub_pipeline_result() -> PipelineResult:
    return PipelineResult(
        success=True,
        data=ResumeData(personal_info=PersonalInfo(name="Test")),
        metadata=ParseMetadata(
            extraction_method="algorithmic",
            ocr_used=False,
            pages=1,
            processing_time_ms=0,
            usage=[],
        ),
        error=None,
    )


@pytest.fixture(autouse=True)
def rate_limit_3_per_minute(monkeypatch: pytest.MonkeyPatch) -> None:
    """Override RATE_LIMIT to 3/minute for rate-limit tests only; restore after."""
    import src.config

    original = src.config.settings.RATE_LIMIT
    monkeypatch.setattr(src.config.settings, "RATE_LIMIT", "3/minute")
    yield
    monkeypatch.setattr(src.config.settings, "RATE_LIMIT", original)


@pytest.fixture(autouse=True)
def _mock_pipeline():
    """Mock the pipeline so parse requests succeed without real API calls."""
    with patch(
        "src.parsing.router.run_pipeline",
        new_callable=AsyncMock,
        return_value=_stub_pipeline_result(),
    ):
        yield


async def test_rate_limit_headers_present(
    client: AsyncClient,
    auth_headers: dict[str, str],
    sample_pdf_bytes: bytes,
) -> None:
    """A single valid request returns 200 with X-RateLimit-* headers."""
    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
    )
    assert response.status_code == 200
    assert "X-RateLimit-Limit" in response.headers
    assert "X-RateLimit-Remaining" in response.headers
    assert "X-RateLimit-Reset" in response.headers


async def test_rate_limit_exceeded_returns_429(
    client: AsyncClient,
    auth_headers: dict[str, str],
    sample_pdf_bytes: bytes,
) -> None:
    """Requests beyond the limit receive 429 with a meaningful error message."""
    # Exhaust the limit (3/minute in test config)
    for _ in range(3):
        response = await client.post(
            "/api/v1/parse",
            headers=auth_headers,
            files={
                "file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")
            },
        )
        assert response.status_code == 200

    # Next request should be rate limited
    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
    )
    assert response.status_code == 429
    body = response.json()
    message = body.get("detail") or body.get("error", "")
    assert "rate" in message.lower() or "limit" in message.lower()


async def test_rate_limit_is_per_api_key(
    client: AsyncClient,
    auth_headers: dict[str, str],
    auth_headers_key2: dict[str, str],
    sample_pdf_bytes: bytes,
) -> None:
    """Exhausting the limit for key A does not block key B."""
    # Exhaust limit for key A
    for _ in range(3):
        response = await client.post(
            "/api/v1/parse",
            headers=auth_headers,
            files={
                "file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")
            },
        )
        assert response.status_code == 200

    # Key A is now limited
    response_a = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
    )
    assert response_a.status_code == 429

    # Key B still gets 200
    response_b = await client.post(
        "/api/v1/parse",
        headers=auth_headers_key2,
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
    )
    assert response_b.status_code == 200


async def test_health_endpoint_not_rate_limited(
    client: AsyncClient,
    auth_headers: dict[str, str],
    sample_pdf_bytes: bytes,
) -> None:
    """After exhausting the parse limit, /api/v1/health still returns 200."""
    for _ in range(3):
        await client.post(
            "/api/v1/parse",
            headers=auth_headers,
            files={
                "file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")
            },
        )

    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
    )
    assert response.status_code == 429

    health = await client.get("/api/v1/health")
    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
