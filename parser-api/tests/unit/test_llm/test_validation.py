"""Unit tests for LLM response validation."""

from src.llm.schemas import ResumeData
from src.llm.validation import validate_llm_response


def test_valid_json_returns_success() -> None:
    """Well-formed JSON matching schema returns success=True and ResumeData instance."""
    raw = '{"personal_info": {"name": "Jane"}, "experience": []}'
    result = validate_llm_response(raw)
    assert result.success is True
    assert result.data is not None
    assert isinstance(result.data, ResumeData)
    assert result.data.personal_info.name == "Jane"
    assert result.errors == []


def test_invalid_json_returns_failure() -> None:
    """Malformed JSON returns success=False and errors mention JSON parsing."""
    raw = '{"personal_info": {"name": '
    result = validate_llm_response(raw)
    assert result.success is False
    assert result.data is None
    assert any("json" in e.lower() or "parse" in e.lower() for e in result.errors)


def test_schema_violation_returns_failure() -> None:
    """Valid JSON that violates schema (e.g. experience as string) returns False."""
    raw = '{"personal_info": {"name": "Jane"}, "experience": "not-a-list"}'
    result = validate_llm_response(raw)
    assert result.success is False
    assert result.data is None
    assert len(result.errors) >= 1


def test_missing_required_name_returns_failure() -> None:
    """JSON with personal_info missing name returns success=False."""
    raw = '{"personal_info": {}}'
    result = validate_llm_response(raw)
    assert result.success is False
    assert any("name" in e.lower() for e in result.errors)


def test_missing_required_personal_info_returns_failure() -> None:
    """JSON with only experience (no personal_info) returns success=False."""
    raw = '{"experience": []}'
    result = validate_llm_response(raw)
    assert result.success is False
    assert len(result.errors) >= 1


def test_markdown_fence_stripped() -> None:
    """JSON wrapped in ```json ... ``` is parsed and returns success=True."""
    raw = '```json\n{"personal_info": {"name": "Jane"}}\n```'
    result = validate_llm_response(raw)
    assert result.success is True
    assert result.data is not None
    assert result.data.personal_info.name == "Jane"


def test_extra_fields_ignored() -> None:
    """Extra top-level fields not in schema still validate (Pydantic ignores extras)."""
    raw = '{"personal_info": {"name": "Jane"}, "unknown_field": 123, "other": "x"}'
    result = validate_llm_response(raw)
    assert result.success is True
    assert result.data is not None


def test_errors_formatted_readably() -> None:
    """Nested validation error produces human-readable path in errors list."""
    raw = (
        '{"personal_info": {"name": "Jane"}, '
        '"experience": [{"company": "Acme", "title": "Dev"}]}'
    )
    result = validate_llm_response(raw)
    assert result.success is False
    # Missing start_date on experience[0]
    assert any("experience" in e and "start_date" in e for e in result.errors)
