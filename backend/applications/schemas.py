"""Pydantic request/response models for application endpoints."""

from datetime import datetime
from typing import Annotated, Literal

from pydantic import AnyHttpUrl, BaseModel, BeforeValidator, ConfigDict, Field, field_validator


def _coerce_iso_datetime(value: object) -> object:
    """Parse date/datetime strings into datetime objects.

    Strict Pydantic in object-validation mode rejects all string inputs
    for datetime fields. Clients submit dates as strings (YYYY-MM-DD from
    HTML date inputs, or full ISO from JS toISOString), so we eagerly
    parse here and hand a real datetime to the strict validator.
    """
    if not isinstance(value, str):
        return value
    if len(value) == 10 and value.count("-") == 2:
        return datetime.fromisoformat(f"{value}T00:00:00+00:00")
    # Accept full ISO with optional trailing Z (Python <3.11 needs +00:00).
    iso = value.replace("Z", "+00:00") if value.endswith("Z") else value
    try:
        return datetime.fromisoformat(iso)
    except ValueError:
        return value  # let strict validator surface a clean error


FlexibleDatetime = Annotated[datetime | None, BeforeValidator(_coerce_iso_datetime)]

ValidSource = Literal["extension", "board", "manual", "email", "autopilot"]
ValidCompanyType = Literal["startup", "mid", "enterprise", "gov", "nonprofit", "other"]
ValidRemoteStatus = Literal["remote", "hybrid", "onsite", "unknown"]
ValidSortField = Literal["date_applied", "company", "current_stage", "updated_at", "follow_up_date"]
ValidSortOrder = Literal["asc", "desc"]
ValidInterviewRound = Literal["phone", "technical", "hm", "onsite", "final"]

DEFAULT_QUERY_LIMIT = 25
MAX_QUERY_LIMIT = 100
MAX_TAG_COUNT = 20
MAX_ROLE_TITLE_LENGTH = 200
MAX_COMPANY_LENGTH = 200
MAX_COMPENSATION_LENGTH = 100
MAX_LOCATION_LENGTH = 200
MAX_STAGE_LENGTH = 50
MAX_PAGE_TEXT_LENGTH = 3200
MAX_JOB_DESCRIPTION_LENGTH = 8000  # SYNC: frontend/src/lib/constants.js JOB_DESCRIPTION_MAX_LENGTH
MAX_NOTES_LENGTH = 5000  # SYNC: frontend/src/lib/constants.js NOTES_MAX_LENGTH
MAX_PREP_CHECKLIST_ITEM_LENGTH = 200  # SYNC: frontend/src/lib/constants.js PREP_CHECKLIST_ITEM_MAX_LENGTH
MAX_PREP_CHECKLIST_ITEMS = 30


class PrepChecklistItem(BaseModel):
    id: str
    text: str = Field(min_length=1, max_length=MAX_PREP_CHECKLIST_ITEM_LENGTH)
    checked: bool = False


class StageHistoryEntry(BaseModel):
    stage: str
    transitioned_at: datetime


class AiFitAnalysis(BaseModel):
    fit_score: int | None = None
    matched_skills: list[str] = Field(default_factory=list)
    missing_skills: list[str] = Field(default_factory=list)
    summary: str | None = None
    match_reason: str | None = None
    scored_at: datetime | None = None


class ApplicationCreate(BaseModel):
    model_config = ConfigDict(strict=True)

    role_title: str | None = Field(None, min_length=1, max_length=MAX_ROLE_TITLE_LENGTH)
    company: str | None = Field(None, min_length=1, max_length=MAX_COMPANY_LENGTH)
    current_stage: str | None = Field(None, min_length=1, max_length=MAX_STAGE_LENGTH)
    source: ValidSource
    source_url: AnyHttpUrl | None = None
    compensation: str | None = Field(None, max_length=MAX_COMPENSATION_LENGTH)
    company_type: ValidCompanyType | None = None
    location: str | None = Field(None, max_length=MAX_LOCATION_LENGTH)
    remote_status: ValidRemoteStatus | None = None
    date_applied: FlexibleDatetime = None
    tags: list[str] = Field(default_factory=list, max_length=MAX_TAG_COUNT)
    page_text: str | None = Field(None, max_length=MAX_PAGE_TEXT_LENGTH)
    job_description: str | None = Field(None, max_length=MAX_JOB_DESCRIPTION_LENGTH)
    custom_fields: dict[str, str | int | bool | list[str]] | None = None
    interview_round: ValidInterviewRound | None = None


MAX_OFFER_TEXT_FIELD_LENGTH = 500
MAX_DOCUMENT_SIZE_BYTES = 2_097_152  # 2 MB

ALLOWED_DOCUMENT_TYPES = frozenset([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
])


class Document(BaseModel):
    """Document with base64-encoded content (resume, cover letter)."""
    filename: str
    content_base64: str
    content_type: str


