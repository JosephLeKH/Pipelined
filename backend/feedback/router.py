"""Feedback route handler: submit user feedback."""

import jwt
import structlog
from fastapi import APIRouter, Cookie, Request

from auth.service import ACCESS_TOKEN_TYPE, decode_token
from feedback.schemas import FeedbackRequest
from feedback import service as feedback_service

logger = structlog.get_logger()

router = APIRouter(prefix="/api/feedback", tags=["feedback"])


def _optional_user_id(access_token: str | None) -> str | None:
    """Return the user_id from the access_token cookie if present, else None."""
    if not access_token:
        return None
    try:
        payload = decode_token(access_token)
        if payload.type != ACCESS_TOKEN_TYPE:
            return None
        return payload.sub
    except jwt.InvalidTokenError:
        return None


@router.post("", status_code=201)
async def submit_feedback(
    request: Request,
    body: FeedbackRequest,
    access_token: str | None = Cookie(default=None),
) -> dict:
    """Accept feedback from any visitor; attach user_id if authenticated."""
    user_id = _optional_user_id(access_token)
    doc = await feedback_service.create_feedback(
        message=body.message,
        email=body.email,
        category=body.category,
        page=body.page,
        user_id=user_id,
    )
    logger.info("feedback_submitted", feedback_id=str(doc["_id"]))
    return {"data": {"id": str(doc["_id"]), "message": "Thank you for your feedback!"}}
