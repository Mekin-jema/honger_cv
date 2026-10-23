"""Unit tests for model chain parsing and config validation."""

import pytest

from src.config import (
    REGISTERED_PROVIDERS,
    ModelRef,
    Settings,
    parse_chain,
)

# ── parse_chain() ──────────────────────────────────────────────────────


class TestParseChain:
    """Tests for the parse_chain() function."""

    def test_single_entry(self) -> None:
        refs = parse_chain("openrouter/google/gemini-flash-1.5", "TEST")
        assert refs == [
            ModelRef(provider="openrouter", model="google/gemini-flash-1.5")
        ]

    def test_multiple_entries(self) -> None:
        refs = parse_chain(
            "openrouter/google/gemini-flash-1.5,openrouter/openai/gpt-4o-mini",
            "TEST",
        )
        assert refs == [
            ModelRef(provider="openrouter", model="google/gemini-flash-1.5"),
            ModelRef(provider="openrouter", model="openai/gpt-4o-mini"),
        ]

    def test_mixed_providers(self) -> None:
        refs = parse_chain(
            "openrouter/google/gemini-flash-1.5,anthropic/claude-haiku",
            "TEST",
        )
        assert refs == [
            ModelRef(provider="openrouter", model="google/gemini-flash-1.5"),
            ModelRef(provider="anthropic", model="claude-haiku"),
        ]

    def test_strips_whitespace(self) -> None:
        refs = parse_chain(
            " openrouter/google/gemini-flash-1.5 , openrouter/openai/gpt-4o-mini ",
            "TEST",
        )
        assert len(refs) == 2
        assert refs[0] == ModelRef(
            provider="openrouter", model="google/gemini-flash-1.5"
        )
        assert refs[1] == ModelRef(provider="openrouter", model="openai/gpt-4o-mini")

    def test_unknown_provider_raises(self) -> None:
        with pytest.raises(ValueError, match="unknown provider 'fakeprovider'"):
            parse_chain("fakeprovider/some-model", "TEST")

    def test_missing_provider_prefix_raises(self) -> None:
        with pytest.raises(ValueError, match="missing a provider prefix"):
            parse_chain("just-a-model-name", "TEST")

    def test_empty_entry_trailing_comma_raises(self) -> None:
        with pytest.raises(ValueError, match="empty entry in chain"):
            parse_chain("openrouter/google/gemini-flash-1.5,", "TEST")

    def test_empty_entry_leading_comma_raises(self) -> None:
        with pytest.raises(ValueError, match="empty entry in chain"):
            parse_chain(",openrouter/google/gemini-flash-1.5", "TEST")

    def test_empty_entry_double_comma_raises(self) -> None:
        with pytest.raises(ValueError, match="empty entry in chain"):
            parse_chain(
                "openrouter/google/gemini-flash-1.5,,openrouter/openai/gpt-4o-mini",
                "TEST",
            )

    def test_whitespace_only_entry_raises(self) -> None:
        with pytest.raises(ValueError, match="empty entry in chain"):
            parse_chain(
                "openrouter/google/gemini-flash-1.5, ,openrouter/openai/gpt-4o-mini",
                "TEST",
            )

    def test_all_registered_providers_accepted(self) -> None:
        for provider in REGISTERED_PROVIDERS:
            refs = parse_chain(f"{provider}/test-model", "TEST")
            assert refs[0].provider == provider
            assert refs[0].model == "test-model"


# ── ModelRef ────────────────────────────────────────────────────────────


class TestModelRef:
    """Tests for the ModelRef dataclass."""

    def test_frozen(self) -> None:
        ref = ModelRef(provider="openrouter", model="test")
        with pytest.raises(AttributeError):
            ref.provider = "changed"  # type: ignore[misc]

    def test_equality(self) -> None:
        a = ModelRef(provider="openrouter", model="google/gemini-flash-1.5")
        b = ModelRef(provider="openrouter", model="google/gemini-flash-1.5")
        assert a == b

    def test_hashable(self) -> None:
        ref = ModelRef(provider="openrouter", model="test")
        assert hash(ref) is not None
        assert ref in {ref}


# ── Settings validation ────────────────────────────────────────────────


