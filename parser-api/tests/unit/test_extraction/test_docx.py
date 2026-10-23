import pytest

from src.extraction.base import ExtractionError
from src.extraction.docx import extract_docx


def test_extract_docx_paragraphs(docx_with_paragraphs: bytes) -> None:
    result = extract_docx(docx_with_paragraphs, "resume.docx")
    assert result.method == "docx"
    assert result.pages == 1
    assert "John Doe" in result.text
    assert "Software Engineer" in result.text
    assert result.char_count > 0
    assert result.word_count > 0


def test_extract_docx_tables(docx_with_tables: bytes) -> None:
    result = extract_docx(docx_with_tables, "tables.docx")
    assert result.method == "docx"
    assert "Python" in result.text
    assert "FastAPI" in result.text
    assert "Docker" in result.text
    assert "PostgreSQL" in result.text


def test_extract_docx_paragraphs_and_tables(docx_with_both: bytes) -> None:
    result = extract_docx(docx_with_both, "both.docx")
    assert result.method == "docx"
    assert "Jane Smith" in result.text
    assert "Skill A" in result.text
    assert "Skill B" in result.text


def test_extract_docx_empty(docx_empty: bytes) -> None:
    result = extract_docx(docx_empty, "empty.docx")
    assert result.text == ""
    assert result.char_count == 0


def test_extract_docx_corrupt_raises_extraction_error() -> None:
    with pytest.raises(ExtractionError):
        extract_docx(b"not a docx file", "corrupt.docx")
