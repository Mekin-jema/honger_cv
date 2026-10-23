from src.config import REGISTERED_PROVIDERS, ModelRef
from src.providers.base import BaseProvider

# Lazy-loaded provider singletons keyed by provider name.
_instances: dict[str, BaseProvider] = {}


def get_provider(ref: ModelRef) -> BaseProvider:
    """Return a provider instance for the given :class:`ModelRef`.

    Instances are cached as singletons — the first call for a provider name
    creates the instance, subsequent calls return the same object.

    Raises :class:`ValueError` if the provider name is not registered or
    has no implementation yet.
    """
    if ref.provider not in REGISTERED_PROVIDERS:
        raise ValueError(f"Unknown provider: {ref.provider}")

    if ref.provider not in _instances:
        _instances[ref.provider] = _create_provider(ref.provider)

    return _instances[ref.provider]


def _create_provider(name: str) -> BaseProvider:
    """Instantiate a provider by name.

    Import is deferred to avoid circular dependencies and to keep unused
    provider modules from being loaded.
    """
    if name == "openrouter":
        from src.config import settings
        from src.providers.openrouter import OpenRouterProvider

        return OpenRouterProvider(
            api_key=settings.OPENROUTER_API_KEY,
            base_url=settings.OPENROUTER_BASE_URL,
        )

    if name == "anthropic":
        raise NotImplementedError("Anthropic provider is not yet implemented.")

    if name == "openai":
        raise NotImplementedError("OpenAI provider is not yet implemented.")

    raise ValueError(f"No implementation for provider: {name}")


def reset_providers() -> None:
    """Clear cached provider instances (for testing)."""
    _instances.clear()
