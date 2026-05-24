"""FastAPI application factory with CORS middleware and lifespan management."""

from contextlib import asynccontextmanager
from typing import AsyncGenerator

import structlog
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

from applications.interview_prep.router import router as interview_prep_router
from applications.resume_insights.router import router as resume_insights_router
from email_integration.router import router as email_integration_router
from applications.router import router as applications_router
from contacts.router import router as contacts_router
from custom_fields.router import router as custom_fields_router
from documents.router import router as documents_router
from auth.router import router as auth_router
from auth.resume_router import router as resume_router
from auth.verification_router import router as verification_router
from cal.router import router as calendar_router
from jobs.router import router as jobs_router
from activity.router import router as activity_router
from notifications.router import router as notifications_router
from brief.brief_router import router as brief_router
from saved_searches.router import router as saved_searches_router
from sharing.router import router as sharing_router
from feedback.router import router as feedback_router
from seo.router import router as seo_router
from templates.router import router as templates_router
from jobs.sync import create_scheduler
from config import settings, validate_production_secrets
from database import connect, disconnect, ensure_indexes
from middleware.cache_control import CacheControlMiddleware
from middleware.csrf import CSRFMiddleware
from middleware.rate_limit import limiter
from middleware.security_headers import SecurityHeadersMiddleware

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


def _register_routers(app: FastAPI) -> None:
    """Attach all feature routers to the application."""
    app.include_router(auth_router)
    app.include_router(resume_router)
    app.include_router(verification_router)
    app.include_router(applications_router)
    app.include_router(interview_prep_router)
    app.include_router(resume_insights_router)
    app.include_router(custom_fields_router)
    app.include_router(documents_router)
    app.include_router(calendar_router)
    app.include_router(jobs_router)
    app.include_router(sharing_router)
    app.include_router(contacts_router)
    app.include_router(notifications_router)
    app.include_router(brief_router)
    app.include_router(saved_searches_router)
    app.include_router(activity_router)
    app.include_router(seo_router)
    app.include_router(feedback_router)
    app.include_router(templates_router)
    app.include_router(email_integration_router)


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
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(CacheControlMiddleware)
    app.add_middleware(CSRFMiddleware)
    app.add_middleware(GZipMiddleware, minimum_size=500)

    @app.get("/health")
    async def health() -> dict:
        return {"status": "ok"}

    _register_routers(app)
    return app


app = create_app()