class TestSettingsChainValidation:
    """Tests for model chain syntax validation in Settings.__init__."""

    def _make_settings(self, **overrides: str) -> Settings:
        """Construct Settings with env_file disabled and sensible defaults."""
        defaults = {
            "DEFAULT_PARSE_MODELS": "openrouter/google/gemini-flash-1.5",
            "DEFAULT_OCR_MODELS": "openrouter/google/gemini-flash-1.5",
            "OPENROUTER_API_KEY": "sk-test-key",
        }
        defaults.update(overrides)
        return Settings(**defaults, _env_file=None)  # type: ignore[call-arg]

    def test_valid_parse_chain(self) -> None:
        s = self._make_settings(
            DEFAULT_PARSE_MODELS="openrouter/google/gemini-flash-1.5,openrouter/openai/gpt-4o-mini",
        )
        assert len(s.parse_model_chain) == 2

    def test_valid_ocr_chain(self) -> None:
        s = self._make_settings(
            DEFAULT_OCR_MODELS="openrouter/google/gemini-flash-1.5,openrouter/google/gemini-pro-vision",
        )
        assert len(s.ocr_model_chain) == 2

    def test_ocr_none_returns_empty_chain(self) -> None:
        s = self._make_settings(DEFAULT_OCR_MODELS="none")
        assert s.ocr_model_chain == []

    def test_ocr_none_case_insensitive(self) -> None:
        s = self._make_settings(DEFAULT_OCR_MODELS="None")
        assert s.ocr_model_chain == []

    def test_ocr_empty_returns_empty_chain(self) -> None:
        s = self._make_settings(DEFAULT_OCR_MODELS="")
        assert s.ocr_model_chain == []

    def test_empty_parse_chain_raises(self) -> None:
        with pytest.raises(ValueError, match="DEFAULT_PARSE_MODELS is required"):
            self._make_settings(DEFAULT_PARSE_MODELS="")

    def test_none_parse_chain_raises(self) -> None:
        with pytest.raises(ValueError, match="cannot be 'none'"):
            self._make_settings(DEFAULT_PARSE_MODELS="none")

    def test_invalid_provider_in_parse_chain_raises(self) -> None:
        with pytest.raises(ValueError, match="unknown provider"):
            self._make_settings(DEFAULT_PARSE_MODELS="badprovider/model")

    def test_invalid_provider_in_ocr_chain_raises(self) -> None:
        with pytest.raises(ValueError, match="unknown provider"):
            self._make_settings(DEFAULT_OCR_MODELS="badprovider/model")

    def test_trailing_comma_in_parse_chain_raises(self) -> None:
        with pytest.raises(ValueError, match="empty entry"):
            self._make_settings(
                DEFAULT_PARSE_MODELS="openrouter/google/gemini-flash-1.5,"
            )


# ── Provider credential validation ─────────────────────────────────────


class TestProviderCredentialValidation:
    """Tests for Settings.validate_provider_credentials()."""

    def _make_settings(self, **overrides: str) -> Settings:
        defaults = {
            "DEFAULT_PARSE_MODELS": "openrouter/google/gemini-flash-1.5",
            "DEFAULT_OCR_MODELS": "openrouter/google/gemini-flash-1.5",
            "OPENROUTER_API_KEY": "sk-test-key",
        }
        defaults.update(overrides)
        return Settings(**defaults, _env_file=None)  # type: ignore[call-arg]

    def test_valid_credentials_pass(self) -> None:
        s = self._make_settings(OPENROUTER_API_KEY="sk-valid")
        s.validate_provider_credentials()

    def test_missing_openrouter_key_raises(self) -> None:
        s = self._make_settings(OPENROUTER_API_KEY="")
        with pytest.raises(ValueError, match="OPENROUTER_API_KEY is not configured"):
            s.validate_provider_credentials()

    def test_mixed_providers_validates_all(self) -> None:
        s = self._make_settings(
            DEFAULT_PARSE_MODELS="openrouter/model-a,anthropic/claude-haiku",
            OPENROUTER_API_KEY="sk-or-valid",
            ANTHROPIC_API_KEY="sk-ant-valid",
        )
        s.validate_provider_credentials()

    def test_mixed_providers_missing_one_raises(self) -> None:
        s = self._make_settings(
            DEFAULT_PARSE_MODELS="openrouter/model-a,anthropic/claude-haiku",
            OPENROUTER_API_KEY="sk-or-valid",
            ANTHROPIC_API_KEY="",
        )
        with pytest.raises(ValueError, match="ANTHROPIC_API_KEY is not configured"):
            s.validate_provider_credentials()

    def test_ocr_none_skips_ocr_credential_check(self) -> None:
        s = self._make_settings(
            DEFAULT_OCR_MODELS="none",
            OPENROUTER_API_KEY="sk-valid",
        )
        s.validate_provider_credentials()
