from pydantic import BaseModel, Field

from src.llm.schemas import ResumeData

# -- Request schemas --


class ParseOptions(BaseModel):
    parse_models: str | None = Field(
        default=None,
        description=(
            "Override the default parse model chain. Comma-separated, "
            "provider-prefixed entries tried left to right "
            "(e.g. 'openrouter/google/gemini-flash-1.5,openrouter/openai/gpt-4o-mini')"
        ),
    )
    ocr_models: str | None = Field(
        default=None,
        description=(
            "Override the default OCR model chain. Comma-separated, "
            "provider-prefixed entries tried left to right. "
            "Set to 'none' to skip OCR for this request "
            "(e.g. 'openrouter/google/gemini-flash-1.5')"
        ),
    )
    ocr: str = Field(
        default="auto",
        pattern="^(auto|force|skip)$",
        description="OCR preference: 'auto' (detect), 'force' (always), 'skip' (never)",
    )


# -- Response schemas --


class UsageEntry(BaseModel):
    step: str
    model: str
    input_tokens: int
    output_tokens: int


class ParseMetadata(BaseModel):
    extraction_method: str = Field(
        description="How text was extracted: 'algorithmic', 'ocr_base', 'ocr_advanced'"
    )
    ocr_used: bool
    pages: int
    processing_time_ms: int
    usage: list[UsageEntry] = Field(default_factory=list)


class ParseResponse(BaseModel):
    success: bool
    data: ResumeData | None = Field(
        default=None,
        description="Structured resume data. None on failure.",
    )
    metadata: ParseMetadata
    error: str | None = None
