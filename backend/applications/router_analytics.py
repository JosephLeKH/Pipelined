"""Analytics, export, and report route handlers for applications."""

import structlog
from fastapi import APIRouter, Depends, Query, Request
from fastapi.responses import StreamingResponse

from applications import service_analytics, service_export
from applications.schemas import (
    AnalyticsQuery,
    AnalyticsResponse,
    FunnelStageResult,
    StatsResponse,
    TagCount,
)
from auth.dependencies import get_verified_user as get_current_user
from middleware.rate_limit import RATE_REPORT, get_user_key, limiter

logger = structlog.get_logger()

analytics_router = APIRouter(tags=["applications"])


@analytics_router.get("/stats", status_code=200)
async def get_stats(user: dict = Depends(get_current_user)) -> dict:
    """Return aggregated stats for the current user's applications."""
    user_id = str(user["_id"])
    stats = await service_analytics.compute_stats(user_id)
    return {"data": StatsResponse(**stats)}


@analytics_router.get("/export", status_code=200)
async def export_applications_csv(
    include_archived: bool = Query(default=False),
    user: dict = Depends(get_current_user),
) -> StreamingResponse:
    """Export the current user's applications as a CSV file download."""
    user_id = str(user["_id"])
    csv_content = await service_export.export_applications(user_id, include_archived)
    return StreamingResponse(
        (line + "\n" for line in csv_content.splitlines()),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=applications.csv"},
    )


@analytics_router.get("/report", status_code=200)
@limiter.limit(RATE_REPORT, key_func=get_user_key)
async def download_pipeline_report(
    request: Request,
    user: dict = Depends(get_current_user),
) -> StreamingResponse:
    """Generate and download the user's pipeline as a PDF report."""
    user_id = str(user["_id"])
    pdf_bytes = await service_export.generate_pdf_report(user_id)
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={"Content-Disposition": "attachment; filename=pipeline-report.pdf"},
    )


@analytics_router.get("/analytics", status_code=200)
async def get_analytics(
    query: AnalyticsQuery = Depends(),
    user: dict = Depends(get_current_user),
) -> dict:
    """Return aggregated analytics data: applications by week, stage funnel, response rate by month, top companies."""
    user_id = str(user["_id"])
    analytics = await service_analytics.get_analytics(user_id, query.days)
    return {"data": AnalyticsResponse(**analytics)}


@analytics_router.get("/funnel", status_code=200)
async def get_funnel(
    user: dict = Depends(get_current_user),
) -> dict:
    """Return per-stage funnel metrics ordered by the user's default_stages."""
    user_id = str(user["_id"])
    stages = await service_analytics.get_funnel(user_id)
    return {"data": [FunnelStageResult(**s) for s in stages]}


@analytics_router.get("/tags", status_code=200)
async def get_user_tags(
    user: dict = Depends(get_current_user),
) -> dict:
    """Return all tags used by the current user, sorted by application count descending."""
    user_id = str(user["_id"])
    tags = await service_analytics.get_user_tags(user_id)
    return {"data": {"tags": [TagCount(**t) for t in tags]}}
