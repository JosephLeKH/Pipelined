"""Pydantic models for analytics, import, merge, and funnel endpoints."""

from pydantic import BaseModel, ConfigDict, Field


class TagCount(BaseModel):
    name: str
    count: int


class TagOfferRate(BaseModel):
    tag: str
    application_count: int
    offer_count: int
    offer_rate: float


class StatsResponse(BaseModel):
    total_applied: int
    active_count: int
    response_rate: float
    avg_days_to_first_response: float | None = None
    stale_count: int = 0
    applied_this_week: int = 0
    current_streak: int = 0
    follow_ups_due: int = 0
    first_follow_up_due_id: str | None = None
    tag_offer_rates: list[TagOfferRate] = Field(default_factory=list)


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


class FunnelStageResult(BaseModel):
    stage: str
    entered_count: int
    exited_to_next_count: int
    conversion_rate: float
    avg_days_in_stage: float | None
    dropped_count: int


class TagRenameRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    old_tag: str = Field(..., min_length=1, max_length=50)
    new_tag: str = Field(..., min_length=1, max_length=50)
