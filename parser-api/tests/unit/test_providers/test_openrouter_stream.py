from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import httpx
import pytest

from src.providers.exceptions import ProviderError
from src.providers.openrouter import OpenRouterProvider


def _provider() -> OpenRouterProvider:
    return OpenRouterProvider(
        api_key="sk-test",
        base_url="https://openrouter.ai/api/v1",
    )


async def test_stream_chat_yields_text_deltas(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    calls: dict[str, str] = {}
    body: dict[str, object] = {}
    response = httpx.Response(
        200,
        content=(
            b'data: {"choices":[{"delta":{"content":"Hello "}}]}\n\n'
            b'data: {"choices":[{"delta":{"content":"there."}}]}\n\n'
            b"data: [DONE]\n\n"
        ),
    )

    @asynccontextmanager
    async def fake_stream(
        _client: httpx.AsyncClient,
        method: str,
        url: str,
        json: dict[str, object],
    ) -> AsyncIterator[httpx.Response]:
        calls.update(method=method, url=url)
        body.update(json)
        yield response

    monkeypatch.setattr(httpx.AsyncClient, "stream", fake_stream)
    provider = _provider()

    deltas = [
        delta
        async for delta in provider.stream_chat(
            "google/gemini-flash-1.5",
            [{"role": "user", "content": "Say hello"}],
        )
    ]

    assert deltas == ["Hello ", "there."]
    assert calls["method"] == "POST"
    assert calls["url"] == "/chat/completions"
    assert body["stream"] is True


async def test_stream_chat_raises_for_provider_errors(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    response = httpx.Response(429, content=b"rate limited")

    @asynccontextmanager
    async def fake_stream(
        _client: httpx.AsyncClient,
        _method: str,
        _url: str,
        json: dict[str, object],
    ) -> AsyncIterator[httpx.Response]:
        del json
        yield response

    monkeypatch.setattr(httpx.AsyncClient, "stream", fake_stream)

    with pytest.raises(ProviderError) as exc_info:
        async for _ in _provider().stream_chat(
            "google/gemini-flash-1.5",
            [{"role": "user", "content": "Say hello"}],
        ):
            pass

    assert exc_info.value.status_code == 429
