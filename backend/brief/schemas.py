"""Pydantic models for morning brief API responses."""

import datetime as dt

from pydantic import BaseModel


class BriefResponse(BaseModel):
    date: str
    sections: dict
    summary_line: str
    created_at: dt.datetime | None = None

    @classmethod
    def from_doc(cls, doc: dict) -> "BriefResponse":
        return cls(
            date=doc["date"],
            sections=doc.get("sections", {}),
            summary_line=doc.get("summary_line", ""),
            created_at=doc.get("created_at"),
        )
