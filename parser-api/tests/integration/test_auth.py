import io

from httpx import AsyncClient


async def test_parse_with_valid_key_returns_200(
    client: AsyncClient,
    auth_headers: dict[str, str],
    sample_pdf_bytes: bytes,
) -> None:
    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
    )
    assert response.status_code == 200


async def test_parse_with_invalid_key_returns_401(
    client: AsyncClient,
    invalid_auth_headers: dict[str, str],
    sample_pdf_bytes: bytes,
) -> None:
    response = await client.post(
        "/api/v1/parse",
        headers=invalid_auth_headers,
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
    )
    assert response.status_code == 401
    assert "Invalid API key" in response.json()["detail"]


async def test_parse_without_key_returns_401(
    client: AsyncClient,
    sample_pdf_bytes: bytes,
) -> None:
    response = await client.post(
        "/api/v1/parse",
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
    )
    assert response.status_code == 401
    assert "Missing" in response.json()["detail"]
