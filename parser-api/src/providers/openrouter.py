from src.providers.openai_compatible import OpenAICompatibleProvider


class OpenRouterProvider(OpenAICompatibleProvider):
    def __init__(self, api_key: str, base_url: str) -> None:
        super().__init__(
            api_key=api_key,
            base_url=base_url,
            provider_name="openrouter",
            extra_headers={
                "HTTP-Referer": "https://github.com/yourorg/resume-parser-api",
                "X-Title": "resume-parser-api",
            },
        )
