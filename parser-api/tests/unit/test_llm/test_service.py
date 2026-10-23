"""Unit tests for LLM extraction service."""

from unittest.mock import AsyncMock, MagicMock

import pytest

from src.config import ModelRef
from src.llm.schemas import ResumeData
from src.llm.service import extract_resume_data
from src.providers.exceptions import ProviderError
from src.providers.factory import reset_providers


def _model_ref() -> ModelRef:
    return ModelRef(provider="openrouter", model="google/gemini-flash-1.5")


def _valid_json_response() -> str:
    return '{"personal_info": {"name": "Jane Doe"}, "experience": []}'


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


@pytest.fixture(autouse=True)
def _reset_providers_after_test() -> None:
    yield
    reset_providers()


@pytest.mark.asyncio
async def test_extract_success(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock provider returns valid JSON; success=True, data is ResumeData."""
    content = _valid_json_response()
    provider = _make_mock_provider(content, input_tokens=1820, output_tokens=940)

    def fake_get_provider(ref: ModelRef):
        return provider

    monkeypatch.setattr("src.llm.service.get_provider", fake_get_provider)

    result = await extract_resume_data("Some resume text", _model_ref())

    assert result.success is True
    assert result.data is not None
    assert isinstance(result.data, ResumeData)
    assert result.data.personal_info.name == "Jane Doe"
    assert result.validation_errors == []
    assert result.input_tokens == 1820
    assert result.output_tokens == 940
    assert result.raw_response == content


@pytest.mark.asyncio
async def test_extract_validation_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock provider returns JSON with schema violations; success=False, errors set."""
    content = (
        '{"personal_info": {"name": "Jane"}, "experience": '
        '[{"company": "Acme", "title": "Dev"}]}'
    )
    provider = _make_mock_provider(content)

    def fake_get_provider(ref: ModelRef):
        return provider

    monkeypatch.setattr("src.llm.service.get_provider", fake_get_provider)

    result = await extract_resume_data("Resume text", _model_ref())

    assert result.success is False
    assert result.data is None
    assert len(result.validation_errors) >= 1
    assert any(
        "experience" in e and "start_date" in e for e in result.validation_errors
    )


@pytest.mark.asyncio
async def test_extract_invalid_json(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock provider returns non-JSON; success=False, errors mention JSON parsing."""
    content = "This is not JSON at all"
    provider = _make_mock_provider(content)

    def fake_get_provider(ref: ModelRef):
        return provider

    monkeypatch.setattr("src.llm.service.get_provider", fake_get_provider)

    result = await extract_resume_data("Resume text", _model_ref())

    assert result.success is False
    assert result.data is None
    assert any(
        "json" in e.lower() or "parse" in e.lower() for e in result.validation_errors
    )


@pytest.mark.asyncio
async def test_extract_strips_markdown_fences(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock provider returns JSON wrapped in code fences; success=True."""
    content = "```json\n" + _valid_json_response() + "\n```"
    provider = _make_mock_provider(content)

    def fake_get_provider(ref: ModelRef):
        return provider

    monkeypatch.setattr("src.llm.service.get_provider", fake_get_provider)

    result = await extract_resume_data("Resume text", _model_ref())

    assert result.success is True
    assert result.data is not None
    assert result.data.personal_info.name == "Jane Doe"


@pytest.mark.asyncio
async def test_provider_error_propagates(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock provider raises ProviderError; assert it is not caught."""
    provider = MagicMock()
    err = ProviderError(
        "Network error", provider="openrouter", model="google/gemini-flash-1.5"
    )
    provider.chat = AsyncMock(side_effect=err)

    def fake_get_provider(ref: ModelRef):
        return provider

    monkeypatch.setattr("src.llm.service.get_provider", fake_get_provider)

    with pytest.raises(ProviderError):
        await extract_resume_data("Resume text", _model_ref())


@pytest.mark.asyncio
async def test_token_counts_extracted(monkeypatch: pytest.MonkeyPatch) -> None:
    """Mock provider returns usage; input_tokens and output_tokens match."""
    content = _valid_json_response()
    provider = _make_mock_provider(content, input_tokens=2000, output_tokens=300)

    def fake_get_provider(ref: ModelRef):
        return provider

    monkeypatch.setattr("src.llm.service.get_provider", fake_get_provider)

    result = await extract_resume_data("Resume text", _model_ref())

    assert result.input_tokens == 2000
    assert result.output_tokens == 300
