from src.extraction.factory import extract_text


def test_dispatch_pdf_by_content_type(pdf_with_text: bytes) -> None:
    result = extract_text(pdf_with_text, "application/pdf", "resume.pdf")
    assert result.method == "pdf"
    assert result.char_count > 0


def test_dispatch_docx_by_content_type(docx_with_paragraphs: bytes) -> None:
    result = extract_text(
        docx_with_paragraphs,
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "resume.docx",
    )
    assert result.method == "docx"
    assert result.char_count > 0


def test_dispatch_markdown_by_content_type() -> None:
    content = b"# Resume\n\nJohn Doe - Software Engineer"
    result = extract_text(content, "text/markdown", "resume.md")
    assert result.method == "text"
    assert "John Doe" in result.text
    assert result.pages == 1


def test_dispatch_txt_by_content_type() -> None:
    content = b"John Doe\nSoftware Engineer"
    result = extract_text(content, "text/plain", "resume.txt")
    assert result.method == "text"
    assert "John Doe" in result.text


def test_dispatch_by_extension_fallback(pdf_with_text: bytes) -> None:
    result = extract_text(pdf_with_text, "application/octet-stream", "resume.pdf")
    assert result.method == "pdf"


def test_unknown_type_returns_method_none() -> None:
    result = extract_text(b"data", "application/octet-stream", "file.xyz")
    assert result.method == "none"
    assert result.text == ""
    assert result.pages == 0
