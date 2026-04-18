"""Custom fields route handlers."""

from fastapi import APIRouter, Depends, HTTPException

from auth.dependencies import get_verified_user as get_current_user
from custom_fields import service as svc
from custom_fields.schemas import CustomFieldDefinition, CustomFieldsListResponse, CustomFieldsUpdateRequest

router = APIRouter(prefix="/api/custom-fields", tags=["custom-fields"])


@router.get("")
async def list_custom_fields(
    user: dict = Depends(get_current_user),
) -> dict:
    """Get user's custom field definitions."""
    fields = await svc.get_user_custom_fields(user["_id"])
    return {"data": CustomFieldsListResponse(fields=[CustomFieldDefinition(**f) for f in fields])}


@router.post("")
async def update_custom_fields(
    body: CustomFieldsUpdateRequest,
    user: dict = Depends(get_current_user),
) -> dict:
    """Create or update user's custom field definitions."""
    try:
        fields = await svc.update_custom_fields(
            user["_id"],
            [f.model_dump() for f in body.fields]
        )
        return {"data": CustomFieldsListResponse(fields=[CustomFieldDefinition(**f) for f in fields])}
    except ValueError as e:
        raise HTTPException(status_code=400, detail={"error": {"code": "INVALID_FIELD_COUNT", "message": str(e)}})
