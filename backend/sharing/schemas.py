"""Pydantic models for the sharing feature."""

from datetime import datetime

from pydantic import BaseModel


class ShareResponse(BaseModel):
    slug: str
    created_at: datetime
    expires_at: datetime
    is_active: bool

    @classmethod
    def from_doc(cls, doc: dict) -> "ShareResponse":
        return cls(
            slug=doc["slug"],
            created_at=doc["created_at"],
            expires_at=doc["expires_at"],
            is_active=doc["is_active"],
        )


class PublicApplicationItem(BaseModel):
    role_title: str
    company: str
    current_stage: str
    date_applied: str
    stage_history: list[dict]


class PublicPipelineResponse(BaseModel):
    display_name: str
    stats: dict
    applications: list[dict]
