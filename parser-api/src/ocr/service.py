"""OCR service: convert PDF to images and extract text via vision model."""

import time
from dataclasses import dataclass

from src.config import ModelRef
from src.logging import get_logger
from src.ocr.imaging import pdf_pages_to_images
from src.ocr.prompts import build_ocr_messages
from src.providers.factory import get_provider

logger = get_logger("ocr_service")


@dataclass
class OCRResult:
    """Result of OCR extraction from a PDF."""

    text: str
    pages: int
    input_tokens: int
    output_tokens: int


async def ocr_extract(content: bytes, model_ref: ModelRef) -> OCRResult:
    """Extract text from a PDF using a vision model.

    Converts PDF pages to images, builds vision messages, calls the provider,
    and returns extracted text plus token usage. Does not retry or escalate;
    ProviderError propagates to the caller.

    Parameters
    ----------
    content : bytes
        Raw PDF file content.
    model_ref : ModelRef
        Vision model to use (e.g. openrouter/google/gemini-flash-1.5).

    Returns
    -------
    OCRResult
        Extracted text, page count, and token usage.

    Raises
    ------
    ExtractionError
        If the PDF cannot be opened for imaging.
    ProviderError
        If the provider request fails.
    """
    model_str = f"{model_ref.provider}/{model_ref.model}"
    images = pdf_pages_to_images(content)

    if not images:
        logger.info(
            "ocr_request",
            model=model_str,
            pages=0,
        )
        return OCRResult(
            text="",
            pages=0,
            input_tokens=0,
            output_tokens=0,
        )

    logger.info(
        "ocr_request",
        model=model_str,
        pages=len(images),
    )
    messages = build_ocr_messages(images)
    provider = get_provider(model_ref)

    start = time.monotonic()
    response = await provider.chat(model=model_ref.model, messages=messages)
    latency_ms = int((time.monotonic() - start) * 1000)

    content_text = provider.extract_content(response)
    usage = provider.extract_usage(response)
    input_tokens = usage["input_tokens"]
    output_tokens = usage["output_tokens"]

    if not content_text or not content_text.strip():
        logger.warn(
            "ocr_empty_result",
            model=model_str,
            pages=len(images),
            text_length=0,
        )
    else:
        logger.info(
            "ocr_response",
            model=model_str,
            text_length=len(content_text),
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            latency_ms=latency_ms,
        )

    return OCRResult(
        text=content_text,
        pages=len(images),
        input_tokens=input_tokens,
        output_tokens=output_tokens,
    )
