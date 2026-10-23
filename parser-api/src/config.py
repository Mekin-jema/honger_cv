from __future__ import annotations

from dataclasses import dataclass

from pydantic import model_validator
from pydantic_settings import BaseSettings


@dataclass(frozen=True)
class ModelRef:
    """A reference to a specific model on a specific provider.

    Created by parsing a chain entry like ``openrouter/google/gemini-flash-1.5``
    into ``ModelRef(provider="openrouter", model="google/gemini-flash-1.5")``.
    """

    provider: str  # e.g. "openrouter", "anthropic"
    model: str  # e.g. "google/gemini-flash-1.5", "claude-haiku"


# Maps registered provider names to the Settings field names that must be
# non-empty when that provider is referenced in a model chain.
REGISTERED_PROVIDERS: dict[str, list[str]] = {
    "openrouter": ["OPENROUTER_API_KEY"],
    "anthropic": ["ANTHROPIC_API_KEY"],
    "openai": ["OPENAI_API_KEY"],
}


def parse_chain(chain_str: str, field_name: str) -> list[ModelRef]:
    """Parse a comma-separated model chain string into a list of ModelRef.

    Each entry must be in the format ``provider/model_name`` where *provider*
    is a key in :data:`REGISTERED_PROVIDERS`.

    Raises :class:`ValueError` with a descriptive message on any format error.
    """
    refs: list[ModelRef] = []
    for entry in chain_str.split(","):
        entry = entry.strip()
        if not entry:
            raise ValueError(
                f"{field_name}: empty entry in chain "
                "(check for trailing commas or extra whitespace)"
            )
        if "/" not in entry:
            raise ValueError(
                f"{field_name}: entry '{entry}' is missing a provider prefix "
                "(expected format: 'provider/model_name')"
            )
        provider, model = entry.split("/", 1)
        if provider not in REGISTERED_PROVIDERS:
            raise ValueError(
                f"{field_name}: unknown provider '{provider}' "
                f"in entry '{entry}'. "
                f"Registered providers: "
                f"{', '.join(sorted(REGISTERED_PROVIDERS))}"
            )
        refs.append(ModelRef(provider=provider, model=model))
    return refs


class Settings(BaseSettings):
    # Runtime environment
    ENVIRONMENT: str = "local"
    SHOW_DOCS_ENVIRONMENTS: str = "local,staging"

    # Auth
    AUTH_PROVIDER: str = "env"
    API_KEYS: str = ""
    RATE_LIMIT: str = "60/minute"

    # Provider credentials (only configure providers referenced in model chains)
    OPENROUTER_API_KEY: str = ""
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    ANTHROPIC_API_KEY: str = ""
    OPENAI_API_KEY: str = ""

    # Model chains — ordered left to right, provider prefix required.
    # Format: provider/model_name (comma-separated for fallback chain).
    # OCR accepts "none" or empty to disable OCR entirely.
    DEFAULT_OCR_MODELS: str = (
        "openrouter/google/gemini-flash-1.5,openrouter/google/gemini-pro-vision"
    )
    DEFAULT_PARSE_MODELS: str = (
        "openrouter/google/gemini-flash-1.5,openrouter/openai/gpt-4o-mini"
    )

    # Limits
    MAX_FILE_SIZE_MB: int = 10
    REQUEST_TIMEOUT_SECONDS: int = 60
    LOG_LEVEL: str = "info"

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}

    @model_validator(mode="after")
    def _validate_model_chains(self) -> Settings:
        """Validate model chain syntax at startup.

        Checks format only — credential validation is deferred to
        :meth:`validate_provider_credentials` so that test environments
        without real API keys can still construct Settings.
        """
        # Rule 1 & 4: DEFAULT_PARSE_MODELS must not be empty or "none"
        parse_raw = self.DEFAULT_PARSE_MODELS.strip()
        if not parse_raw or parse_raw.lower() == "none":
            raise ValueError(
                "DEFAULT_PARSE_MODELS is required and cannot be 'none' — "
                "at least one parse model must be configured"
            )

        # Rule 2 & 5: validate parse chain entries
        parse_chain(parse_raw, "DEFAULT_PARSE_MODELS")

        # Validate OCR chain (allow "none" or empty → skip OCR)
        ocr_raw = self.DEFAULT_OCR_MODELS.strip()
        if ocr_raw and ocr_raw.lower() != "none":
            parse_chain(ocr_raw, "DEFAULT_OCR_MODELS")

        return self

    # -- Parsed chain accessors -------------------------------------------

    @property
    def ocr_model_chain(self) -> list[ModelRef]:
        """Parsed OCR model chain. Empty list means OCR is disabled."""
        raw = self.DEFAULT_OCR_MODELS.strip()
        if not raw or raw.lower() == "none":
            return []
        return parse_chain(raw, "DEFAULT_OCR_MODELS")

    @property
    def parse_model_chain(self) -> list[ModelRef]:
        """Parsed parse model chain. Always has at least one entry."""
        return parse_chain(self.DEFAULT_PARSE_MODELS.strip(), "DEFAULT_PARSE_MODELS")

    # -- Startup credential validation ------------------------------------

    def validate_provider_credentials(self) -> None:
        """Validate that all referenced providers have credentials configured.

        Call this at application startup. Raises :class:`ValueError` if any
        required credential is missing or empty.
        """
        all_refs = self.parse_model_chain + self.ocr_model_chain
        checked: set[str] = set()
        for ref in all_refs:
            if ref.provider in checked:
                continue
            for env_var in REGISTERED_PROVIDERS[ref.provider]:
                value = getattr(self, env_var, "")
                if not value:
                    raise ValueError(
                        f"Provider '{ref.provider}' is referenced in model "
                        f"chains but {env_var} is not configured"
                    )
            checked.add(ref.provider)

    # -- Existing helpers -------------------------------------------------

    @property
    def api_keys_list(self) -> list[str]:
        if not self.API_KEYS:
            return []
        return [k.strip() for k in self.API_KEYS.split(",") if k.strip()]

    @property
    def max_file_size_bytes(self) -> int:
        return self.MAX_FILE_SIZE_MB * 1024 * 1024

    @property
    def show_docs(self) -> bool:
        allowed = {
            env.strip().lower()
            for env in self.SHOW_DOCS_ENVIRONMENTS.split(",")
            if env.strip()
        }
        return self.ENVIRONMENT.strip().lower() in allowed


settings = Settings()
