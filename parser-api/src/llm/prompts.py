"""Prompt templates for resume extraction."""

from typing import Any

from src.llm.schemas import get_resume_json_schema

SYSTEM_PROMPT = """You are a resume parser. Extract structured data from the provided resume text.

Rules:
- Return ONLY valid JSON matching the schema below. No markdown, no explanation, no extra text.
- Extract all information present in the resume. Do not invent or assume information.
- If a field is not present in the resume, use null for optional fields or an empty list for list fields.
- Dates should be preserved as they appear in the resume (e.g. "Jan 2023", "2023", "Present").
- For skills, group by category when the resume uses categories. If no categories, use a single group with category null.

JSON Schema:
{schema}"""


def build_parse_messages(text: str) -> list[dict[str, Any]]:
    """Build chat messages for resume text extraction.

    Returns a list of messages in OpenAI-compatible format:
    - System message with schema and instructions
    - User message with the resume text
    """
    schema = get_resume_json_schema()
    system_content = SYSTEM_PROMPT.format(schema=schema)
    return [
        {"role": "system", "content": system_content},
        {
            "role": "user",
            "content": (
                f"Parse the following resume and return structured JSON:\n\n{text}"
            ),
        },
    ]
