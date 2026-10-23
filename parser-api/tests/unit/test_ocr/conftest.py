import fitz
import pytest


@pytest.fixture
def pdf_two_pages() -> bytes:
    """Minimal 2-page PDF for OCR imaging tests."""
    doc = fitz.open()
    for _ in range(2):
        doc.new_page(width=200, height=200)
    data = doc.tobytes()
    doc.close()
    return data


@pytest.fixture
def pdf_empty() -> bytes:
    """Minimal valid PDF with zero pages."""
    return (
        b"%PDF-1.0\n"
        b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
        b"2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\n"
        b"xref\n0 3\n"
        b"0000000000 65535 f \n"
        b"0000000009 00000 n \n"
        b"0000000052 00000 n \n"
        b"trailer<</Size 3/Root 1 0 R>>\n"
        b"startxref\n95\n%%EOF"
    )
