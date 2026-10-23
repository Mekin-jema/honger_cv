from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from src.config import settings
from src.health import router as health_router
from src.logging import get_logger, setup_logging
from src.parsing.router import router as parsing_router
from src.rate_limit import limiter

setup_logging()
logger = get_logger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Application lifespan: runs startup validation before serving."""
    settings.validate_provider_credentials()
    logger.info("startup_validation_passed")
    yield


def create_app() -> FastAPI:
    app_config: dict[str, Any] = {
        "title": "Resume Parser API",
        "description": (
            "Parse resumes into structured JSON with a smart extraction pipeline."
        ),
        "version": "0.1.0",
        "lifespan": lifespan,
    }

    if not settings.show_docs:
        app_config.update(
            {
                "openapi_url": None,
                "docs_url": None,
                "redoc_url": None,
            }
        )

    app = FastAPI(**app_config)

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)  # type: ignore[arg-type]
    app.add_middleware(SlowAPIMiddleware)

    app.include_router(health_router)
    app.include_router(parsing_router)

    return app


app = create_app()
