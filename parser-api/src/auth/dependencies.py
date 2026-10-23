from fastapi import Request, Security
from fastapi.security import APIKeyHeader

from src.auth.factory import get_auth_provider
from src.exceptions import AuthenticationError
from src.logging import get_logger

logger = get_logger(__name__)

_api_key_header = APIKeyHeader(name="X-API-Key", auto_error=False)


async def require_api_key(
    request: Request,
    api_key: str | None = Security(_api_key_header),
) -> str:
    """FastAPI dependency that validates the API key from the X-API-Key header.

    Returns the key identity string for use in rate limiting.
    Sets request.state.key_identity for the rate limiter key function.
    """
    if api_key is None:
        logger.warning("request_rejected", reason="missing_api_key")
        raise AuthenticationError("Missing X-API-Key header")

    provider = get_auth_provider()

    if not await provider.validate_key(api_key):
        logger.warning("request_rejected", reason="invalid_api_key")
        raise AuthenticationError("Invalid API key")

    identity = await provider.get_key_identity(api_key)
    request.state.key_identity = identity
    logger.info("request_authenticated", key_identity=identity)
    return identity
