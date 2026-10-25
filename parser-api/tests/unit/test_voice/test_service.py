import pytest
from pydantic import ValidationError

from src.voice.schemas import VoiceRequest
from src.voice.service import build_messages


def test_build_messages_uses_candidate_context_and_recent_history() -> None:
    request = VoiceRequest(
        question="Tell me about your work with SQL.",
        context='{"identity":{"name":"Mekin"},"skills":["SQL"]}',
        history=[
            {"question": "What role are you in?", "answer": "I am a data analyst."}
        ],
    )

    messages = build_messages(request)

    assert messages[0]["role"] == "system"
    assert "Mekin" in messages[0]["content"]
    assert messages[1:] == [
        {"role": "user", "content": "What role are you in?"},
        {"role": "assistant", "content": "I am a data analyst."},
        {"role": "user", "content": "Tell me about your work with SQL."},
    ]


def test_voice_request_rejects_oversized_context() -> None:
    with pytest.raises(ValidationError):
        VoiceRequest(question="Hi", context="x" * 40_001)


def test_voice_request_rejects_unknown_fields() -> None:
    with pytest.raises(ValidationError):
        VoiceRequest(
            question="Hi",
            context="A candidate profile with enough detail.",
            api_key="secret",
        )
