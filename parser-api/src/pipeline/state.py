"""Pipeline state flowing through every LangGraph node."""

import operator
from typing import Annotated

from typing_extensions import TypedDict

from src.config import ModelRef
from src.extraction.base import ExtractionResult
from src.extraction.quality import TextQuality
from src.llm.schemas import ResumeData
from src.llm.service import LLMExtractionResult
from src.parsing.schemas import UsageEntry


class PipelineState(TypedDict, total=False):
    # -- Inputs (set once at pipeline entry) --
    content: bytes
    content_type: str
    filename: str
    parse_chain: list[ModelRef]
    ocr_chain: list[ModelRef]
    ocr_preference: str

    # -- Extraction stage --
    extraction_result: ExtractionResult
    text_quality: TextQuality
    text: str

    # -- OCR stage --
    ocr_attempted: bool
    ocr_text: str | None

    # -- Parse stage --
    parse_result: LLMExtractionResult | None
    resume_data: ResumeData | None

    # -- Tracking --
    usage: Annotated[list[UsageEntry], operator.add]
    current_parse_index: int
    current_ocr_index: int
    error: str | None
