import pytest

from src.extraction.base import ExtractionError
from src.extraction.pdf import extract_pdf


def test_extract_pdf_selectable_text(pdf_with_text: bytes) -> None:
    result = extract_pdf(pdf_with_text, "resume.pdf")
    assert result.method == "pdf"
    assert result.pages == 1
    assert result.char_count > 0
    assert result.word_count > 0
    assert "John Doe" in result.text
    assert result.source_filename == "resume.pdf"


def test_extract_pdf_scanned_returns_empty_text(pdf_scanned: bytes) -> None:
    result = extract_pdf(pdf_scanned, "scanned.pdf")
    assert result.method == "pdf"
    assert result.text == ""
    assert result.char_count == 0
    assert result.word_count == 0


def test_extract_pdf_multi_page(pdf_multi_page: bytes) -> None:
    result = extract_pdf(pdf_multi_page, "multi.pdf")
    assert result.method == "pdf"
    assert result.pages == 3
    assert "Page 1" in result.text
    assert "Page 2" in result.text
    assert "Page 3" in result.text


def test_extract_pdf_corrupt_raises_extraction_error() -> None:
    with pytest.raises(ExtractionError):
        extract_pdf(b"not a pdf at all", "corrupt.pdf")


def test_extract_pdf_empty_zero_pages(pdf_empty: bytes) -> None:
    result = extract_pdf(pdf_empty, "empty.pdf")
    assert result.pages == 0
    assert result.text == ""
    assert result.char_count == 0
    assert result.word_count == 0
