"""Pydantic request/response models for application endpoints."""

from datetime import datetime
from typing import Literal

from pydantic import AnyHttpUrl, BaseModel, ConfigDict, Field

ValidSource = Literal["extension", "board", "manual"]
ValidCompanyType = Literal["startup", "mid", "enterprise", "gov", "nonprofit", "other"]
ValidRemoteStatus = Literal["remote", "hybrid", "onsite", "unknown"]
ValidSortField = Literal["date_applied", "company", "current_stage", "updated_at", "follow_up_date"]
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
MAX_NOTES_LENGTH = 5000  # SYNC: frontend/src/lib/constants.js NOTES_MAX_LENGTH


class StageHistoryEntry(BaseModel):
    stage: str
    transitioned_at: datetime


class AiFitAnalysis(BaseModel):
    fit_score: int | None = None
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    summary: str | None = None
    scored_at: datetime | None = None


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


MAX_OFFER_TEXT_FIELD_LENGTH = 500


class OfferDetails(BaseModel):
    """Structured offer package details for Offer-stage applications."""

    base_salary: int | None = None
    total_comp: int | None = None
    equity: str | None = Field(None, max_length=MAX_OFFER_TEXT_FIELD_LENGTH)
    signing_bonus: int | None = None
    benefits: str | None = Field(None, max_length=MAX_OFFER_TEXT_FIELD_LENGTH)
    start_date: str | None = Field(None, max_length=50)
    location: str | None = Field(None, max_length=MAX_LOCATION_LENGTH)
    remote_policy: str | None = Field(None, max_length=MAX_OFFER_TEXT_FIELD_LENGTH)
    deadline: str | None = Field(None, max_length=50)
    notes: str | None = Field(None, max_length=MAX_OFFER_TEXT_FIELD_LENGTH)


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
    date_applied: datetime | None = Field(None, strict=False)
    tags: list[str] | None = None
    follow_up_date: datetime | None = Field(None, strict=False)
    notes: str | None = Field(None, max_length=MAX_NOTES_LENGTH)
    offer_details: OfferDetails | None = None


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
    deleted: bool = False
    deleted_at: datetime | None = None
    ai_analysis: AiFitAnalysis | None = None
    company_domain: str | None = None
    follow_up_date: datetime | None = None
    notes: str | None = None
    offer_details: OfferDetails | None = None

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
    applied_this_week: int = 0
    current_streak: int = 0
    follow_ups_due: int = 0


class StageAddRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    name: str = Field(min_length=1, max_length=MAX_STAGE_LENGTH)
    position: int = Field(ge=0)


MAX_BULK_IDS = 100


class BulkDeleteRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    ids: list[str] = Field(min_length=1, max_length=MAX_BULK_IDS)


class BulkStageUpdateRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    ids: list[str] = Field(min_length=1, max_length=MAX_BULK_IDS)
    stage: str = Field(min_length=1, max_length=MAX_STAGE_LENGTH)


class WeeklyCount(BaseModel):
    week: str
    count: int


class StageCount(BaseModel):
    stage: str
    count: int


class MonthlyRate(BaseModel):
    month: str
    rate: float


class CompanyCount(BaseModel):
    company: str
    count: int


class SalaryBucket(BaseModel):
    bucket: str
    count: int


class AnalyticsQuery(BaseModel):
    days: int | None = Field(None, ge=1, le=365)


class AnalyticsResponse(BaseModel):
    applications_by_week: list[WeeklyCount]
    stage_funnel: list[StageCount]
    response_rate_by_month: list[MonthlyRate]
    top_companies: list[CompanyCount]
    salary_distribution: list[SalaryBucket]


MAX_IMPORT_ROWS = 500
MAX_IMPORT_FILE_SIZE_BYTES = 2 * 1024 * 1024  # 2 MB


class ImportRowError(BaseModel):
    row: int
    reason: str


class ImportResult(BaseModel):
    imported: int
    skipped: int
    errors: list[ImportRowError]
    warning: str | None = None


class MergeApplicationsRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    source_id: str
    target_id: str
