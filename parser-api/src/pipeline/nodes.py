"""Pipeline node functions — one per processing step."""

from typing import Any

from src.config import ModelRef
from src.extraction.base import ExtractionError
from src.extraction.factory import extract_text
from src.extraction.quality import score_text_quality
from src.llm.service import LLMExtractionResult, extract_resume_data
from src.logging import get_logger
from src.ocr.service import ocr_extract
from src.parsing.schemas import UsageEntry
from src.pipeline.state import PipelineState
from src.providers.exceptions import ProviderError

logger = get_logger("pipeline")


def extract_node(state: PipelineState) -> dict[str, Any]:
    """Algorithmic text extraction from the uploaded file."""
    try:
        result = extract_text(
            state["content"], state["content_type"], state["filename"]
        )
    except ExtractionError as exc:
        logger.error("node_extract_error", error=str(exc), filename=state["filename"])
        return {"error": str(exc), "text": ""}

    quality = score_text_quality(result)

    logger.info(
        "node_extract",
        method=result.method,
        pages=result.pages,
        text_sufficient=quality.is_sufficient,
    )

    return {
        "extraction_result": result,
        "text_quality": quality,
        "text": result.text,
    }


def check_ocr_node(state: PipelineState) -> dict[str, Any]:
    """Routing node — the conditional edge decides the next step."""
    return {}


async def ocr_node(state: PipelineState) -> dict[str, Any]:
    """Run OCR via vision model, retrying through the OCR chain on failure."""
    ocr_chain: list[ModelRef] = state["ocr_chain"]
    current_index: int = state.get("current_ocr_index", 0)
    usage_entries: list[UsageEntry] = []

    while current_index < len(ocr_chain):
        model_ref = ocr_chain[current_index]
        model_str = f"{model_ref.provider}/{model_ref.model}"

        try:
            logger.info("node_ocr", model=model_str)
            result = await ocr_extract(state["content"], model_ref)

            usage_entries.append(
                UsageEntry(
                    step="ocr",
                    model=model_ref.model,
                    input_tokens=result.input_tokens,
                    output_tokens=result.output_tokens,
                )
            )

            logger.info(
                "node_ocr_complete",
                model=model_str,
                text_length=len(result.text),
            )

            return {
                "ocr_text": result.text,
                "ocr_attempted": True,
                "usage": usage_entries,
                "current_ocr_index": current_index,
            }
        except ProviderError as exc:
            logger.warning("node_ocr_error", model=model_str, error=str(exc))
            usage_entries.append(
                UsageEntry(
                    step="ocr",
                    model=model_ref.model,
                    input_tokens=0,
                    output_tokens=0,
                )
            )
            current_index += 1

    logger.warning("node_ocr_chain_exhausted")
    return {
        "ocr_text": None,
        "ocr_attempted": True,
        "usage": usage_entries,
        "current_ocr_index": current_index,
    }


def check_ocr_quality_node(state: PipelineState) -> dict[str, Any]:
    """Use OCR text if it is longer than the algorithmic extraction."""
    ocr_text = state.get("ocr_text")
    current_text = state.get("text", "")

    if ocr_text and len(ocr_text) > len(current_text):
        logger.info(
            "node_ocr_quality",
            using_ocr=True,
            ocr_length=len(ocr_text),
            original_length=len(current_text),
        )
        return {"text": ocr_text}

    logger.info(
        "node_ocr_quality",
        using_ocr=False,
        ocr_length=len(ocr_text) if ocr_text else 0,
        original_length=len(current_text),
    )
    return {}


async def parse_node(state: PipelineState) -> dict[str, Any]:
    """LLM structured extraction using the current model in the parse chain."""
    if state.get("error"):
        return {}

    parse_chain: list[ModelRef] = state["parse_chain"]
    current_index: int = state.get("current_parse_index", 0)
    model_ref = parse_chain[current_index]
    model_str = f"{model_ref.provider}/{model_ref.model}"

    try:
        logger.info("node_parse", model=model_str, attempt=current_index + 1)
        result = await extract_resume_data(state["text"], model_ref)

        usage_entry = UsageEntry(
            step="parse",
            model=model_ref.model,
            input_tokens=result.input_tokens,
            output_tokens=result.output_tokens,
        )

        if result.success:
            logger.info("node_parse_complete", model=model_str, success=True)
        else:
            logger.warning(
                "node_parse_complete",
                model=model_str,
                success=False,
                errors=len(result.validation_errors),
            )

        return {"parse_result": result, "usage": [usage_entry]}

    except ProviderError as exc:
        logger.warning("node_parse_error", model=model_str, error=str(exc))
        usage_entry = UsageEntry(
            step="parse",
            model=model_ref.model,
            input_tokens=0,
            output_tokens=0,
        )
        return {
            "parse_result": LLMExtractionResult(
                success=False,
                data=None,
                validation_errors=[str(exc)],
                raw_response="",
                input_tokens=0,
                output_tokens=0,
            ),
            "usage": [usage_entry],
        }


def check_parse_node(state: PipelineState) -> dict[str, Any]:
    """Routing node — evaluate parse result and decide next step."""
    if state.get("error"):
        return {}

    parse_result = state.get("parse_result")
    if parse_result is None:
        return {"error": "No parse result available"}

    if parse_result.success and parse_result.data is not None:
        return {"resume_data": parse_result.data}

    parse_chain: list[ModelRef] = state["parse_chain"]
    current_index: int = state.get("current_parse_index", 0)

    if current_index + 1 < len(parse_chain):
        next_ref = parse_chain[current_index + 1]
        logger.info(
            "node_parse_retry",
            model=f"{next_ref.provider}/{next_ref.model}",
            attempt=current_index + 2,
        )
        return {"current_parse_index": current_index + 1}

    errors = parse_result.validation_errors
    error_msg = f"All parse models exhausted. Last errors: {'; '.join(errors)}"
    logger.error("node_parse_chain_exhausted", error=error_msg)
    return {"error": error_msg}
