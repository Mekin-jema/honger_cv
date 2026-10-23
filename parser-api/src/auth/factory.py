from src.auth.base import BaseAuthProvider
from src.auth.env import EnvAuthProvider
from src.config import settings

_provider_registry: dict[str, type[BaseAuthProvider]] = {
    "env": EnvAuthProvider,
}

_instance: BaseAuthProvider | None = None


def register_auth_provider(name: str, provider_class: type[BaseAuthProvider]) -> None:
    """Register a custom auth provider (e.g. database-backed)."""
    _provider_registry[name] = provider_class


def get_auth_provider() -> BaseAuthProvider:
    """Return the configured auth provider singleton."""
    global _instance
    if _instance is None:
        provider_name = settings.AUTH_PROVIDER
        if provider_name not in _provider_registry:
            raise ValueError(
                f"Unknown auth provider: '{provider_name}'. "
                f"Available: {list(_provider_registry.keys())}"
            )
        _instance = _provider_registry[provider_name]()
    return _instance


def reset_auth_provider() -> None:
    """Reset the singleton — used in tests."""
    global _instance
    _instance = None
