"""Pydantic models for weekly review API responses."""

from pydantic import BaseModel, ConfigDict, Field


class VelocityResponse(BaseModel):
    model_config = ConfigDict(strict=True)

    applied_this_week: int
    weekly_goal: int
    percent_of_goal: float


class StaleAppResponse(BaseModel):
    model_config = ConfigDict(strict=True)

    id: str
    company: str
    role_title: str
    days_since_update: int


class WeeklyReviewResponse(BaseModel):
    model_config = ConfigDict(strict=True)

    week_start: str
    response_rate: float = Field(ge=0.0, le=1.0)
    ghost_rate: float = Field(ge=0.0, le=1.0)
    velocity: VelocityResponse
    stale_applications: list[StaleAppResponse] = Field(default_factory=list)

    @classmethod
    def from_doc(cls, doc: dict) -> "WeeklyReviewResponse":
        velocity = doc.get("velocity", {})
        return cls(
            week_start=doc["week_start"],
            response_rate=doc.get("response_rate", 0.0),
            ghost_rate=doc.get("ghost_rate", 0.0),
            velocity=VelocityResponse(
                applied_this_week=velocity.get("applied_this_week", 0),
                weekly_goal=velocity.get("weekly_goal", 5),
                percent_of_goal=velocity.get("percent_of_goal", 0.0),
            ),
            stale_applications=[
                StaleAppResponse(**item)
                for item in doc.get("stale_applications", [])
            ],
        )
