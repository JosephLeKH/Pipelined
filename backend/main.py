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
from config import settings
from database import connect, disconnect, ensure_indexes
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
    """Connect to MongoDB on startup, disconnect on shutdown."""
    logger.info("starting_up")
    await connect()
    logger.info("database_connected")
    await ensure_indexes()
    logger.info("indexes_ensured")
    yield
    await disconnect()
    logger.info("database_disconnected")


def create_app() -> FastAPI:
    """Construct and configure the FastAPI application."""
    app = FastAPI(
        title="Pipelined API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_handler)
    app.add_middleware(SlowAPIMiddleware)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    app.include_router(auth_router)
    app.include_router(applications_router)
    app.include_router(calendar_router)
    app.include_router(jobs_router)

    return app


app = create_app()
