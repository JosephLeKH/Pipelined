"""Pydantic request/response models for contacts endpoints."""

from datetime import datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, EmailStr, Field

ContactRelationship = Literal["recruiter", "referral", "mentor", "peer", "hiring_manager", "other"]

MAX_NAME_LENGTH = 200
MAX_COMPANY_LENGTH = 200
MAX_ROLE_LENGTH = 200
MAX_EMAIL_LENGTH = 254
MAX_NOTES_LENGTH = 2000
MAX_CONTACTS_LIMIT = 100
DEFAULT_CONTACTS_LIMIT = 50


class ContactCreate(BaseModel):
    model_config = ConfigDict(strict=True)

    name: str = Field(min_length=1, max_length=MAX_NAME_LENGTH)
    company: str | None = Field(None, max_length=MAX_COMPANY_LENGTH)
    role: str | None = Field(None, max_length=MAX_ROLE_LENGTH)
    email: EmailStr | None = None
    linkedin_url: AnyHttpUrl | None = None
    notes: str | None = Field(None, max_length=MAX_NOTES_LENGTH)
    relationship: ContactRelationship = "other"
    last_contacted_at: datetime | None = Field(None, strict=False)


class ContactUpdate(BaseModel):
    model_config = ConfigDict(strict=True)

    name: str | None = Field(None, min_length=1, max_length=MAX_NAME_LENGTH)
    company: str | None = Field(None, max_length=MAX_COMPANY_LENGTH)
    role: str | None = Field(None, max_length=MAX_ROLE_LENGTH)
    email: EmailStr | None = None
    linkedin_url: AnyHttpUrl | None = None
    notes: str | None = Field(None, max_length=MAX_NOTES_LENGTH)
    relationship: ContactRelationship | None = None
    last_contacted_at: datetime | None = Field(None, strict=False)


class ContactResponse(BaseModel):
    id: str
    name: str
    company: str | None = None
    role: str | None = None
    email: str | None = None
    linkedin_url: str | None = None
    notes: str | None = None
    relationship: str
    linked_application_ids: list[str] = Field(default_factory=list)
    last_contacted_at: datetime | None = None
    created_at: datetime
    updated_at: datetime

    @classmethod
    def from_doc(cls, doc: dict) -> "ContactResponse":
        return cls(
            id=str(doc["_id"]),
            name=doc["name"],
            company=doc.get("company"),
            role=doc.get("role"),
            email=doc.get("email"),
            linkedin_url=str(doc["linkedin_url"]) if doc.get("linkedin_url") else None,
            notes=doc.get("notes"),
            relationship=doc.get("relationship", "other"),
            linked_application_ids=[str(oid) for oid in doc.get("linked_applications", [])],
            last_contacted_at=doc.get("last_contacted_at"),
            created_at=doc["created_at"],
            updated_at=doc["updated_at"],
        )


class LinkApplicationRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    application_id: str = Field(min_length=1)
