"""Pydantic response models for notifications endpoints."""

from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    body: str
    action_url: str | None = None
    read: bool
    created_at: datetime

    @classmethod
    def from_doc(cls, doc: dict) -> "NotificationResponse":
        return cls(
            id=str(doc["_id"]),
            type=doc["type"],
            title=doc["title"],
            body=doc["body"],
            action_url=doc.get("action_url"),
            read=doc.get("read", False),
            created_at=doc["created_at"],
        )


class UnreadCountResponse(BaseModel):
    count: int
