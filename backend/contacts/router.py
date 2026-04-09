"""Contact CRUD route handlers."""

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from contacts import service as contact_service
from contacts.schemas import (
    ContactCreate,
    ContactResponse,
    ContactUpdate,
    LinkApplicationRequest,
    MAX_CONTACTS_LIMIT,
    DEFAULT_CONTACTS_LIMIT,
)
from contacts.service import ApplicationNotFoundError, ContactNotFoundError

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.post("/", status_code=201)
async def create_contact(
    body: ContactCreate,
    user: dict = Depends(get_current_user),
) -> dict:
    doc = await contact_service.create(user["_id"], body)
    return {"data": ContactResponse.from_doc(doc)}


@router.get("/")
async def list_contacts(
    company: str | None = Query(None),
    relationship: str | None = Query(None),
    application_id: str | None = Query(None),
    limit: int = Query(DEFAULT_CONTACTS_LIMIT, ge=1, le=MAX_CONTACTS_LIMIT),
    user: dict = Depends(get_current_user),
) -> dict:
    docs = await contact_service.list_contacts(
        user_id=user["_id"],
        company=company,
        relationship=relationship,
        application_id=application_id,
        limit=limit,
    )
    return {"data": [ContactResponse.from_doc(d) for d in docs]}


@router.get("/{contact_id}")
async def get_contact(
    contact_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    doc = await contact_service.get(user["_id"], contact_id)
    if doc is None:
        raise HTTPException(404, detail={"code": "CONTACT_NOT_FOUND", "message": "Contact not found."})
    return {"data": ContactResponse.from_doc(doc)}


@router.patch("/{contact_id}")
async def update_contact(
    contact_id: str,
    body: ContactUpdate,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        doc = await contact_service.update(user["_id"], contact_id, body)
    except ContactNotFoundError:
        raise HTTPException(404, detail={"code": "CONTACT_NOT_FOUND", "message": "Contact not found."})
    return {"data": ContactResponse.from_doc(doc)}


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: str,
    user: dict = Depends(get_current_user),
) -> None:
    try:
        await contact_service.delete(user["_id"], contact_id)
    except ContactNotFoundError:
        raise HTTPException(404, detail={"code": "CONTACT_NOT_FOUND", "message": "Contact not found."})


@router.patch("/{contact_id}/link")
async def link_application(
    contact_id: str,
    body: LinkApplicationRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        doc = await contact_service.link_application(user["_id"], contact_id, body.application_id)
    except ContactNotFoundError:
        raise HTTPException(404, detail={"code": "CONTACT_NOT_FOUND", "message": "Contact not found."})
    except ApplicationNotFoundError:
        raise HTTPException(404, detail={"code": "APPLICATION_NOT_FOUND", "message": "Application not found."})
    return {"data": ContactResponse.from_doc(doc)}


@router.patch("/{contact_id}/unlink")
async def unlink_application(
    contact_id: str,
    body: LinkApplicationRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        doc = await contact_service.unlink_application(user["_id"], contact_id, body.application_id)
    except ContactNotFoundError:
        raise HTTPException(404, detail={"code": "CONTACT_NOT_FOUND", "message": "Contact not found."})
    return {"data": ContactResponse.from_doc(doc)}


@router.patch("/{contact_id}/ping")
async def ping_contact(
    contact_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        doc = await contact_service.ping(user["_id"], contact_id)
    except ContactNotFoundError:
        raise HTTPException(404, detail={"code": "CONTACT_NOT_FOUND", "message": "Contact not found."})
    return {"data": ContactResponse.from_doc(doc)}
