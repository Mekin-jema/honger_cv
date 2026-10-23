import io
import json
from unittest.mock import AsyncMock, patch

from httpx import AsyncClient

from src.llm.schemas import PersonalInfo, ResumeData
from src.parsing.schemas import ParseMetadata, UsageEntry
from src.pipeline.service import PipelineResult


def _default_pipeline_result(**overrides) -> PipelineResult:
    defaults = dict(
        success=True,
        data=ResumeData(personal_info=PersonalInfo(name="John Doe")),
        metadata=ParseMetadata(
            extraction_method="algorithmic",
            ocr_used=False,
            pages=1,
            processing_time_ms=0,
            usage=[],
        ),
        error=None,
    )
    defaults.update(overrides)
    return PipelineResult(**defaults)


@patch("src.parsing.router.run_pipeline", new_callable=AsyncMock)
async def test_parse_returns_success_response(
    mock_pipeline: AsyncMock,
    client: AsyncClient,
    auth_headers: dict[str, str],
    sample_pdf_bytes: bytes,
) -> None:
    mock_pipeline.return_value = _default_pipeline_result()

    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
    )
    assert response.status_code == 200
    body = response.json()

    assert body["success"] is True
    assert body["data"] is not None
    assert "personal_info" in body["data"]
    assert "experience" in body["data"]
    assert "education" in body["data"]
    assert "skills" in body["data"]


@patch("src.parsing.router.run_pipeline", new_callable=AsyncMock)
async def test_parse_returns_metadata(
    mock_pipeline: AsyncMock,
    client: AsyncClient,
    auth_headers: dict[str, str],
    sample_pdf_bytes: bytes,
) -> None:
    mock_pipeline.return_value = _default_pipeline_result()

    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
    )
    body = response.json()
    metadata = body["metadata"]

    assert metadata["extraction_method"] == "algorithmic"
    assert "ocr_used" in metadata
    assert metadata["pages"] >= 1
    assert "processing_time_ms" in metadata
    assert isinstance(metadata["usage"], list)


@patch("src.parsing.router.run_pipeline", new_callable=AsyncMock)
async def test_parse_returns_structured_data(
    mock_pipeline: AsyncMock,
    client: AsyncClient,
    auth_headers: dict[str, str],
    sample_pdf_bytes: bytes,
) -> None:
    mock_pipeline.return_value = _default_pipeline_result()

    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
    )
    assert response.status_code == 200
    body = response.json()

    assert body["success"] is True
    data = body["data"]
    assert data["personal_info"]["name"] == "John Doe"
    assert isinstance(data["experience"], list)
    assert isinstance(data["education"], list)
    assert isinstance(data["skills"], list)


@patch("src.parsing.router.run_pipeline", new_callable=AsyncMock)
async def test_parse_returns_usage_entries(
    mock_pipeline: AsyncMock,
    client: AsyncClient,
    auth_headers: dict[str, str],
    sample_pdf_bytes: bytes,
) -> None:
    mock_pipeline.return_value = _default_pipeline_result(
        metadata=ParseMetadata(
            extraction_method="ocr",
            ocr_used=True,
            pages=2,
            processing_time_ms=0,
            usage=[
                UsageEntry(
                    step="ocr",
                    model="google/gemini-flash-1.5",
                    input_tokens=150,
                    output_tokens=60,
                ),
                UsageEntry(
                    step="parse",
                    model="google/gemini-flash-1.5",
                    input_tokens=500,
                    output_tokens=300,
                ),
            ],
        ),
    )

    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
    )
    body = response.json()
    usage = body["metadata"]["usage"]

    assert len(usage) == 2
    assert usage[0]["step"] == "ocr"
    assert usage[0]["model"] == "google/gemini-flash-1.5"
    assert usage[0]["input_tokens"] == 150
    assert usage[1]["step"] == "parse"


@patch("src.parsing.router.run_pipeline", new_callable=AsyncMock)
async def test_parse_with_options(
    mock_pipeline: AsyncMock,
    client: AsyncClient,
    auth_headers: dict[str, str],
    sample_pdf_bytes: bytes,
) -> None:
    mock_pipeline.return_value = _default_pipeline_result()

    options = json.dumps(
        {
            "parse_models": (
                "openrouter/google/gemini-flash-1.5,openrouter/openai/gpt-4o-mini"
            ),
            "ocr_models": "openrouter/google/gemini-flash-1.5",
            "ocr": "force",
        }
    )
    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        data={"options": options},
    )
    assert response.status_code == 200


async def test_parse_with_invalid_options_returns_422(
    client: AsyncClient,
    auth_headers: dict[str, str],
    sample_pdf_bytes: bytes,
) -> None:
    options = json.dumps({"ocr": "invalid_value"})
    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("resume.pdf", io.BytesIO(sample_pdf_bytes), "application/pdf")},
        data={"options": options},
    )
    assert response.status_code == 422


async def test_parse_rejects_image_upload(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("photo.png", io.BytesIO(b"\x89PNG fake"), "image/png")},
    )
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


@patch("src.parsing.router.run_pipeline", new_callable=AsyncMock)
async def test_parse_accepts_markdown_upload(
    mock_pipeline: AsyncMock,
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    mock_pipeline.return_value = _default_pipeline_result()

    md_content = (
        b"# John Doe\n\nSoftware Engineer with experience in "
        b"Python, FastAPI, Docker, and PostgreSQL.\n\n"
        b"## Experience\n\nSenior Dev at Acme Corp for five years."
    )
    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("resume.md", io.BytesIO(md_content), "text/markdown")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["metadata"]["extraction_method"] == "algorithmic"


@patch("src.parsing.router.run_pipeline", new_callable=AsyncMock)
async def test_parse_accepts_txt_upload(
    mock_pipeline: AsyncMock,
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    mock_pipeline.return_value = _default_pipeline_result()

    txt_content = (
        b"John Doe\nSoftware Engineer\n"
        b"Experienced developer with skills in Python, FastAPI, and Docker.\n"
        b"Education: B.S. Computer Science from State University."
    )
    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
        files={"file": ("resume.txt", io.BytesIO(txt_content), "text/plain")},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["metadata"]["extraction_method"] == "algorithmic"


async def test_parse_without_file_returns_422(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/parse",
        headers=auth_headers,
    )
    assert response.status_code == 422
