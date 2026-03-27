"""Pydantic request/response models for calendar event endpoints."""

import datetime as dt
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ValidEventType = Literal[
    "phone_screen",
    "technical",
    "onsite",
    "behavioral",
    "offer",
    "other",
]

MAX_NOTES_LENGTH = 1000
MAX_TITLE_LENGTH = 200


class EventCreate(BaseModel):
    model_config = ConfigDict(strict=True)

    application_id: str
    event_type: ValidEventType
    date: dt.date
    time: dt.time | None = None
    notes: str | None = Field(None, max_length=MAX_NOTES_LENGTH)
    title: str | None = Field(None, max_length=MAX_TITLE_LENGTH)


class EventUpdate(BaseModel):
    model_config = ConfigDict(strict=True)

    event_type: ValidEventType | None = None
    date: dt.date | None = None
    time: dt.time | None = None
    notes: str | None = Field(None, max_length=MAX_NOTES_LENGTH)
    title: str | None = Field(None, max_length=MAX_TITLE_LENGTH)


class EventResponse(BaseModel):
    id: str
    application_id: str
    event_type: str
    date: dt.date
    time: dt.time | None = None
    notes: str | None = None
    title: str | None = None
    company: str | None = None
    role_title: str | None = None

    @classmethod
    def from_doc(cls, doc: dict) -> "EventResponse":
        return cls(
            id=str(doc["_id"]),
            application_id=str(doc["application_id"]),
            event_type=doc["event_type"],
            date=doc["date"],
            time=doc.get("time"),
            notes=doc.get("notes"),
            title=doc.get("title"),
            company=doc.get("company"),
            role_title=doc.get("role_title"),
        )
