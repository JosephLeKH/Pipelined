"""Pydantic models for resume insights endpoint."""

from pydantic import BaseModel, Field


class ResumeInsightsResponse(BaseModel):
    keyword_gaps: list[str] = Field(default_factory=list)
    section_suggestions: list[str] = Field(default_factory=list)
    bullet_rewrites: list[dict[str, str]] = Field(default_factory=list)
    overall_summary: str | None = None
