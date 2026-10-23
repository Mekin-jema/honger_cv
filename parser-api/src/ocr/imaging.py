"""PDF page to PNG image conversion using PyMuPDF."""

import fitz

from src.extraction.base import ExtractionError
from src.logging import get_logger

logger = get_logger("ocr_imaging")

# Default DPI: high enough for vision models to read text, reasonable image size.
DEFAULT_DPI = 200
# Fallback filename when raising ExtractionError (no filename in API).
DOCUMENT_FILENAME = "document"


def pdf_pages_to_images(content: bytes, dpi: int = DEFAULT_DPI) -> list[bytes]:
    """Render each PDF page as a PNG image.

    Opens the PDF from bytes, renders each page at the given DPI to a pixmap,
    converts to PNG bytes, and returns a list of PNG buffers (one per page).

    Edge cases:
        - Empty PDF (0 pages) → returns [].
        - Encrypted or corrupt PDF → raises ExtractionError.

    Parameters
    ----------
    content : bytes
        Raw PDF file content.
    dpi : int, optional
        Resolution for rendering (default 200).

    Returns
    -------
    list[bytes]
        One PNG byte buffer per page.

    Raises
    ------
    ExtractionError
        If the PDF cannot be opened (encrypted, corrupt, or invalid).
    """
    try:
        doc = fitz.open(stream=content, filetype="pdf")
    except Exception as exc:
        logger.warning(
            "ocr_imaging_failed",
            error=str(exc),
        )
        raise ExtractionError(
            f"Failed to open PDF for imaging: {exc}",
            filename=DOCUMENT_FILENAME,
        ) from exc

    try:
        images: list[bytes] = []
        for page in doc:
            pix = page.get_pixmap(dpi=dpi)
            images.append(pix.tobytes("png"))

        total_bytes = sum(len(img) for img in images)
        logger.info(
            "ocr_imaging",
            pages=len(images),
            total_image_bytes=total_bytes,
        )
        return images
    finally:
        doc.close()
