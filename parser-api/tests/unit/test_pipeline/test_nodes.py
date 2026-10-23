"""Unit tests for individual pipeline node functions."""

from unittest.mock import AsyncMock, patch

import pytest

from src.config import ModelRef
from src.extraction.base import ExtractionError, ExtractionResult
from src.extraction.quality import TextQuality
from src.llm.schemas import PersonalInfo, ResumeData
from src.llm.service import LLMExtractionResult
from src.ocr.service import OCRResult
from src.pipeline.nodes import (
    check_ocr_quality_node,
    extract_node,
    ocr_node,
    parse_node,
)
from src.providers.exceptions import ProviderError

# -- extract_node --


@patch("src.pipeline.nodes.score_text_quality")
@patch("src.pipeline.nodes.extract_text")
def test_extract_node_populates_state(mock_extract, mock_quality):
    extraction = ExtractionResult(
        text="John Doe, Software Engineer",
        pages=2,
        method="pdf",
        source_filename="resume.pdf",
    )
    quality = TextQuality(
        char_count=27,
        word_count=4,
        alpha_ratio=0.85,
        is_sufficient=True,
    )
    mock_extract.return_value = extraction
    mock_quality.return_value = quality

    state = {
        "content": b"fake-pdf",
        "content_type": "application/pdf",
        "filename": "resume.pdf",
    }

    result = extract_node(state)

    assert result["extraction_result"] is extraction
    assert result["text_quality"] is quality
    assert result["text"] == "John Doe, Software Engineer"
    assert "error" not in result


@patch("src.pipeline.nodes.extract_text")
def test_extract_node_error_sets_error(mock_extract):
    mock_extract.side_effect = ExtractionError("corrupt file", filename="bad.pdf")

    state = {
        "content": b"bad-data",
        "content_type": "application/pdf",
        "filename": "bad.pdf",
    }

    result = extract_node(state)

    assert "error" in result
    assert "corrupt file" in result["error"]
    assert result["text"] == ""


# -- ocr_node --


@pytest.mark.asyncio
@patch("src.pipeline.nodes.ocr_extract", new_callable=AsyncMock)
async def test_ocr_node_calls_provider(mock_ocr):
    model_ref = ModelRef(provider="openrouter", model="google/gemini-flash-1.5")
    mock_ocr.return_value = OCRResult(
        text="OCR extracted text",
        pages=1,
        input_tokens=100,
        output_tokens=50,
    )

    state = {
        "content": b"fake-pdf",
        "ocr_chain": [model_ref],
        "current_ocr_index": 0,
        "usage": [],
    }

    result = await ocr_node(state)

    mock_ocr.assert_called_once_with(b"fake-pdf", model_ref)
    assert result["ocr_text"] == "OCR extracted text"
    assert result["ocr_attempted"] is True


@pytest.mark.asyncio
@patch("src.pipeline.nodes.ocr_extract", new_callable=AsyncMock)
async def test_ocr_node_appends_usage(mock_ocr):
    model_ref = ModelRef(provider="openrouter", model="google/gemini-flash-1.5")
    mock_ocr.return_value = OCRResult(
        text="OCR text",
        pages=1,
        input_tokens=200,
        output_tokens=75,
    )

    state = {
        "content": b"fake-pdf",
        "ocr_chain": [model_ref],
        "current_ocr_index": 0,
        "usage": [],
    }

    result = await ocr_node(state)

    assert len(result["usage"]) == 1
    entry = result["usage"][0]
    assert entry.step == "ocr"
    assert entry.model == "google/gemini-flash-1.5"
    assert entry.input_tokens == 200
    assert entry.output_tokens == 75


