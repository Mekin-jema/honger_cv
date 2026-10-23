from __future__ import annotations


class ProviderError(Exception):
    """Raised when a provider API call fails."""

    def __init__(
        self,
        message: str,
        provider: str,
        model: str,
        status_code: int | None = None,
    ) -> None:
        self.provider = provider
        self.model = model
        self.status_code = status_code
        super().__init__(message)
