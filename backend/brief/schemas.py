"""Pydantic models for morning brief API responses."""

import datetime as dt

from pydantic import BaseModel

from brief.mission_scorer import missions_to_dicts, score_missions


class MissionResponse(BaseModel):
    id: str
    section: str
    title: str
    body: str
    action_url: str
    priority: int
    reason: str
    prep_ready: bool = False


class BriefResponse(BaseModel):
    date: str
    sections: dict
    summary_line: str
    missions: list[MissionResponse] = []
    created_at: dt.datetime | None = None

    @classmethod
    def from_doc(cls, doc: dict, *, missions: list[dict] | None = None) -> "BriefResponse":
        sections = doc.get("sections", {})
        mission_payload = missions if missions is not None else missions_to_dicts(score_missions(sections))
        return cls(
            date=doc["date"],
            sections=sections,
            summary_line=doc.get("summary_line", ""),
            missions=mission_payload,
            created_at=doc.get("created_at"),
        )
