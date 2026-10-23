"""Validation of raw LLM JSON output against the resume schema."""

import json
import re
from dataclasses import dataclass

from pydantic import ValidationError

from src.llm.schemas import ResumeData


@dataclass
class ValidationResult:
    success: bool
    data: ResumeData | None  # Populated on success
    errors: list[str]  # Populated on failure
    raw_json: str  # The original LLM output for logging


def _strip_markdown_fences(raw: str) -> str:
    """Remove ```json ... ``` code fences if present."""
    text = raw.strip()
    # Opening fence: optional whitespace, ```json (or just ```), rest of line
    if re.match(r"^\s*```(?:json)?\s*$", text.split("\n")[0]):
        lines = text.split("\n")
        text = "\n".join(lines[1:])
    if text.endswith("```"):
        text = text[:-3].rstrip()
    return text.strip()


def _format_validation_errors(exc: ValidationError) -> list[str]:
    """Convert Pydantic errors to human-readable path strings.

    e.g. ('experience', 0, 'start_date') -> "experience[0].start_date: Field required"
    """
    result: list[str] = []
    for err in exc.errors():
        loc = err.get("loc", ())
        # Skip root model name (e.g. 'ResumeData') if present
        parts = [x for x in loc if x != "ResumeData"]
        path = ""
        for p in parts:
            if isinstance(p, int):
                path += f"[{p}]"
            else:
                path += str(p) if not path else f".{p}"
        msg = err.get("msg", "Validation error")
        result.append(f"{path}: {msg}" if path else msg)
    return result


def validate_llm_response(raw_output: str) -> ValidationResult:
    """Parse and validate raw LLM JSON output against ResumeData schema.

    Strips markdown code fences if present, then parses JSON and validates
    with Pydantic. Returns a ValidationResult with success/data or errors.
    """
    stripped = _strip_markdown_fences(raw_output)

    try:
        parsed = json.loads(stripped)
    except json.JSONDecodeError as e:
        return ValidationResult(
            success=False,
            data=None,
            errors=[f"Invalid JSON: {e}"],
            raw_json=raw_output,
        )

    try:
        resume_data = ResumeData.model_validate(parsed)
        return ValidationResult(
            success=True,
            data=resume_data,
            errors=[],
            raw_json=raw_output,
        )
    except ValidationError as e:
        return ValidationResult(
            success=False,
            data=None,
            errors=_format_validation_errors(e),
            raw_json=raw_output,
        )
