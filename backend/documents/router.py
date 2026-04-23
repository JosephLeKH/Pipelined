"""Document endpoints for applications."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from auth.dependencies import get_verified_user
from documents import service as svc

router = APIRouter(prefix="/api/applications/{app_id}/documents", tags=["documents"])

DocumentType = Literal["resume", "cover_letter"]


class DocumentUploadRequest(BaseModel):
    filename: str
    content_base64: str
    content_type: str


@router.post("/{doc_type}")
async def upload_document(
    app_id: str,
    doc_type: DocumentType,
    body: DocumentUploadRequest,
    user: dict = Depends(get_verified_user),
) -> dict:
    """Upload or replace a document (resume or cover_letter) for an application."""
    try:
        doc = await svc.update_document(
            user["_id"],
            app_id,
            doc_type,
            body.filename,
            body.content_base64,
            body.content_type,
        )
        if not doc:
            raise HTTPException(status_code=404, detail="Application not found")
        return {"data": {"filename": doc["filename"], "content_type": doc["content_type"]}}
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_DOCUMENT", "message": str(e)}})


@router.get("/{doc_type}")
async def download_document(
    app_id: str,
    doc_type: DocumentType,
    user: dict = Depends(get_verified_user),
) -> dict:
    """Download a document (resume or cover_letter) for an application."""
    doc = await svc.get_document(user["_id"], app_id, doc_type)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    return {
        "data": {
            "filename": doc["filename"],
            "content_base64": doc["content_base64"],
            "content_type": doc["content_type"],
        }
    }


@router.delete("/{doc_type}")
async def delete_document(
    app_id: str,
    doc_type: DocumentType,
    user: dict = Depends(get_verified_user),
) -> dict:
    """Delete a document from an application."""
    success = await svc.delete_document(user["_id"], app_id, doc_type)
    if not success:
        raise HTTPException(status_code=404, detail="Application or document not found")
    return {"data": {"deleted": True}}
