"""FastAPI application factory with CORS middleware and lifespan management."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from applications.router import router as applications_router
from auth.router import router as auth_router
from cal.router import router as calendar_router
from jobs.router import router as jobs_router
from jobs.sync import create_scheduler
from config import settings, validate_production_secrets
from database import connect, disconnect, ensure_indexes
from middleware.csrf import CSRFMiddleware
from middleware.rate_limit import limiter

logger = structlog.get_logger()

RATE_LIMIT_EXCEEDED_CODE = "RATE_LIMIT_EXCEEDED"


async def _rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Return a 429 using the standard API error envelope."""
    return JSONResponse(
        status_code=429,
        content={
            "error": {
                "code": RATE_LIMIT_EXCEEDED_CODE,
                "message": f"Rate limit exceeded: {exc.detail}",
            }
        },
    )


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Connect to MongoDB and start the scheduler on startup; reverse on shutdown."""
    logger.info("starting_up")
    validate_production_secrets(settings)
    await connect()
    logger.info("database_connected")
    await ensure_indexes()
    logger.info("indexes_ensured")
    scheduler = create_scheduler()
    scheduler.start()
    logger.info("scheduler_started")
    yield
    scheduler.shutdown()
    logger.info("scheduler_stopped")
    await disconnect()
    logger.info("database_disconnected")


WILDCARD_ORIGIN = "*"


def _get_cors_origins() -> list[str]:
    """Return CORS origins, stripping wildcards unless DEBUG is enabled."""
    origins = settings.allowed_origins
    if not settings.debug and WILDCARD_ORIGIN in origins:
        logger.warning("wildcard_cors_origin_blocked_in_production")
        return [o for o in origins if o != WILDCARD_ORIGIN]
    return origins


def create_app(*, testing: bool = False) -> FastAPI:
    """Construct and configure the FastAPI application."""
    app = FastAPI(
        title="Pipelined API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
    if not testing:
        app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=_get_cors_origins(),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(CSRFMiddleware)

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    app.include_router(auth_router)
    app.include_router(applications_router)
    app.include_router(calendar_router)
    app.include_router(jobs_router)

    return app


app = create_app()
