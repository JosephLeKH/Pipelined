"""Pydantic models for autopilot endpoints."""

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class CoverLetterDraft(BaseModel):
    subject: str
    body: str


class ResumeTips(BaseModel):
    summary: str
    bullet_suggestions: list[str] = []


class PendingOpportunityResponse(BaseModel):
    id: str
    job_listing_id: str
    match_score: int
    match_reason: str
    cover_letter: CoverLetterDraft
    resume_tips: ResumeTips
    talking_points: list[str] = []
    status: str
    created_at: datetime
    reviewed_at: datetime | None = None
    listing_company: str | None = None
    listing_role: str | None = None
    listing_apply_url: str | None = None
    source: str = "autopilot"

    @classmethod
    def from_doc(cls, doc: dict, listing: dict | None = None) -> "PendingOpportunityResponse":
        listing = listing or {}
        return cls(
            id=str(doc["_id"]),
            job_listing_id=str(doc["job_listing_id"]),
            match_score=doc["match_score"],
            match_reason=doc["match_reason"],
            cover_letter=CoverLetterDraft(**doc["cover_letter"]),
            resume_tips=ResumeTips(**doc["resume_tips"]),
            talking_points=doc.get("talking_points") or [],
            status=doc["status"],
            created_at=doc["created_at"],
            reviewed_at=doc.get("reviewed_at"),
            listing_company=listing.get("company"),
            listing_role=listing.get("role"),
            listing_apply_url=listing.get("apply_url"),
            source=doc.get("source", "autopilot"),
        )


class ApproveResponse(BaseModel):
    opportunity_id: str
    application_id: str
