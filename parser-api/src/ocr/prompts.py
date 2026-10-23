"""Vision message construction for OCR."""

import base64
from typing import Any

OCR_PROMPT = (
    "Extract ALL text from the document image(s) below. "
    "Preserve the original structure, headings, bullet points, and formatting "
    "as closely as possible. Return ONLY the extracted text, no commentary or "
    "explanation."
)


def build_ocr_messages(images: list[bytes]) -> list[dict[str, Any]]:
    """Build a single user message with OCR instruction and all page images.

    Each image is inlined as a base64 data URI (image/png). The result is
    a list with one user message, suitable for OpenAI/OpenRouter vision APIs.

    Parameters
    ----------
    images : list[bytes]
        PNG image bytes, one per page.

    Returns
    -------
    list[dict[str, Any]]
        Messages in OpenAI format; one user message with text + image_url parts.
    """
    content: list[dict[str, Any]] = [
        {"type": "text", "text": OCR_PROMPT},
    ]
    for img_bytes in images:
        b64 = base64.standard_b64encode(img_bytes).decode("ascii")
        content.append(
            {
                "type": "image_url",
                "image_url": {"url": f"data:image/png;base64,{b64}"},
            }
        )

    return [
        {
            "role": "user",
            "content": content,
        },
    ]