@pytest.mark.asyncio
@patch("src.pipeline.nodes.ocr_extract", new_callable=AsyncMock)
async def test_ocr_node_retries_on_provider_error(mock_ocr):
    model_a = ModelRef(provider="openrouter", model="model-a")
    model_b = ModelRef(provider="openrouter", model="model-b")

    mock_ocr.side_effect = [
        ProviderError("timeout", provider="openrouter", model="model-a"),
        OCRResult(text="text from B", pages=1, input_tokens=10, output_tokens=5),
    ]

    state = {
        "content": b"pdf",
        "ocr_chain": [model_a, model_b],
        "current_ocr_index": 0,
        "usage": [],
    }

    result = await ocr_node(state)

    assert result["ocr_text"] == "text from B"
    assert len(result["usage"]) == 2
    assert result["usage"][0].model == "model-a"
    assert result["usage"][0].input_tokens == 0
    assert result["usage"][1].model == "model-b"


# -- check_ocr_quality_node --


def test_check_ocr_quality_uses_longer_ocr_text():
    state = {"ocr_text": "a" * 100, "text": "b" * 50}
    result = check_ocr_quality_node(state)
    assert result["text"] == "a" * 100


def test_check_ocr_quality_keeps_original_when_shorter():
    state = {"ocr_text": "a" * 10, "text": "b" * 50}
    result = check_ocr_quality_node(state)
    assert "text" not in result


def test_check_ocr_quality_handles_none_ocr():
    state = {"ocr_text": None, "text": "original"}
    result = check_ocr_quality_node(state)
    assert "text" not in result


# -- parse_node --


@pytest.mark.asyncio
@patch("src.pipeline.nodes.extract_resume_data", new_callable=AsyncMock)
async def test_parse_node_success(mock_extract):
    model_ref = ModelRef(provider="openrouter", model="google/gemini-flash-1.5")
    resume = ResumeData(personal_info=PersonalInfo(name="John Doe"))

    mock_extract.return_value = LLMExtractionResult(
        success=True,
        data=resume,
        validation_errors=[],
        raw_response="{}",
        input_tokens=500,
        output_tokens=300,
    )

    state = {
        "text": "John Doe, Software Engineer",
        "parse_chain": [model_ref],
        "current_parse_index": 0,
        "usage": [],
    }

    result = await parse_node(state)

    assert result["parse_result"].success is True
    assert result["parse_result"].data is resume
    assert len(result["usage"]) == 1
    assert result["usage"][0].input_tokens == 500


@pytest.mark.asyncio
@patch("src.pipeline.nodes.extract_resume_data", new_callable=AsyncMock)
async def test_parse_node_validation_failure(mock_extract):
    model_ref = ModelRef(provider="openrouter", model="google/gemini-flash-1.5")

    mock_extract.return_value = LLMExtractionResult(
        success=False,
        data=None,
        validation_errors=["missing personal_info"],
        raw_response="bad json",
        input_tokens=400,
        output_tokens=100,
    )

    state = {
        "text": "Some resume text",
        "parse_chain": [model_ref],
        "current_parse_index": 0,
        "usage": [],
    }

    result = await parse_node(state)

    assert result["parse_result"].success is False
    assert len(result["usage"]) == 1


@pytest.mark.asyncio
async def test_parse_node_skips_on_error():
    state = {
        "text": "",
        "parse_chain": [ModelRef(provider="openrouter", model="m")],
        "current_parse_index": 0,
        "error": "extraction failed",
    }

    result = await parse_node(state)

    assert result == {}


@pytest.mark.asyncio
@patch("src.pipeline.nodes.extract_resume_data", new_callable=AsyncMock)
async def test_parse_node_provider_error(mock_extract):
    model_ref = ModelRef(provider="openrouter", model="model-x")
    mock_extract.side_effect = ProviderError(
        "timeout", provider="openrouter", model="model-x"
    )

    state = {
        "text": "text",
        "parse_chain": [model_ref],
        "current_parse_index": 0,
        "usage": [],
    }

    result = await parse_node(state)

    assert result["parse_result"].success is False
    assert len(result["usage"]) == 1
    assert result["usage"][0].input_tokens == 0
