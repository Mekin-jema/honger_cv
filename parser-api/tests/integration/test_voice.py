from collections.abc import AsyncIterator
from unittest.mock import patch

from httpx import AsyncClient


async def _answer() -> AsyncIterator[str]:
    yield "I work with SQL "
    yield "and Oracle."


@patch("src.voice.router.stream_voice_answer", return_value=_answer())
async def test_voice_stream_returns_server_sent_events(
    _mock_stream: object,
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/voice/stream",
        headers=auth_headers,
        json={
            "question": "Tell me about your analytics experience.",
            "context": '{"name":"Candidate","skills":["SQL","Oracle"]}',
            "history": [],
        },
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("text/event-stream")
    assert '"text": "I work with SQL "' in response.text
    assert '"text": "and Oracle."' in response.text
    assert '"type":"done"' in response.text


async def test_voice_stream_requires_api_key(client: AsyncClient) -> None:
    response = await client.post(
        "/api/v1/voice/stream",
        json={
            "question": "Tell me about your experience.",
            "context": '{"name":"Candidate"}',
        },
    )

    assert response.status_code == 401


async def test_voice_stream_validates_question_length(
    client: AsyncClient,
    auth_headers: dict[str, str],
) -> None:
    response = await client.post(
        "/api/v1/voice/stream",
        headers=auth_headers,
        json={"question": "x", "context": '{"name":"Candidate"}'},
    )

    assert response.status_code == 422
