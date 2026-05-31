"""Pydantic models for apply pack endpoint."""

from pydantic import BaseModel, Field

from ai.next_action import NextAction


class ShortAnswer(BaseModel):
    question: str
    answer: str


class ApplyPackResponse(BaseModel):
    cover_letter: str
    short_answers: list[ShortAnswer] = Field(default_factory=list)
    linkedin_note: str
    talking_points: list[str] = Field(default_factory=list)
    next_action: NextAction | None = None
