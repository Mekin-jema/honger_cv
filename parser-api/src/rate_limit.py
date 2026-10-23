"""SlowAPI rate limiter with per-API-key identity."""

from fastapi import Request
from slowapi import Limiter


def _key_func(request: Request) -> str:
    """Extract rate limit key from request state (set by require_api_key)."""
    return getattr(request.state, "key_identity", "anonymous")


limiter = Limiter(key_func=_key_func, headers_enabled=True)
