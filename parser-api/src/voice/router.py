import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, Request
from fastapi.responses import StreamingResponse

from src.auth.dependencies import require_api_key
from src.config import settings
from src.logging import get_logger
from src.rate_limit import limiter
from src.voice.schemas import VoiceRequest
from src.voice.service import stream_voice_answer

logger = get_logger(__name__)
router = APIRouter(prefix="/api/v1/voice", tags=["Voice interview"])


@router.post(
    "/stream",
    response_class=StreamingResponse,
    description="Stream a CV-grounded interview answer as server-sent events.",
    responses={
        401: {"description": "Invalid or missing API key"},
        422: {"description": "Invalid question, history, or profile context"},
        429: {"description": "Rate limit exceeded"},
    },
)
@limiter.limit(lambda: settings.RATE_LIMIT)
async def stream_answer(
    request: Request,
    body: VoiceRequest,
    key_identity: str = Depends(require_api_key),
) -> StreamingResponse:
    logger.info(
        "voice_request_received",
        key_identity=key_identity,
        question_length=len(body.question),
        history_turns=len(body.history),
    )

    async def events() -> AsyncIterator[str]:
        try:
            async for delta in stream_voice_answer(body):
                yield f"data: {json.dumps({'type': 'token', 'text': delta})}\n\n"
            yield 'data: {"type":"done"}\n\n'
        except Exception as exc:
            logger.error(
                "voice_generation_failed",
                key_identity=key_identity,
                error_type=type(exc).__name__,
            )
            yield (
                'data: {"type":"error","message":'
                '"The voice assistant could not answer right now. Please try again."}'
                "\n\n"
            )

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    )
