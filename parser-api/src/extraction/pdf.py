import fitz

from src.extraction.base import ExtractionError, ExtractionResult
from src.logging import get_logger

logger = get_logger(__name__)


def extract_pdf(content: bytes, filename: str) -> ExtractionResult:
    try:
        doc = fitz.open(stream=content, filetype="pdf")
    except Exception as exc:
        logger.warning(
            "extraction_failed",
            method="pdf",
            error=str(exc),
            filename=filename,
        )
        raise ExtractionError(f"Failed to open PDF: {exc}", filename=filename) from exc

    try:
        pages = len(doc)
        page_texts = []
        for page in doc:
            text = page.get_text("text")
            page_texts.append(text)

        full_text = "\n\n".join(page_texts).strip()
    finally:
        doc.close()

    result = ExtractionResult(
        text=full_text,
        pages=pages,
        method="pdf",
        source_filename=filename,
    )

    logger.info(
        "extraction_completed",
        method="pdf",
        pages=result.pages,
        char_count=result.char_count,
        word_count=result.word_count,
        filename=filename,
    )

    return result
