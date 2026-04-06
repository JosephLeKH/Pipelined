"""Pydantic request/response models for calendar event endpoints."""

import datetime as dt
from typing import Literal

from pydantic import BaseModel, Field

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
    application_id: str
    event_type: ValidEventType
    date: dt.date
    time: dt.time | None = None
    notes: str | None = Field(None, max_length=MAX_NOTES_LENGTH)
    title: str | None = Field(None, max_length=MAX_TITLE_LENGTH)


class EventUpdate(BaseModel):
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
        raw_date = doc["date"]
        parsed_date = raw_date.date() if isinstance(raw_date, dt.datetime) else raw_date
        raw_time = doc.get("time")
        parsed_time = dt.time.fromisoformat(raw_time) if isinstance(raw_time, str) else raw_time
        return cls(
            id=str(doc["_id"]),
            application_id=str(doc["application_id"]),
            event_type=doc["event_type"],
            date=parsed_date,
            time=parsed_time,
            notes=doc.get("notes"),
            title=doc.get("title"),
            company=doc.get("company"),
            role_title=doc.get("role_title"),
        )
