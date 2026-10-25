from __future__ import annotations

import json
import time
from collections.abc import AsyncIterator
from typing import Any, cast

import httpx

from src.logging import get_logger
from src.providers.base import BaseProvider
from src.providers.exceptions import ProviderError

logger = get_logger("providers.openai_compatible")


class OpenAICompatibleProvider(BaseProvider):
    def __init__(
        self,
        api_key: str,
        base_url: str,
        provider_name: str = "openai_compatible",
        extra_headers: dict[str, str] | None = None,
        timeout_seconds: int = 60,
    ) -> None:
        self._provider_name = provider_name
        headers = {"Content-Type": "application/json", **(extra_headers or {})}
        if api_key:
            headers["Authorization"] = f"Bearer {api_key}"
        self._client = httpx.AsyncClient(
            base_url=base_url,
            headers=headers,
            timeout=httpx.Timeout(float(timeout_seconds), connect=10.0),
        )

    async def chat(
        self,
        model: str,
        messages: list[dict[str, Any]],
        **kwargs: Any,
    ) -> dict[str, Any]:
        """Send a chat completion request to an OpenAI-compatible API."""
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
            provider=self._provider_name,
            model=model,
            message_count=len(messages),
        )

        start = time.monotonic()
        try:
            response = await self._client.post("/chat/completions", json=body)
        except httpx.RequestError as exc:
            raise ProviderError(
                message=f"Request to {self._provider_name} failed: {exc}",
                provider=self._provider_name,
                model=model,
            ) from exc

        latency_ms = int((time.monotonic() - start) * 1000)

        if response.status_code != 200:
            # Map all non-200s to ProviderError; retry policy decided by caller.
            text = response.text
            logger.warn(
                "provider_error",
                provider=self._provider_name,
                model=model,
                status=response.status_code,
                error=text,
            )
            raise ProviderError(
                message=(
                    f"{self._provider_name} request failed with status "
                    f"{response.status_code}: "
                    f"{text}"
                ),
                provider=self._provider_name,
                model=model,
                status_code=response.status_code,
            )

        try:
            payload = response.json()
        except ValueError as exc:
            logger.warn(
                "provider_error",
                provider=self._provider_name,
                model=model,
                status=response.status_code,
                error="Invalid JSON in response",
            )
            raise ProviderError(
                message=f"Invalid JSON in {self._provider_name} response",
                provider=self._provider_name,
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
                provider=self._provider_name,
                model=model,
                status=response.status_code,
                error=f"Unexpected response structure: {payload!r}",
            )
            raise ProviderError(
                message=f"Unexpected {self._provider_name} response structure",
                provider=self._provider_name,
                model=model,
                status_code=response.status_code,
            ) from exc

        usage = self.extract_usage(payload)
        logger.info(
            "provider_response",
            provider=self._provider_name,
            model=model,
            status=response.status_code,
            input_tokens=usage["input_tokens"],
            output_tokens=usage["output_tokens"],
            latency_ms=latency_ms,
        )

        return cast(dict[str, Any], payload)

    async def stream_chat(
        self,
        model: str,
        messages: list[dict[str, Any]],
        **kwargs: Any,
    ) -> AsyncIterator[str]:
        """Stream text deltas from an OpenAI-compatible chat completion."""
        body: dict[str, Any] = {
            "model": model,
            "messages": messages,
            "temperature": kwargs.pop("temperature", 0.3),
            "max_tokens": kwargs.pop("max_tokens", 320),
            "stream": True,
        }
        if kwargs:
            body.update(kwargs)

        logger.info(
            "provider_stream_request",
            provider=self._provider_name,
            model=model,
            message_count=len(messages),
        )
        started_at = time.monotonic()
        received_content = False
        try:
            async with self._client.stream(
                "POST", "/chat/completions", json=body
            ) as response:
                if response.status_code != 200:
                    logger.warn(
                        "provider_stream_error",
                        provider=self._provider_name,
                        model=model,
                        status=response.status_code,
                    )
                    raise ProviderError(
                        message=(
                            f"{self._provider_name} streaming request failed "
                            "with status "
                            f"{response.status_code}"
                        ),
                        provider=self._provider_name,
                        model=model,
                        status_code=response.status_code,
                    )

                async for line in response.aiter_lines():
                    if not line.startswith("data:"):
                        continue
                    data = line[5:].strip()
                    if not data or data == "[DONE]":
                        continue
                    try:
                        event = json.loads(data)
                        choices = event.get("choices", [])
                        delta = choices[0].get("delta", {}) if choices else {}
                        content = delta.get("content")
                    except (ValueError, AttributeError, IndexError, TypeError):
                        logger.warn(
                            "provider_stream_invalid_event",
                            provider=self._provider_name,
                            model=model,
                        )
                        continue
                    if isinstance(content, str) and content:
                        received_content = True
                        yield content
        except httpx.RequestError as exc:
            raise ProviderError(
                message=f"Request to {self._provider_name} failed: {exc}",
                provider=self._provider_name,
                model=model,
            ) from exc

        if not received_content:
            raise ProviderError(
                message=f"{self._provider_name} returned an empty streaming response",
                provider=self._provider_name,
                model=model,
            )

        logger.info(
            "provider_stream_response",
            provider=self._provider_name,
            model=model,
            latency_ms=int((time.monotonic() - started_at) * 1000),
        )

    def extract_usage(self, response: dict[str, Any]) -> dict[str, int]:
        """Extract token usage from an OpenAI-compatible response.

        Returns dict with keys: input_tokens, output_tokens.
        Returns zeros if usage data is missing.
        """
        usage = response.get("usage", {}) or {}
        return {
            "input_tokens": int(usage.get("prompt_tokens", 0) or 0),
            "output_tokens": int(usage.get("completion_tokens", 0) or 0),
        }

    def extract_content(self, response: dict[str, Any]) -> str:
        """Extract the assistant message content from a compatible response.

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
                    f"Unexpected {self._provider_name} response structure "
                    "while extracting content"
                ),
                provider=self._provider_name,
                model=str(response.get("model", "")),
            ) from exc
