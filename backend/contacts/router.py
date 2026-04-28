"""Contact CRUD route handlers."""

from fastapi import APIRouter, Depends, HTTPException, Query  # noqa: F401

from auth.dependencies import get_verified_user as get_current_user
from contacts import service as contact_service
from middleware.tier_check import TierLimitExceeded, check_tier_limit
from contacts.schemas import (
    ContactCreate,
    ContactResponse,
    ContactUpdate,
    LinkApplicationRequest,
    RelationshipSuggestionResponse,
    MAX_CONTACTS_LIMIT,
    DEFAULT_CONTACTS_LIMIT,
)
from contacts.service import ApplicationNotFoundError, ContactNotFoundError, DuplicateContactError

router = APIRouter(prefix="/api/contacts", tags=["contacts"])

TIER_LIMIT_EXCEEDED_DETAIL = {
    "code": "TIER_LIMIT_EXCEEDED",
    "message": "Free plan limit reached. Upgrade to Pro for unlimited access.",
}


@router.post("/", status_code=201)
async def create_contact(
    body: ContactCreate,
    user: dict = Depends(get_current_user),
) -> dict:
    user_id = str(user["_id"])
    try:
        await check_tier_limit("max_contacts", user_id)
    except TierLimitExceeded as exc:
        raise HTTPException(
            status_code=403,
            detail={**TIER_LIMIT_EXCEEDED_DETAIL, "details": {
                "limit_name": exc.resource,
                "current_usage": exc.current_count,
                "max_allowed": exc.max_allowed,
            }},
        )
    try:
        doc = await contact_service.create(user["_id"], body)
    except DuplicateContactError:
        raise HTTPException(status_code=409, detail={"code": "DUPLICATE_CONTACT", "message": "A contact with this email already exists."})
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
    items = [ContactResponse.from_doc(d) for d in docs]
    return {"data": items, "meta": {"total": len(items)}}


CONTACT_NOT_FOUND_DETAIL = {"code": "CONTACT_NOT_FOUND", "message": "Contact not found."}
APPLICATION_NOT_FOUND_DETAIL = {"code": "APPLICATION_NOT_FOUND", "message": "Application not found."}


@router.get("/suggest-type")
async def suggest_relationship_type(
    application_id: str | None = Query(None),
    email: str | None = Query(None),
    user: dict = Depends(get_current_user),
) -> dict:
    suggestion = await contact_service.suggest_relationship_type(
        user_id=user["_id"],
        application_id=application_id,
        email=email,
    )
    return {"data": RelationshipSuggestionResponse(**suggestion)}


@router.get("/{contact_id}")
async def get_contact(
    contact_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    doc = await contact_service.get(user["_id"], contact_id)
    if doc is None:
        raise HTTPException(status_code=404, detail=CONTACT_NOT_FOUND_DETAIL)
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
        raise HTTPException(status_code=404, detail=CONTACT_NOT_FOUND_DETAIL)
    except DuplicateContactError:
        raise HTTPException(status_code=409, detail={"code": "DUPLICATE_CONTACT", "message": "A contact with this email already exists."})
    return {"data": ContactResponse.from_doc(doc)}


@router.delete("/{contact_id}", status_code=204)
async def delete_contact(
    contact_id: str,
    user: dict = Depends(get_current_user),
) -> None:
    try:
        await contact_service.delete(user["_id"], contact_id)
    except ContactNotFoundError:
        raise HTTPException(status_code=404, detail=CONTACT_NOT_FOUND_DETAIL)


@router.patch("/{contact_id}/link")
async def link_application(
    contact_id: str,
    body: LinkApplicationRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        doc = await contact_service.link_application(user["_id"], contact_id, body.application_id)
    except ContactNotFoundError:
        raise HTTPException(status_code=404, detail=CONTACT_NOT_FOUND_DETAIL)
    except ApplicationNotFoundError:
        raise HTTPException(status_code=404, detail=APPLICATION_NOT_FOUND_DETAIL)
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
        raise HTTPException(status_code=404, detail=CONTACT_NOT_FOUND_DETAIL)
    return {"data": ContactResponse.from_doc(doc)}


@router.patch("/{contact_id}/ping")
async def ping_contact(
    contact_id: str,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        doc = await contact_service.ping(user["_id"], contact_id)
    except ContactNotFoundError:
        raise HTTPException(status_code=404, detail=CONTACT_NOT_FOUND_DETAIL)
    return {"data": ContactResponse.from_doc(doc)}
