from __future__ import annotations

import time
from typing import Any, cast

import httpx

from src.logging import get_logger
from src.providers.base import BaseProvider
from src.providers.exceptions import ProviderError

logger = get_logger("providers.openrouter")


class OpenRouterProvider(BaseProvider):
    def __init__(self, api_key: str, base_url: str) -> None:
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
                "HTTP-Referer": "https://github.com/yourorg/resume-parser-api",
                "X-Title": "resume-parser-api",
            },
            timeout=httpx.Timeout(60.0, connect=10.0),
        )

    async def chat(
        self,
        model: str,
        messages: list[dict[str, Any]],
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Send a chat completion request to OpenRouter."""
        body: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": kwargs.pop("temperature", 0.0),
            "max_tokens": kwargs.pop("max_tokens", 4096),
        }

        if "response_format" in kwargs:
            body["response_format"] = kwargs.pop("response_format")

        # Allow additional provider-specific kwargs to pass through.
        if kwargs:
            body.update(kwargs)

        logger.info(
            "provider_request",
            provider="openrouter",
            model=model,
            message_count=len(messages),
        )

        start = time.monotonic()
        try:
            response = await self._client.post("/chat/completions", json=body)
        except httpx.RequestError as exc:
            raise ProviderError(
                message=f"Request to OpenRouter failed: {exc}",
                provider="openrouter",
                model=model,
            ) from exc

        latency_ms = int((time.monotonic() - start) * 1000)

        if response.status_code != 200:
            # Map all non-200s to ProviderError; retry policy decided by caller.
            text = response.text
            logger.warn(
                "provider_error",
                provider="openrouter",
                model=model,
                status=response.status_code,
                error=text,
            )
            raise ProviderError(
                message=(
                    f"OpenRouter request failed with status {response.status_code}: "
                    f"{text}"
                ),
                provider="openrouter",
                model=model,
                status_code=response.status_code,
            )

        try:
            payload = response.json()
        except ValueError as exc:
            logger.warn(
                "provider_error",
                provider="openrouter",
                model=model,
                status=response.status_code,
                error="Invalid JSON in response",
            )
            raise ProviderError(
                message="Invalid JSON in OpenRouter response",
                provider="openrouter",
                model=model,
                status_code=response.status_code,
            ) from exc

        # Minimal structural validation: at least one choice with message.content.
        try:
            choices = payload["choices"]
            if not choices:
                raise KeyError("choices is empty")
            first = choices[0]
            message = first["message"]
            content = message["content"]
            if not isinstance(content, str) or not content:
                raise KeyError("message.content is empty")
        except KeyError as exc:
            logger.warn(
                "provider_error",
                provider="openrouter",
                model=model,
                status=response.status_code,
                error=f"Unexpected response structure: {payload!r}",
            )
            raise ProviderError(
                message="Unexpected OpenRouter response structure",
                provider="openrouter",
                model=model,
                status_code=response.status_code,
            ) from exc

        usage = self.extract_usage(payload)
        logger.info(
            "provider_response",
            provider="openrouter",
            model=model,
            status=response.status_code,
            input_tokens=usage["input_tokens"],
            output_tokens=usage["output_tokens"],
            latency_ms=latency_ms,
        )

        return cast(dict[str, Any], payload)

    def extract_usage(self, response: dict[str, Any]) -> dict[str, int]:
        """Extract token usage from an OpenRouter response.

        Returns dict with keys: input_tokens, output_tokens.
        Returns zeros if usage data is missing.
        """
        usage = response.get("usage", {}) or {}
        return {
            "input_tokens": int(usage.get("prompt_tokens", 0) or 0),
            "output_tokens": int(usage.get("completion_tokens", 0) or 0),
        }

    def extract_content(self, response: dict[str, Any]) -> str:
        """Extract the assistant message content from an OpenRouter response.

        Raises ProviderError if the response structure is unexpected.
        """
        try:
            choices = response["choices"]
            if not choices:
                raise KeyError("choices is empty")
            first = choices[0]
            message = first["message"]
            content = message["content"]
            if not isinstance(content, str) or not content:
                raise KeyError("message.content is empty")
            return content
        except KeyError as exc:
            raise ProviderError(
                message=(
                    "Unexpected OpenRouter response structure while extracting content"
                ),
                provider="openrouter",
                model=str(response.get("model", "")),
            ) from exc
