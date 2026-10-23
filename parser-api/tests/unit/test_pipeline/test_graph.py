"""Integration-style unit tests for the full pipeline graph (all components mocked)."""

from unittest.mock import AsyncMock, patch

import pytest

from src.config import ModelRef
from src.extraction.base import ExtractionResult
from src.extraction.quality import TextQuality
from src.llm.schemas import PersonalInfo, ResumeData
from src.llm.service import LLMExtractionResult
from src.ocr.service import OCRResult
from src.pipeline.graph import build_pipeline

MODEL_A = ModelRef(provider="openrouter", model="google/gemini-flash-1.5")
MODEL_B = ModelRef(provider="openrouter", model="openai/gpt-4o-mini")

GOOD_EXTRACTION = ExtractionResult(
    text="John Doe, Software Engineer with 10 years experience in Python.",
    pages=2,
    method="pdf",
    source_filename="resume.pdf",
)

GOOD_QUALITY = TextQuality(
    char_count=62,
    word_count=10,
    alpha_ratio=0.85,
    is_sufficient=True,
)

POOR_QUALITY = TextQuality(
    char_count=5,
    word_count=1,
    alpha_ratio=0.2,
    is_sufficient=False,
)

RESUME = ResumeData(personal_info=PersonalInfo(name="John Doe"))


def _success_result(**overrides):
    defaults = dict(
        success=True,
        data=RESUME,
        validation_errors=[],
        raw_response="{}",
        input_tokens=500,
        output_tokens=300,
    )
    defaults.update(overrides)
    return LLMExtractionResult(**defaults)


def _fail_result(**overrides):
    defaults = dict(
        success=False,
        data=None,
        validation_errors=["invalid json"],
        raw_response="bad",
        input_tokens=400,
        output_tokens=100,
    )
    defaults.update(overrides)
    return LLMExtractionResult(**defaults)


@pytest.mark.asyncio
@patch("src.pipeline.nodes.extract_resume_data", new_callable=AsyncMock)
@patch("src.pipeline.nodes.score_text_quality")
@patch("src.pipeline.nodes.extract_text")
async def test_full_pipeline_algorithmic_success(
    mock_extract, mock_quality, mock_parse
):
    mock_extract.return_value = GOOD_EXTRACTION
    mock_quality.return_value = GOOD_QUALITY
    mock_parse.return_value = _success_result()

    pipeline = build_pipeline()
    result = await pipeline.ainvoke(
        {
            "content": b"pdf-bytes",
            "content_type": "application/pdf",
            "filename": "resume.pdf",
            "parse_chain": [MODEL_A],
            "ocr_chain": [MODEL_A],
            "ocr_preference": "auto",
            "usage": [],
            "current_parse_index": 0,
            "current_ocr_index": 0,
            "ocr_attempted": False,
        }
    )

    assert result["resume_data"] is not None
    assert result["resume_data"].personal_info.name == "John Doe"
    assert result.get("ocr_attempted", False) is False
    assert len(result.get("usage", [])) == 1
    assert result["usage"][0].step == "parse"
    assert result.get("error") is None


@pytest.mark.asyncio
@patch("src.pipeline.nodes.extract_resume_data", new_callable=AsyncMock)
@patch("src.pipeline.nodes.ocr_extract", new_callable=AsyncMock)
@patch("src.pipeline.nodes.score_text_quality")
@patch("src.pipeline.nodes.extract_text")
async def test_full_pipeline_with_ocr(mock_extract, mock_quality, mock_ocr, mock_parse):
    poor_extraction = ExtractionResult(
        text="...",
        pages=1,
        method="pdf",
        source_filename="scan.pdf",
    )
    mock_extract.return_value = poor_extraction
    mock_quality.return_value = POOR_QUALITY
    mock_ocr.return_value = OCRResult(
        text="John Doe Software Engineer with extensive experience.",
        pages=1,
        input_tokens=150,
        output_tokens=60,
    )
    mock_parse.return_value = _success_result()

    pipeline = build_pipeline()
    result = await pipeline.ainvoke(
        {
            "content": b"scanned-pdf",
            "content_type": "application/pdf",
            "filename": "scan.pdf",
            "parse_chain": [MODEL_A],
            "ocr_chain": [MODEL_A],
            "ocr_preference": "auto",
            "usage": [],
            "current_parse_index": 0,
            "current_ocr_index": 0,
            "ocr_attempted": False,
        }
    )

    assert result["resume_data"] is not None
    assert result["ocr_attempted"] is True
    assert result["ocr_text"] is not None
    usage = result.get("usage", [])
    assert len(usage) == 2
    assert usage[0].step == "ocr"
    assert usage[1].step == "parse"


@pytest.mark.asyncio
@patch("src.pipeline.nodes.extract_resume_data", new_callable=AsyncMock)
@patch("src.pipeline.nodes.score_text_quality")
@patch("src.pipeline.nodes.extract_text")
async def test_full_pipeline_parse_escalation(mock_extract, mock_quality, mock_parse):
    mock_extract.return_value = GOOD_EXTRACTION
    mock_quality.return_value = GOOD_QUALITY
    mock_parse.side_effect = [_fail_result(), _success_result()]

    pipeline = build_pipeline()
    result = await pipeline.ainvoke(
        {
            "content": b"pdf-bytes",
            "content_type": "application/pdf",
            "filename": "resume.pdf",
            "parse_chain": [MODEL_A, MODEL_B],
            "ocr_chain": [],
            "ocr_preference": "auto",
            "usage": [],
            "current_parse_index": 0,
            "current_ocr_index": 0,
            "ocr_attempted": False,
        }
    )

    assert result["resume_data"] is not None
    usage = result.get("usage", [])
    assert len(usage) == 2
    assert usage[0].step == "parse"
    assert usage[0].model == "google/gemini-flash-1.5"
    assert usage[1].step == "parse"
    assert usage[1].model == "openai/gpt-4o-mini"


@pytest.mark.asyncio
@patch("src.pipeline.nodes.extract_resume_data", new_callable=AsyncMock)
@patch("src.pipeline.nodes.score_text_quality")
@patch("src.pipeline.nodes.extract_text")
async def test_full_pipeline_all_models_fail(mock_extract, mock_quality, mock_parse):
    mock_extract.return_value = GOOD_EXTRACTION
    mock_quality.return_value = GOOD_QUALITY
    mock_parse.side_effect = [_fail_result(), _fail_result()]

    pipeline = build_pipeline()
    result = await pipeline.ainvoke(
        {
            "content": b"pdf-bytes",
            "content_type": "application/pdf",
            "filename": "resume.pdf",
            "parse_chain": [MODEL_A, MODEL_B],
            "ocr_chain": [],
            "ocr_preference": "auto",
            "usage": [],
            "current_parse_index": 0,
            "current_ocr_index": 0,
            "ocr_attempted": False,
        }
    )

    assert result.get("resume_data") is None
    assert result.get("error") is not None
    assert "exhausted" in result["error"].lower()
    usage = result.get("usage", [])
    assert len(usage) == 2
    assert usage[0].model == "google/gemini-flash-1.5"
    assert usage[1].model == "openai/gpt-4o-mini"
