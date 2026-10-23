from src.extraction.base import ExtractionResult
from src.extraction.docx import extract_docx
from src.extraction.pdf import extract_pdf
from src.logging import get_logger

logger = get_logger(__name__)

_MIME_MAP: dict[str, str] = {
    "application/pdf": "pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
    "text/markdown": "text",
    "text/plain": "text",
}

_EXT_MAP: dict[str, str] = {
    ".pdf": "pdf",
    ".docx": "docx",
    ".md": "text",
    ".txt": "text",
}


def _read_text(content: bytes, filename: str) -> ExtractionResult:
    text = content.decode("utf-8", errors="replace")
    return ExtractionResult(
        text=text,
        pages=1,
        method="text",
        source_filename=filename,
    )


def extract_text(content: bytes, content_type: str, filename: str) -> ExtractionResult:
    ext = ""
    if "." in filename:
        ext = "." + filename.rsplit(".", 1)[-1].lower()

    kind = _MIME_MAP.get(content_type) or _EXT_MAP.get(ext)

    if kind == "pdf":
        return extract_pdf(content, filename)
    if kind == "docx":
        return extract_docx(content, filename)
    if kind == "text":
        return _read_text(content, filename)

    logger.info(
        "extraction_skipped",
        content_type=content_type,
        extension=ext,
        filename=filename,
    )
    return ExtractionResult(
        text="",
        pages=0,
        method="none",
        source_filename=filename,
    )
