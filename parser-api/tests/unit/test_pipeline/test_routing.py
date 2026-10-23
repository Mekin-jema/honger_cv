"""Unit tests for pipeline routing functions."""

from src.config import ModelRef
from src.extraction.quality import TextQuality
from src.llm.schemas import PersonalInfo, ResumeData
from src.llm.service import LLMExtractionResult
from src.pipeline.graph import route_ocr, route_parse_result

# -- route_ocr --


def test_route_ocr_skip_when_sufficient():
    state = {
        "ocr_preference": "auto",
        "text_quality": TextQuality(
            char_count=500,
            word_count=100,
            alpha_ratio=0.8,
            is_sufficient=True,
        ),
        "ocr_chain": [ModelRef(provider="openrouter", model="m")],
    }
    assert route_ocr(state) == "parse"


def test_route_ocr_needed_when_insufficient():
    state = {
        "ocr_preference": "auto",
        "text_quality": TextQuality(
            char_count=10,
            word_count=2,
            alpha_ratio=0.3,
            is_sufficient=False,
        ),
        "ocr_chain": [ModelRef(provider="openrouter", model="m")],
    }
    assert route_ocr(state) == "ocr"


def test_route_ocr_forced():
    state = {
        "ocr_preference": "force",
        "text_quality": TextQuality(
            char_count=500,
            word_count=100,
            alpha_ratio=0.8,
            is_sufficient=True,
        ),
        "ocr_chain": [ModelRef(provider="openrouter", model="m")],
    }
    assert route_ocr(state) == "ocr"


def test_route_ocr_skipped_explicitly():
    state = {
        "ocr_preference": "skip",
        "text_quality": TextQuality(
            char_count=10,
            word_count=2,
            alpha_ratio=0.3,
            is_sufficient=False,
        ),
        "ocr_chain": [ModelRef(provider="openrouter", model="m")],
    }
    assert route_ocr(state) == "parse"


def test_route_ocr_no_chain():
    state = {
        "ocr_preference": "auto",
        "text_quality": TextQuality(
            char_count=10,
            word_count=2,
            alpha_ratio=0.3,
            is_sufficient=False,
        ),
        "ocr_chain": [],
    }
    assert route_ocr(state) == "parse"


def test_route_ocr_force_no_chain():
    state = {
        "ocr_preference": "force",
        "text_quality": TextQuality(
            char_count=500,
            word_count=100,
            alpha_ratio=0.8,
            is_sufficient=True,
        ),
        "ocr_chain": [],
    }
    assert route_ocr(state) == "parse"


def test_route_ocr_with_error():
    state = {
        "ocr_preference": "auto",
        "error": "extraction failed",
        "ocr_chain": [ModelRef(provider="openrouter", model="m")],
    }
    assert route_ocr(state) == "parse"


# -- route_parse_result --


def test_route_parse_done():
    state = {
        "resume_data": ResumeData(personal_info=PersonalInfo(name="John")),
        "parse_chain": [ModelRef(provider="openrouter", model="m")],
        "current_parse_index": 0,
    }
    assert route_parse_result(state) == "done"


def test_route_parse_retry():
    state = {
        "parse_result": LLMExtractionResult(
            success=False,
            data=None,
            validation_errors=["bad"],
            raw_response="",
            input_tokens=0,
            output_tokens=0,
        ),
        "parse_chain": [
            ModelRef(provider="openrouter", model="m1"),
            ModelRef(provider="openrouter", model="m2"),
        ],
        "current_parse_index": 1,
    }
    assert route_parse_result(state) == "retry"


def test_route_parse_fail():
    state = {
        "error": "All parse models exhausted. Last errors: bad json",
        "parse_chain": [ModelRef(provider="openrouter", model="m")],
        "current_parse_index": 0,
    }
    assert route_parse_result(state) == "fail"
