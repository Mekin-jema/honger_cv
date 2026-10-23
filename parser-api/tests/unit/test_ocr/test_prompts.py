"""Unit tests for OCR prompt building."""

import base64

from src.ocr.prompts import OCR_PROMPT, build_ocr_messages


def test_build_ocr_messages_structure() -> None:
    """Two image buffers -> one user message with 3 parts (1 text + 2 image_url)."""
    # Minimal PNG-like bytes (real PNG not required for structure test)
    img1 = b"\x89PNG\r\n\x1a\n" + b"x" * 10
    img2 = b"\x89PNG\r\n\x1a\n" + b"y" * 10
    result = build_ocr_messages([img1, img2])
    assert isinstance(result, list)
    assert len(result) == 1
    msg = result[0]
    assert msg["role"] == "user"
    content = msg["content"]
    assert len(content) == 3  # 1 text + 2 image_url
    assert content[0]["type"] == "text"
    assert content[0]["text"] == OCR_PROMPT
    assert content[1]["type"] == "image_url"
    assert "image_url" in content[1]
    assert content[2]["type"] == "image_url"


def test_build_ocr_messages_base64_encoding() -> None:
    """Known image bytes produce data URI with correct base64."""
    known = b"abc"
    result = build_ocr_messages([known])
    content = result[0]["content"]
    image_part = content[1]
    url = image_part["image_url"]["url"]
    assert url.startswith("data:image/png;base64,")
    b64 = url.split(",", 1)[1]
    decoded = base64.standard_b64decode(b64)
    assert decoded == known


def test_build_ocr_messages_empty_images() -> None:
    """Empty image list yields user message with only the text prompt."""
    result = build_ocr_messages([])
    assert len(result) == 1
    assert result[0]["role"] == "user"
    content = result[0]["content"]
    assert len(content) == 1
    assert content[0]["type"] == "text"
    assert content[0]["text"] == OCR_PROMPT
