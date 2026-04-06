"""Pydantic request/response models for application endpoints."""

from datetime import datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field

ValidSource = Literal["extension", "board", "manual"]
ValidCompanyType = Literal["startup", "mid", "enterprise", "gov", "nonprofit", "other"]
ValidRemoteStatus = Literal["remote", "hybrid", "onsite", "unknown"]
ValidSortField = Literal["date_applied", "company", "current_stage", "updated_at"]
ValidSortOrder = Literal["asc", "desc"]

DEFAULT_QUERY_LIMIT = 25
MAX_QUERY_LIMIT = 100
MAX_TAG_COUNT = 20
MAX_ROLE_TITLE_LENGTH = 200
MAX_COMPANY_LENGTH = 200
MAX_COMPENSATION_LENGTH = 100
MAX_LOCATION_LENGTH = 200
MAX_STAGE_LENGTH = 50
MAX_PAGE_TEXT_LENGTH = 3200


class StageHistoryEntry(BaseModel):
    stage: str
    transitioned_at: datetime


class ApplicationCreate(BaseModel):
    model_config = ConfigDict(strict=True)

    role_title: str | None = Field(None, min_length=1, max_length=MAX_ROLE_TITLE_LENGTH)
    company: str | None = Field(None, min_length=1, max_length=MAX_COMPANY_LENGTH)
    source: ValidSource
    source_url: AnyHttpUrl | None = None
    compensation: str | None = Field(None, max_length=MAX_COMPENSATION_LENGTH)
    company_type: ValidCompanyType | None = None
    location: str | None = Field(None, max_length=MAX_LOCATION_LENGTH)
    remote_status: ValidRemoteStatus | None = None
    date_applied: datetime | None = None
    tags: list[str] = Field(default_factory=list, max_length=MAX_TAG_COUNT)
    page_text: str | None = Field(None, max_length=MAX_PAGE_TEXT_LENGTH)


class ApplicationUpdate(BaseModel):
    model_config = ConfigDict(strict=True)

    role_title: str | None = Field(None, min_length=1, max_length=MAX_ROLE_TITLE_LENGTH)
    company: str | None = Field(None, min_length=1, max_length=MAX_COMPANY_LENGTH)
    current_stage: str | None = Field(None, min_length=1, max_length=MAX_STAGE_LENGTH)
    source: ValidSource | None = None
    source_url: AnyHttpUrl | None = None
    compensation: str | None = Field(None, max_length=MAX_COMPENSATION_LENGTH)
    company_type: ValidCompanyType | None = None
    location: str | None = Field(None, max_length=MAX_LOCATION_LENGTH)
    remote_status: ValidRemoteStatus | None = None
    date_applied: datetime | None = None
    tags: list[str] | None = None


class ApplicationResponse(BaseModel):
    id: str
    role_title: str | None = None
    company: str | None = None
    current_stage: str
    source: str
    date_applied: datetime
    updated_at: datetime
    tags: list[str]
    compensation: str | None = None
    location: str | None = None
    remote_status: str | None = None
    stage_history: list[StageHistoryEntry] = Field(default_factory=list)
    archived: bool = False
    archived_at: datetime | None = None

    @classmethod
    def from_doc(cls, doc: dict) -> "ApplicationResponse":
        return cls(
            id=str(doc["_id"]),
            **{k: doc[k] for k in cls.model_fields if k != "id" and k in doc},
        )


class ApplicationListQuery(BaseModel):
    sort_by: ValidSortField = "date_applied"
    sort_order: ValidSortOrder = "desc"
    stage: str | None = None
    company_type: ValidCompanyType | None = None
    remote_status: ValidRemoteStatus | None = None
    tags: list[str] | None = None
    date_from: datetime | None = None
    date_to: datetime | None = None
    q: str | None = None
    cursor: str | None = None
    limit: int = Field(DEFAULT_QUERY_LIMIT, ge=1, le=MAX_QUERY_LIMIT)
    include_archived: bool = False


class StatsResponse(BaseModel):
    total_applied: int
    active_count: int
    response_rate: float
    avg_days_to_first_response: float | None = None
    stale_count: int = 0


class StageAddRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    name: str = Field(min_length=1, max_length=MAX_STAGE_LENGTH)
    position: int = Field(ge=0)
