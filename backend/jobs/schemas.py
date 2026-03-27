"""Pydantic request/response models for job listings endpoints."""

from datetime import datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field

ValidExperienceLevel = Literal["internship", "entry", "mid", "senior", "staff", "any"]
ValidRoleType = Literal["full_time", "part_time", "contract", "internship", "any"]
ValidCompanyType = Literal["startup", "mid", "enterprise", "gov", "nonprofit", "other"]
ValidRemoteStatus = Literal["remote", "hybrid", "onsite", "unknown"]

DEFAULT_PAGE_SIZE = 30
MAX_PAGE_SIZE = 100
MIN_SALARY = 0


class JobListingResponse(BaseModel):
    id: str
    company: str | None = None
    role: str | None = None
    location: str | None = None
    remote_status: str | None = None
    company_type: str | None = None
    experience_level: str | None = None
    salary_range: str | None = None
    apply_url: str | None = None
    date_posted: datetime | None = None
    is_stale: bool = False
    ingested_at: datetime

    @classmethod
    def from_doc(cls, doc: dict) -> "JobListingResponse":
        return cls(
            id=str(doc["_id"]),
            **{k: doc[k] for k in cls.model_fields if k != "id" and k in doc},
        )


class JobListQuery(BaseModel):
    model_config = ConfigDict(strict=False)

    role_type: ValidRoleType | None = None
    experience_level: ValidExperienceLevel | None = None
    company_type: ValidCompanyType | None = None
    remote_status: ValidRemoteStatus | None = None
    date_from: datetime | None = None
    salary_min: int | None = Field(None, ge=MIN_SALARY)
    hide_applied: bool = False
    page: int = Field(1, ge=1)
    per_page: int = Field(DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE)
