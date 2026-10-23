"""Pipeline entry point called by the parse router."""

from dataclasses import dataclass
from typing import Any

from src.config import ModelRef
from src.llm.schemas import ResumeData
from src.logging import get_logger
from src.parsing.schemas import ParseMetadata, UsageEntry
from src.pipeline.graph import build_pipeline

logger = get_logger("pipeline.service")

_pipeline: Any = None


def _get_pipeline() -> Any:
    global _pipeline
    if _pipeline is None:
        _pipeline = build_pipeline()
    return _pipeline


@dataclass
class PipelineResult:
    success: bool
    data: ResumeData | None
    metadata: ParseMetadata
    error: str | None


async def run_pipeline(
    content: bytes,
    content_type: str,
    filename: str,
    parse_chain: list[ModelRef],
    ocr_chain: list[ModelRef],
    ocr_preference: str,
) -> PipelineResult:
    """Invoke the LangGraph pipeline and return a structured result."""
    logger.info(
        "pipeline_started",
        filename=filename,
        parse_chain_length=len(parse_chain),
        ocr_chain_length=len(ocr_chain),
        ocr_preference=ocr_preference,
    )

    pipeline = _get_pipeline()

    initial_state = {
        "content": content,
        "content_type": content_type,
        "filename": filename,
        "parse_chain": parse_chain,
        "ocr_chain": ocr_chain,
        "ocr_preference": ocr_preference,
        "usage": [],
        "current_parse_index": 0,
        "current_ocr_index": 0,
        "ocr_attempted": False,
    }

    final_state = await pipeline.ainvoke(initial_state)

    resume_data: ResumeData | None = final_state.get("resume_data")
    error: str | None = final_state.get("error")
    usage: list[UsageEntry] = final_state.get("usage", [])
    extraction_result = final_state.get("extraction_result")
    ocr_attempted: bool = final_state.get("ocr_attempted", False)
    ocr_text: str | None = final_state.get("ocr_text")
    final_text: str = final_state.get("text", "")

    ocr_text_used = (
        ocr_attempted
        and ocr_text is not None
        and len(ocr_text) > 0
        and final_text == ocr_text
    )
    extraction_method = "ocr" if ocr_text_used else "algorithmic"
    pages = extraction_result.pages if extraction_result else 0
    success = resume_data is not None

    metadata = ParseMetadata(
        extraction_method=extraction_method,
        ocr_used=ocr_text_used,
        pages=pages,
        processing_time_ms=0,
        usage=usage,
    )

    logger.info(
        "pipeline_completed",
        success=success,
        total_usage_entries=len(usage),
    )

    return PipelineResult(
        success=success,
        data=resume_data,
        metadata=metadata,
        error=error,
    )
