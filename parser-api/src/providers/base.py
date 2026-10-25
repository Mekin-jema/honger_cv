from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from typing import Any


class BaseProvider(ABC):
    """Abstract base class for LLM providers.

    Each provider implementation knows how to send chat completion requests
    to a specific API (OpenRouter, Anthropic, OpenAI, etc.).  Providers
    receive a plain model string — the provider prefix has already been
    stripped by the time a :class:`ModelRef` is resolved.
    """

    @abstractmethod
    async def chat(
        self,
        model: str,
        messages: list[dict[str, Any]],
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Send a chat completion request.

        Parameters
        ----------
        model:
            Model identifier as understood by this provider
            (e.g. ``"google/gemini-flash-1.5"`` for OpenRouter).
        messages:
            Chat messages in OpenAI-compatible format.
        **kwargs:
            Additional provider-specific parameters.

        Returns
        -------
        dict:
            Raw response from the provider API.
        """
        ...

    @abstractmethod
    def stream_chat(
        self,
        model: str,
        messages: list[dict[str, Any]],
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Stream text deltas from a chat completion."""
        ...

    @abstractmethod
    def extract_content(self, response: dict[str, Any]) -> str:
        """Extract the assistant message content from a provider response."""
        ...

    @abstractmethod
    def extract_usage(self, response: dict[str, Any]) -> dict[str, int]:
        """Extract token usage (input_tokens, output_tokens) from provider response."""
        ...
