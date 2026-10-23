from fastapi import UploadFile

from src.config import settings
from src.exceptions import FileTooLarge, UnsupportedFileType

ALLOWED_CONTENT_TYPES = {
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "text/markdown",
    "text/plain",
}

ALLOWED_EXTENSIONS = {".pdf", ".docx", ".md", ".txt"}


async def validate_upload(file: UploadFile) -> UploadFile:
    """Validate file type and size before processing."""
    # Check content type
    content_type = file.content_type or ""
    filename = file.filename or ""
    ext = "." + filename.rsplit(".", 1)[-1].lower() if "." in filename else ""

    if content_type not in ALLOWED_CONTENT_TYPES and ext not in ALLOWED_EXTENSIONS:
        raise UnsupportedFileType(content_type or ext or "unknown")

    # Check file size by reading content
    content = await file.read()
    if len(content) > settings.max_file_size_bytes:
        raise FileTooLarge(settings.MAX_FILE_SIZE_MB)

    # Reset file position for downstream consumers
    await file.seek(0)

    return file
