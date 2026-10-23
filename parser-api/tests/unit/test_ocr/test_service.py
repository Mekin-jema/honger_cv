"""Unit tests for OCR service."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.config import ModelRef
from src.ocr.service import OCRResult, ocr_extract
from src.providers.exceptions import ProviderError


def _model_ref() -> ModelRef:
    return ModelRef(provider="openrouter", model="google/gemini-flash-1.5")


def _make_mock_provider(
    content: str,
    input_tokens: int = 100,
    output_tokens: int = 50,
) -> MagicMock:
    provider = MagicMock()
    payload = {
        "choices": [{"message": {"content": content}}],
        "usage": {"prompt_tokens": input_tokens, "completion_tokens": output_tokens},
    }
    provider.chat = AsyncMock(return_value=payload)
    provider.extract_content = MagicMock(return_value=content)
    provider.extract_usage = MagicMock(
        return_value={"input_tokens": input_tokens, "output_tokens": output_tokens}
    )
    return provider


@pytest.mark.asyncio
async def test_ocr_extract_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock imaging and provider; OCRResult has text, page count, token counts."""
    fake_images = [b"\x89PNG\x0d\x0a\x1a\x0a", b"\x89PNG\x0d\x0a\x1a\x0a"]
    provider = _make_mock_provider(
        "Extracted page one.\n\nExtracted page two.",
        input_tokens=3200,
        output_tokens=150,
    )

    def fake_pages_to_images(content: bytes):
        return fake_images

    def fake_get_provider(ref: ModelRef):
        return provider

    monkeypatch.setattr("src.ocr.service.pdf_pages_to_images", fake_pages_to_images)
    monkeypatch.setattr("src.ocr.service.get_provider", fake_get_provider)

    result = await ocr_extract(b"dummy pdf bytes", _model_ref())

    assert isinstance(result, OCRResult)
    assert result.text == "Extracted page one.\n\nExtracted page two."
    assert result.pages == 2
    assert result.input_tokens == 3200
    assert result.output_tokens == 150


@pytest.mark.asyncio
async def test_ocr_extract_empty_pdf(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock pdf_pages_to_images to return []; OCRResult has text='', pages=0."""

    def fake_pages_to_images(content: bytes):
        return []

    monkeypatch.setattr("src.ocr.service.pdf_pages_to_images", fake_pages_to_images)

    result = await ocr_extract(b"dummy", _model_ref())

    assert result.text == ""
    assert result.pages == 0
    assert result.input_tokens == 0
    assert result.output_tokens == 0


@pytest.mark.asyncio
async def test_ocr_extract_provider_error_propagates(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    """Mock provider to raise ProviderError; it propagates."""

    def fake_pages_to_images(content: bytes):
        return [b"\x89PNG"]

    provider = MagicMock()
    provider.chat = AsyncMock(
        side_effect=ProviderError(
            "Request failed",
            provider="openrouter",
            model="google/gemini-flash-1.5",
        )
    )

    def fake_get_provider(ref: ModelRef):
        return provider

    monkeypatch.setattr("src.ocr.service.pdf_pages_to_images", fake_pages_to_images)
    monkeypatch.setattr("src.ocr.service.get_provider", fake_get_provider)

    with pytest.raises(ProviderError):
        await ocr_extract(b"dummy", _model_ref())


@pytest.mark.asyncio
async def test_ocr_extract_token_counts(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock provider with known usage; input_tokens and output_tokens match."""
    provider = _make_mock_provider("Some text.", input_tokens=1000, output_tokens=200)

    def fake_pages_to_images(content: bytes):
        return [b"\x89PNG"]

    def fake_get_provider(ref: ModelRef):
        return provider

    monkeypatch.setattr("src.ocr.service.pdf_pages_to_images", fake_pages_to_images)
    monkeypatch.setattr("src.ocr.service.get_provider", fake_get_provider)

    result = await ocr_extract(b"dummy", _model_ref())

    assert result.input_tokens == 1000
    assert result.output_tokens == 200
