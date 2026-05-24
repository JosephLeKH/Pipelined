"""Pydantic models for recruiter thread summary endpoint."""

from pydantic import BaseModel, Field


class ThreadSummaryResponse(BaseModel):
    summary: str
    reply_options: list[str] = Field(default_factory=list)
