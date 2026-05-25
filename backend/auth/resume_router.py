"""Resume upload, download, and delete endpoints."""

import io

import pdfplumber
import structlog
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response

from auth.dependencies import get_current_user
from auth.service import (
    clear_resume_text,
    get_resume_pdf_key,
    save_resume_pdf_key,
    save_resume_text,
)
from storage.spaces_client import (
    SpacesError,
    delete_object,
    download_bytes,
    spaces_configured,
    upload_bytes,
)

logger = structlog.get_logger()

router = APIRouter(prefix="/api/auth", tags=["auth"])

RESUME_MAX_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB
RESUME_CONTENT_TYPE = "application/pdf"


def _resume_key(user_id: str) -> str:
    return f"resumes/{user_id}.pdf"


@router.post("/resume", status_code=200)
async def upload_resume(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
) -> dict:
    """Upload a PDF resume; extract text, persist text on user, and persist PDF to Spaces."""
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

    user_id = str(user["_id"])
    await save_resume_text(user_id, resume_text)

    if spaces_configured():
        key = _resume_key(user_id)
        try:
            await upload_bytes(key, raw, RESUME_CONTENT_TYPE)
            await save_resume_pdf_key(user_id, key)
        except SpacesError as exc:
            logger.warning("resume_pdf_upload_skipped", user_id=user_id, error=str(exc))

    logger.info("resume_uploaded", user_id=user_id, chars=len(resume_text))
    return {"data": {"chars_extracted": len(resume_text)}}


@router.get("/resume", status_code=200)
async def download_resume(user: dict = Depends(get_current_user)) -> Response:
    """Return the user's original uploaded PDF resume from Spaces."""
    user_id = str(user["_id"])
    key = await get_resume_pdf_key(user_id)
    if not key or not spaces_configured():
        raise HTTPException(
            status_code=404,
            detail={"code": "RESUME_NOT_FOUND", "message": "No uploaded resume on file."},
        )

    try:
        data = await download_bytes(key)
    except SpacesError as exc:
        logger.warning("resume_download_failed", user_id=user_id, error=str(exc))
        raise HTTPException(
            status_code=502,
            detail={"code": "STORAGE_ERROR", "message": "Could not retrieve resume."},
        )

    return Response(
        content=data,
        media_type=RESUME_CONTENT_TYPE,
        headers={"Content-Disposition": 'attachment; filename="resume.pdf"'},
    )


@router.delete("/resume", status_code=204)
async def delete_resume(user: dict = Depends(get_current_user)) -> None:
    """Remove the stored resume text and PDF for the current user."""
    user_id = str(user["_id"])
    key = await get_resume_pdf_key(user_id)
    await clear_resume_text(user_id)
    if key and spaces_configured():
        await delete_object(key)
    logger.info("resume_deleted", user_id=user_id)
