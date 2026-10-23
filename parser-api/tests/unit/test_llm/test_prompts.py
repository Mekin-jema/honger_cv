"""Unit tests for LLM prompt building."""

from src.llm.prompts import build_parse_messages


def test_build_parse_messages_structure() -> None:
    """Result is a list of two dicts with role and content keys."""
    result = build_parse_messages("Sample resume text")
    assert isinstance(result, list)
    assert len(result) == 2
    for msg in result:
        assert isinstance(msg, dict)
        assert "role" in msg
        assert "content" in msg


def test_system_message_contains_schema() -> None:
    """System message includes personal_info, experience, and other schema fields."""
    result = build_parse_messages("Resume content")
    system_msg = next(m for m in result if m["role"] == "system")
    content = system_msg["content"]
    assert "personal_info" in content
    assert "experience" in content
    assert "education" in content
    assert "skills" in content


def test_user_message_contains_text() -> None:
    """User message content includes the provided resume text."""
    sample_text = "John Doe\nSoftware Engineer at Acme Corp since 2020."
    result = build_parse_messages(sample_text)
    user_msg = next(m for m in result if m["role"] == "user")
    assert sample_text in user_msg["content"]
    assert "Parse the following resume" in user_msg["content"]
