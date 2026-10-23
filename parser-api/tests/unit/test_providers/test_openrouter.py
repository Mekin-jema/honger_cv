import httpx
import pytest

from src.providers.exceptions import ProviderError
from src.providers.openrouter import OpenRouterProvider


async def _make_provider(
    monkeypatch: pytest.MonkeyPatch, response: httpx.Response
) -> tuple[OpenRouterProvider, dict]:
    calls: dict = {}

    async def fake_post(self: httpx.AsyncClient, url: str, json: dict, **kwargs):
        calls["url"] = url
        calls["json"] = json
        return response

    monkeypatch.setattr(httpx.AsyncClient, "post", fake_post)
    provider = OpenRouterProvider(
        api_key="sk-test", base_url="https://openrouter.ai/api/v1"
    )
    return provider, calls


async def test_chat_sends_correct_request(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "id": "gen-1",
        "model": "google/gemini-flash-1.5",
        "choices": [
            {"message": {"role": "assistant", "content": "ok"}, "finish_reason": "stop"}
        ],
        "usage": {"prompt_tokens": 10, "completion_tokens": 5},
    }
    response = httpx.Response(200, json=payload)
    provider, calls = await _make_provider(monkeypatch, response)

    result = await provider.chat(
        "google/gemini-flash-1.5",
        [{"role": "user", "content": "Hello"}],
    )

    assert calls["url"] == "/chat/completions"
    body = calls["json"]
    assert body["model"] == "google/gemini-flash-1.5"
    assert body["messages"][0]["role"] == "user"
    assert body["temperature"] == 0.0
    assert body["max_tokens"] == 4096
    # Authorization header is configured on the underlying client
    assert provider._client.headers["Authorization"].startswith("Bearer ")  # type: ignore[attr-defined]
    assert result == payload


async def test_chat_returns_full_response(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "id": "gen-1",
        "model": "google/gemini-flash-1.5",
        "choices": [
            {"message": {"role": "assistant", "content": "ok"}, "finish_reason": "stop"}
        ],
        "usage": {"prompt_tokens": 10, "completion_tokens": 5},
    }
    response = httpx.Response(200, json=payload)
    provider, _ = await _make_provider(monkeypatch, response)

    result = await provider.chat(
        "google/gemini-flash-1.5",
        [{"role": "user", "content": "Hello"}],
    )
    assert result == payload


async def test_chat_raises_on_401(monkeypatch: pytest.MonkeyPatch) -> None:
    response = httpx.Response(401, text="unauthorized")
    provider, _ = await _make_provider(monkeypatch, response)

    with pytest.raises(ProviderError) as exc_info:
        await provider.chat(
            "google/gemini-flash-1.5",
            [{"role": "user", "content": "Hello"}],
        )
    err = exc_info.value
    assert err.status_code == 401
    assert err.provider == "openrouter"


async def test_chat_raises_on_429(monkeypatch: pytest.MonkeyPatch) -> None:
    response = httpx.Response(429, text="rate limited")
    provider, _ = await _make_provider(monkeypatch, response)

    with pytest.raises(ProviderError) as exc_info:
        await provider.chat(
            "google/gemini-flash-1.5",
            [{"role": "user", "content": "Hello"}],
        )
    err = exc_info.value
    assert err.status_code == 429


async def test_chat_raises_on_invalid_response_structure(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # Missing choices
    payload = {"id": "gen-1", "model": "google/gemini-flash-1.5"}
    response = httpx.Response(200, json=payload)
    provider, _ = await _make_provider(monkeypatch, response)

    with pytest.raises(ProviderError):
        await provider.chat(
            "google/gemini-flash-1.5",
            [{"role": "user", "content": "Hello"}],
        )


def test_extract_usage_normal() -> None:
    provider = OpenRouterProvider(
        api_key="sk-test", base_url="https://openrouter.ai/api/v1"
    )
    response = {
        "usage": {
            "prompt_tokens": 1820,
            "completion_tokens": 940,
            "total_tokens": 2760,
        }
    }
    usage = provider.extract_usage(response)
    assert usage["input_tokens"] == 1820
    assert usage["output_tokens"] == 940


def test_extract_usage_missing() -> None:
    provider = OpenRouterProvider(
        api_key="sk-test", base_url="https://openrouter.ai/api/v1"
    )
    usage = provider.extract_usage({})
    assert usage["input_tokens"] == 0
    assert usage["output_tokens"] == 0


def test_extract_content_normal() -> None:
    provider = OpenRouterProvider(
        api_key="sk-test", base_url="https://openrouter.ai/api/v1"
    )
    response = {
        "model": "google/gemini-flash-1.5",
        "choices": [
            {
                "message": {
                    "role": "assistant",
                    "content": "Hello, world!",
                },
                "finish_reason": "stop",
            }
        ],
    }
    content = provider.extract_content(response)
    assert content == "Hello, world!"


def test_extract_content_missing_raises() -> None:
    provider = OpenRouterProvider(
        api_key="sk-test", base_url="https://openrouter.ai/api/v1"
    )
    response = {"model": "google/gemini-flash-1.5", "choices": []}
    with pytest.raises(ProviderError):
        provider.extract_content(response)


async def test_default_temperature_is_zero(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "id": "gen-1",
        "model": "google/gemini-flash-1.5",
        "choices": [
            {"message": {"role": "assistant", "content": "ok"}, "finish_reason": "stop"}
        ],
    }
    response = httpx.Response(200, json=payload)
    provider, calls = await _make_provider(monkeypatch, response)

    await provider.chat(
        "google/gemini-flash-1.5",
        [{"role": "user", "content": "Hello"}],
    )
    assert calls["json"]["temperature"] == 0.0


async def test_kwargs_override_defaults(monkeypatch: pytest.MonkeyPatch) -> None:
    payload = {
        "id": "gen-1",
        "model": "google/gemini-flash-1.5",
        "choices": [
            {"message": {"role": "assistant", "content": "ok"}, "finish_reason": "stop"}
        ],
    }
    response = httpx.Response(200, json=payload)
    provider, calls = await _make_provider(monkeypatch, response)

    await provider.chat(
        "google/gemini-flash-1.5",
        [{"role": "user", "content": "Hello"}],
        temperature=0.5,
        max_tokens=123,
    )
    body = calls["json"]
    assert body["temperature"] == 0.5
    assert body["max_tokens"] == 123
