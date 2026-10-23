from src.config import ModelRef
from src.providers.factory import get_provider, reset_providers
from src.providers.openrouter import OpenRouterProvider


def test_get_provider_returns_openrouter() -> None:
    reset_providers()
    ref = ModelRef(provider="openrouter", model="google/gemini-flash-1.5")
    provider = get_provider(ref)
    assert isinstance(provider, OpenRouterProvider)


def test_provider_singleton() -> None:
    reset_providers()
    ref = ModelRef(provider="openrouter", model="google/gemini-flash-1.5")
    first = get_provider(ref)
    second = get_provider(ref)
    assert first is second


def test_unknown_provider_raises() -> None:
    reset_providers()
    ref = ModelRef(provider="unknown", model="some-model")
    try:
        get_provider(ref)
    except ValueError as exc:
        assert "Unknown provider" in str(exc)
    else:
        raise AssertionError("Expected ValueError for unknown provider")
