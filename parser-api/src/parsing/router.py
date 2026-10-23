import time

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    Request,
    Response,
    UploadFile,
)
from pydantic import ValidationError

from src.auth.dependencies import require_api_key
from src.config import parse_chain as parse_chain_fn
from src.config import settings
from src.logging import get_logger
from src.parsing.dependencies import validate_upload
from src.parsing.schemas import ParseOptions, ParseResponse
from src.pipeline.service import run_pipeline
from src.rate_limit import limiter

logger = get_logger(__name__)

router = APIRouter(prefix="/api/v1", tags=["Parsing"])
UPLOAD_FILE_PARAM = File(..., description="Resume file (PDF, DOCX, MD, or TXT)")
OPTIONS_FORM_PARAM = Form(
    default=None,
    description="JSON string with parse options (parse_models, ocr_models, ocr)",
)


@router.post(
    "/parse",
    response_model=ParseResponse,
    description="Parse a resume file and return structured data.",
    responses={
        400: {"description": "Invalid file type or corrupt file"},
        401: {"description": "Invalid or missing API key"},
        413: {"description": "File exceeds size limit"},
        422: {"description": "Invalid request or options"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit(lambda: settings.RATE_LIMIT)
async def parse_resume(
    request: Request,
    response: Response,
    file: UploadFile = UPLOAD_FILE_PARAM,
    options: str | None = OPTIONS_FORM_PARAM,
    key_identity: str = Depends(require_api_key),
) -> ParseResponse:
    start_time = time.monotonic()

    parse_options = ParseOptions()
    if options:
        try:
            parse_options = ParseOptions.model_validate_json(options)
        except ValidationError as e:
            raise HTTPException(
                status_code=422,
                detail=e.errors(),
            ) from e

    await validate_upload(file)

    filename = file.filename or "unknown"
    content_type = file.content_type or "unknown"

    logger.info(
        "parse_request_received",
        key_identity=key_identity,
        filename=filename,
        content_type=content_type,
        parse_models=parse_options.parse_models,
        ocr_models=parse_options.ocr_models,
        ocr=parse_options.ocr,
    )

    content = await file.read()

    p_chain = (
        parse_chain_fn(parse_options.parse_models, "parse_models")
        if parse_options.parse_models
        else settings.parse_model_chain
    )

    ocr_models_raw = parse_options.ocr_models
    if ocr_models_raw and ocr_models_raw.strip().lower() == "none":
        o_chain = []
    elif ocr_models_raw:
        o_chain = parse_chain_fn(ocr_models_raw, "ocr_models")
    else:
        o_chain = settings.ocr_model_chain

    result = await run_pipeline(
        content=content,
        content_type=content_type,
        filename=filename,
        parse_chain=p_chain,
        ocr_chain=o_chain,
        ocr_preference=parse_options.ocr,
    )

    elapsed_ms = int((time.monotonic() - start_time) * 1000)
    result.metadata.processing_time_ms = elapsed_ms

    logger.info(
        "parse_request_completed",
        key_identity=key_identity,
        filename=filename,
        extraction_method=result.metadata.extraction_method,
        processing_time_ms=elapsed_ms,
    )

    return ParseResponse(
        success=result.success,
        data=result.data,
        metadata=result.metadata,
        error=result.error,
    )
