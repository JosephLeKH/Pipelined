"""Pydantic request/response models for application templates endpoints."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

MAX_TEMPLATE_NAME_LENGTH = 100
MAX_COMPENSATION_LENGTH = 100
MAX_TAGS = 20
MAX_TAG_LENGTH = 50
MAX_TEMPLATES_PER_USER = 10


class TemplateFields(BaseModel):
    model_config = ConfigDict(strict=True)

    company_type: str | None = None
    remote_status: str | None = None
    role_type: str | None = None
    source: str | None = None
    tags: list[str] = Field(default_factory=list, max_length=MAX_TAGS)
    compensation: str | None = Field(None, max_length=MAX_COMPENSATION_LENGTH)


class TemplateCreate(BaseModel):
    model_config = ConfigDict(strict=True)

    name: str = Field(min_length=1, max_length=MAX_TEMPLATE_NAME_LENGTH)
    fields: TemplateFields = Field(default_factory=lambda: TemplateFields())


class TemplateUpdate(BaseModel):
    model_config = ConfigDict(strict=True)

    name: str | None = Field(None, min_length=1, max_length=MAX_TEMPLATE_NAME_LENGTH)
    fields: TemplateFields | None = None


class TemplateResponse(BaseModel):
    id: str
    name: str
    fields: TemplateFields
    created_at: datetime

    @classmethod
    def from_doc(cls, doc: dict) -> "TemplateResponse":
        raw_fields = doc.get("fields", {})
        return cls(
            id=str(doc["_id"]),
            name=doc["name"],
            fields=TemplateFields(
                company_type=raw_fields.get("company_type"),
                remote_status=raw_fields.get("remote_status"),
                role_type=raw_fields.get("role_type"),
                source=raw_fields.get("source"),
                tags=raw_fields.get("tags", []),
                compensation=raw_fields.get("compensation"),
            ),
            created_at=doc["created_at"],
        )
