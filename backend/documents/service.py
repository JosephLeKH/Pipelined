"""Document storage and retrieval service."""

import base64
from typing import Literal

from bson import ObjectId

from applications.schemas import ALLOWED_DOCUMENT_TYPES, MAX_DOCUMENT_SIZE_BYTES
from database import get_collection

DocumentType = Literal["resume", "cover_letter"]


async def get_document(
    user_id: str, app_id: str, doc_type: DocumentType
) -> dict | None:
    """Retrieve a document (resume or cover_letter) for an application."""
    apps = get_collection("applications")
    doc = await apps.find_one(
        {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
        projection={"documents": 1},
    )
    if not doc or "documents" not in doc:
        return None
    return doc["documents"].get(doc_type)


def _validate_document_content(content_base64: str, content_type: str) -> None:
    """Raise ValueError if content_base64 or content_type fails validation."""
    if len(content_base64) > MAX_DOCUMENT_SIZE_BYTES:
        raise ValueError(
            f"Document exceeds {MAX_DOCUMENT_SIZE_BYTES} bytes (base64 size: {len(content_base64)})"
        )
    if content_type not in ALLOWED_DOCUMENT_TYPES:
        raise ValueError(f"Content type {content_type} not allowed. Allowed: {ALLOWED_DOCUMENT_TYPES}")
    try:
        base64.b64decode(content_base64)
    except Exception as e:
        raise ValueError(f"Invalid base64 content: {e}")


async def update_document(
    user_id: str,
    app_id: str,
    doc_type: DocumentType,
    filename: str,
    content_base64: str,
    content_type: str,
) -> dict | None:
    """Store or update a document on an application."""
    _validate_document_content(content_base64, content_type)

    apps = get_collection("applications")
    result = await apps.update_one(
        {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
        {
            "$set": {
                f"documents.{doc_type}": {
                    "filename": filename,
                    "content_base64": content_base64,
                    "content_type": content_type,
                }
            }
        },
    )

    if result.matched_count == 0:
        return None

    return await get_document(user_id, app_id, doc_type)


async def delete_document(
    user_id: str, app_id: str, doc_type: DocumentType
) -> bool:
    """Delete a document from an application."""
    apps = get_collection("applications")
    result = await apps.update_one(
        {"_id": ObjectId(app_id), "user_id": ObjectId(user_id)},
        {"$unset": {f"documents.{doc_type}": ""}},
    )
    return result.matched_count > 0
