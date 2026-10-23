"""Extraction service: call provider and validate LLM output against resume schema."""

from dataclasses import dataclass

from src.config import ModelRef
from src.llm.prompts import build_parse_messages
from src.llm.schemas import ResumeData
from src.llm.validation import validate_llm_response
from src.logging import get_logger
from src.providers.factory import get_provider

logger = get_logger("llm.service")


@dataclass
class LLMExtractionResult:
    success: bool
    data: ResumeData | None  # Populated on success
    validation_errors: list[str]  # Populated on validation failure
    raw_response: str  # Raw LLM output for debugging
    input_tokens: int
    output_tokens: int


async def extract_resume_data(
    text: str,
    model_ref: ModelRef,
) -> LLMExtractionResult:
    """Extract structured resume data from text using the given model.

    Builds messages, calls the provider, extracts content and usage from the
    response, validates against ResumeData schema, and returns a result.
    Does not catch ProviderError — it propagates to the caller.
    """
    model_str = f"{model_ref.provider}/{model_ref.model}"
    logger.info(
        "llm_extraction_started",
        model=model_str,
        text_length=len(text),
    )

    messages = build_parse_messages(text)
    provider = get_provider(model_ref)
    response = await provider.chat(model=model_ref.model, messages=messages)

    content = provider.extract_content(response)
    usage = provider.extract_usage(response)
    input_tokens = usage["input_tokens"]
    output_tokens = usage["output_tokens"]

    validation = validate_llm_response(content)

    if validation.success and validation.data is not None:
        logger.info(
            "llm_extraction_success",
            model=model_str,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )
        return LLMExtractionResult(
            success=True,
            data=validation.data,
            validation_errors=[],
            raw_response=content,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
        )

    logger.warn(
        "llm_extraction_validation_failed",
        model=model_str,
        errors=validation.errors,
    )
    return LLMExtractionResult(
        success=False,
        data=None,
        validation_errors=validation.errors,
        raw_response=content,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
    )
