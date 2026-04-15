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
MAX_PREP_NOTES_LENGTH = 3000
MAX_CHECKLIST_ITEM_LENGTH = 200
MAX_PREP_QUESTIONS = 20
MAX_QUESTION_LENGTH = 200


class PrepChecklistItem(BaseModel):
    id: str
    text: str = Field(..., max_length=MAX_CHECKLIST_ITEM_LENGTH)
    checked: bool


class PrepData(BaseModel):
    notes: str = ""
    checklist: list[PrepChecklistItem] = []
    questions: list[str] = Field(default_factory=list, max_length=MAX_PREP_QUESTIONS)


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
    prep_notes: str | None = Field(None, max_length=MAX_PREP_NOTES_LENGTH)
    prep_checklist: list[PrepChecklistItem] | None = None
    prep_data: PrepData | None = None


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
    prep_notes: str = ""
    prep_checklist: list[PrepChecklistItem] = []
    prep_data: PrepData = Field(default_factory=PrepData)

    @classmethod
    def from_doc(cls, doc: dict) -> "EventResponse":
        raw_date = doc["date"]
        parsed_date = raw_date.date() if isinstance(raw_date, dt.datetime) else raw_date
        raw_time = doc.get("time")
        parsed_time = dt.time.fromisoformat(raw_time) if isinstance(raw_time, str) else raw_time
        raw_checklist = doc.get("prep_checklist") or []
        prep_checklist = [PrepChecklistItem(**item) for item in raw_checklist]
        prep_data = PrepData(
            notes=doc.get("prep_notes") or "",
            checklist=prep_checklist,
            questions=doc.get("prep_questions") or [],
        )
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
            prep_notes=doc.get("prep_notes") or "",
            prep_checklist=prep_checklist,
            prep_data=prep_data,
        )
