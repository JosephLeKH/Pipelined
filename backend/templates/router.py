"""Route handlers for application templates endpoints."""

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_verified_user as get_current_user
from templates import service as template_service
from templates.schemas import (
    MAX_TEMPLATES_PER_USER,
    TemplateCreate,
    TemplateResponse,
    TemplateUpdate,
)
from templates.service import TemplateLimitError, TemplateNotFoundError

router = APIRouter(prefix="/api/templates", tags=["templates"])

TEMPLATE_LIMIT_DETAIL = {
    "code": "TEMPLATE_LIMIT_EXCEEDED",
    "message": f"Maximum of {MAX_TEMPLATES_PER_USER} templates allowed per user.",
}
TEMPLATE_NOT_FOUND_DETAIL = {
    "code": "TEMPLATE_NOT_FOUND",
    "message": "Template not found.",
}


@router.post("/", status_code=201)
async def create_template(
    body: TemplateCreate,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        doc = await template_service.create(user["_id"], body)
    except TemplateLimitError:
        raise HTTPException(status_code=400, detail=TEMPLATE_LIMIT_DETAIL)
    return {"data": TemplateResponse.from_doc(doc)}


@router.get("/")
async def list_templates(
    user: dict = Depends(get_current_user),
) -> dict:
    docs = await template_service.list_templates(user["_id"])
    return {"data": [TemplateResponse.from_doc(d) for d in docs]}


@router.patch("/{template_id}")
async def update_template(
    template_id: str,
    body: TemplateUpdate,
    user: dict = Depends(get_current_user),
) -> dict:
    try:
        doc = await template_service.update(user["_id"], template_id, body)
    except TemplateNotFoundError:
        raise HTTPException(status_code=404, detail=TEMPLATE_NOT_FOUND_DETAIL)
    return {"data": TemplateResponse.from_doc(doc)}


@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: str,
    user: dict = Depends(get_current_user),
) -> None:
    try:
        await template_service.delete(user["_id"], template_id)
    except TemplateNotFoundError:
        raise HTTPException(status_code=404, detail=TEMPLATE_NOT_FOUND_DETAIL)