class OfferDetails(BaseModel):
    """Structured offer package details for Offer-stage applications."""

    base_salary: int | None = None
    total_comp: int | None = None
    equity: str | None = Field(None, max_length=MAX_OFFER_TEXT_FIELD_LENGTH)
    equity_annual_value: int | None = None
    vesting_years: int | None = None
    signing_bonus: int | None = None
    benefits: str | None = Field(None, max_length=MAX_OFFER_TEXT_FIELD_LENGTH)
    benefits_breakdown: dict | None = None
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
    job_description: str | None = Field(None, max_length=MAX_JOB_DESCRIPTION_LENGTH)
    offer_details: OfferDetails | None = None
    deadline: datetime | None = Field(None, strict=False)
    custom_fields: dict[str, str | int | bool | list[str]] | None = None
    documents: dict[str, Document] | None = None  # resume and cover_letter
    prep_checklist: list[PrepChecklistItem] | None = Field(None, max_length=MAX_PREP_CHECKLIST_ITEMS)
    interview_round: ValidInterviewRound | None = None


class ResumeInsights(BaseModel):
    keyword_gaps: list[str] = Field(default_factory=list)
    section_suggestions: list[str] = Field(default_factory=list)
    bullet_rewrites: list[dict[str, str]] = Field(default_factory=list)
    overall_summary: str | None = None


class ThreadSummary(BaseModel):
    summary: str = ""
    reply_options: list[str] = Field(default_factory=list)


class ApplyPackShortAnswer(BaseModel):
    question: str
    answer: str


class ApplyPack(BaseModel):
    cover_letter: str
    short_answers: list[ApplyPackShortAnswer] = Field(default_factory=list)
    linkedin_note: str = ""
    talking_points: list[str] = Field(default_factory=list)


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
    stages: list[str] = Field(default_factory=list)
    stage_history: list[StageHistoryEntry] = Field(default_factory=list)
    archived: bool = False
    archived_at: datetime | None = None
    deleted: bool = False
    deleted_at: datetime | None = None
    ai_analysis: AiFitAnalysis | None = None
    company_domain: str | None = None
    follow_up_date: datetime | None = None
    notes: str | None = None
    job_description: str | None = None
    resume_insights: ResumeInsights | None = None
    resume_insights_at: datetime | None = None
    thread_summary: ThreadSummary | None = None
    thread_summary_at: datetime | None = None
    apply_pack: ApplyPack | None = None
    apply_pack_at: datetime | None = None
    offer_details: OfferDetails | None = None
    deadline: datetime | None = None
    custom_fields: dict[str, str | int | bool | list[str]] | None = None
    documents: dict[str, Document] | None = None  # resume and cover_letter
    prep_checklist: list[PrepChecklistItem] = Field(default_factory=list)
    cover_letter_draft: dict[str, str] | None = None
    fit_score: int | None = None
    fit_score_reason: str | None = None
    fit_score_at: datetime | None = None
    interview_prep_briefing: dict | None = None
    interview_prep_generated_at: datetime | None = None
    interview_prep_status: str | None = None
    interview_prep_triggered_at: datetime | None = None
    interview_round: str | None = None
    parse_enhanced: bool | None = None

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

    @field_validator("stage")
    @classmethod
    def stage_no_operator_injection(cls, v: str | None) -> str | None:
        if v is not None and v.startswith("$"):
            raise ValueError("Field value must not start with '$'")
        return v

    @field_validator("tags", mode="before")
    @classmethod
    def tags_no_operator_injection(cls, v: list | None) -> list | None:
        if v is not None:
            for item in v:
                if isinstance(item, str) and item.startswith("$"):
                    raise ValueError("Tag value must not start with '$'")
        return v


class StageAddRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    name: str = Field(min_length=1, max_length=MAX_STAGE_LENGTH)
    position: int = Field(ge=0)


MAX_BULK_IDS = 500


class BulkDeleteRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    ids: list[str] = Field(min_length=1, max_length=MAX_BULK_IDS)


class BulkDeleteResponse(BaseModel):
    deleted_count: int
    stack_id: str
    failed_ids: list[str] = []


class UndoRestoreResponse(BaseModel):
    restored: int
    conflicts: int
    conflict_ids: list[str]


class BulkStageUpdateRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    ids: list[str] = Field(min_length=1, max_length=MAX_BULK_IDS)
    stage: str = Field(min_length=1, max_length=MAX_STAGE_LENGTH)


MAX_BULK_EDIT_IDS = 50


class PrepChecklistUpsertRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    checklist: list[PrepChecklistItem] = Field(default_factory=list, max_length=MAX_PREP_CHECKLIST_ITEMS)


class BulkEditUpdate(BaseModel):
    model_config = ConfigDict(strict=True)

    current_stage: str | None = Field(None, min_length=1, max_length=MAX_STAGE_LENGTH)
    follow_up_date: datetime | None = Field(None, strict=False)
    tags_add: list[str] | None = None
    tags_remove: list[str] | None = None


class BulkEditRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    application_ids: list[str]
    update: BulkEditUpdate


class EmailEventResponse(BaseModel):
    """Privacy-safe email classification event for an application timeline."""

    id: str
    type: str
    timestamp: datetime
    application_id: str | None = None
    company: str | None = None
    role_title: str | None = None
    stage: str | None = None
    subject: str | None = None
