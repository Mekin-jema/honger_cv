"""Unit tests for OCR imaging (PDF to PNG)."""

import pytest

from src.extraction.base import ExtractionError
from src.ocr.imaging import DEFAULT_DPI, pdf_pages_to_images

PNG_MAGIC = b"\x89PNG"


def test_pdf_to_images_returns_png_list(pdf_two_pages: bytes) -> None:
    """Provide a 2-page PDF; result is list of 2 PNG byte buffers."""
    result = pdf_pages_to_images(pdf_two_pages)
    assert isinstance(result, list)
    assert len(result) == 2
    for img in result:
        assert isinstance(img, bytes)
        assert img.startswith(PNG_MAGIC), "each buffer should be PNG (magic bytes)"


def test_pdf_to_images_empty_pdf(pdf_empty: bytes) -> None:
    """Provide a 0-page PDF; result is empty list."""
    result = pdf_pages_to_images(pdf_empty)
    assert result == []


def test_pdf_to_images_corrupt_raises() -> None:
    """Provide invalid bytes; ExtractionError is raised."""
    with pytest.raises(ExtractionError):
        pdf_pages_to_images(b"not a pdf at all")


def test_pdf_to_images_custom_dpi(pdf_two_pages: bytes) -> None:
    """Provide a PDF and dpi=100; images are smaller than with default DPI."""
    images_default = pdf_pages_to_images(pdf_two_pages, dpi=DEFAULT_DPI)
    images_100 = pdf_pages_to_images(pdf_two_pages, dpi=100)
    assert len(images_default) == len(images_100) == 2
    total_default = sum(len(img) for img in images_default)
    total_100 = sum(len(img) for img in images_100)
    assert total_100 < total_default
