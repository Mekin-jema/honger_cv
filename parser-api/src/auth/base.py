from abc import ABC, abstractmethod


class BaseAuthProvider(ABC):
    """Abstract interface for API key authentication.

    Implement this to add custom key validation backends
    (e.g. database lookups, Redis, external auth service).
    """

    @abstractmethod
    async def validate_key(self, api_key: str) -> bool:
        """Return True if the API key is valid, False otherwise."""
        ...

    @abstractmethod
    async def get_key_identity(self, api_key: str) -> str:
        """Return a stable identifier for the key, used for rate limiting.

        For env-based keys, this can be the key itself (or a hash).
        For database-backed keys, this could be a user ID or key ID.
        """
        ...
