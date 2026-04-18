"""Pydantic models for custom fields."""

from pydantic import BaseModel, Field

FieldType = str  # "text", "date", or "select"


class CustomFieldDefinition(BaseModel):
    """Definition of a custom field."""

    name: str = Field(..., min_length=1, max_length=100)
    field_type: FieldType = Field(..., pattern="^(text|date|select)$")
    options: list[str] | None = Field(None, description="For select type: list of options")

    @property
    def type(self) -> str:
        """Alias for field_type for backward compatibility."""
        return self.field_type


class CustomFieldsListResponse(BaseModel):
    """User's custom field definitions."""

    fields: list[CustomFieldDefinition] = Field(default_factory=list)


class CustomFieldsUpdateRequest(BaseModel):
    """Request to update user's custom field definitions."""

    fields: list[CustomFieldDefinition] = Field(..., max_length=10)
