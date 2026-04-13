"""Resume upload and delete endpoints."""

import io

import pdfplumber
import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from auth.dependencies import get_current_user
from auth.service import clear_resume_text, save_resume_text

logger = structlog.get_logger()

router = APIRouter(prefix="/api/auth", tags=["auth"])

RESUME_MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB
RESUME_CONTENT_TYPE = "application/pdf"


@router.post("/resume", status_code=200)
async def upload_resume(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
) -> dict:
    """Upload a PDF resume; extract text and store it on the user document."""
    if file.content_type != RESUME_CONTENT_TYPE:
        raise HTTPException(
            status_code=400,
            detail={"code": "INVALID_FILE_TYPE", "message": "Only PDF files are accepted."},
        )

    raw = await file.read()
    if len(raw) > RESUME_MAX_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail={"code": "FILE_TOO_LARGE", "message": "Resume must be 2 MB or smaller."},
        )

    try:
        with pdfplumber.open(io.BytesIO(raw)) as pdf:
            pages_text = [page.extract_text() or "" for page in pdf.pages]
        resume_text = "\n".join(pages_text).strip()
    except (ValueError, TypeError, AttributeError) as exc:
        logger.warning("pdf_extraction_failed", error=str(exc), user_id=str(user["_id"]))
        raise HTTPException(
            status_code=422,
            detail={"code": "PDF_PARSE_ERROR", "message": "Could not extract text from PDF."},
        )

    await save_resume_text(str(user["_id"]), resume_text)
    logger.info("resume_uploaded", user_id=str(user["_id"]), chars=len(resume_text))
    return {"data": {"chars_extracted": len(resume_text)}}


@router.delete("/resume", status_code=204)
async def delete_resume(user: dict = Depends(get_current_user)) -> None:
    """Remove the stored resume text for the current user."""
    await clear_resume_text(str(user["_id"]))
    logger.info("resume_deleted", user_id=str(user["_id"]))
