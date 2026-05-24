"""Shared constants for the applications module."""

SECONDS_PER_DAY: int = 86_400

INITIAL_STAGE = "Applied"
INACTIVE_STAGES = ["Rejected", "Offer"]
STALE_DAYS = 14
DELETED_PURGE_DAYS = 1

MERGEABLE_FIELDS = (
    "role_title", "company", "current_stage", "location",
    "compensation", "remote_status", "source_url", "company_type", "notes", "tags",
)

LIST_PROJECTION = {
    "role_title": 1,
    "company": 1,
    "company_domain": 1,
    "current_stage": 1,
    "date_applied": 1,
    "source": 1,
    "updated_at": 1,
    "tags": 1,
    "archived": 1,
    "archived_at": 1,
    "ai_analysis.fit_score": 1,
    "fit_score": 1,
    "follow_up_date": 1,
    "offer_details": 1,
    "deadline": 1,
}

CSV_EXPORT_COLUMNS = (
    "id", "role_title", "company", "stage", "location",
    "remote_status", "compensation", "company_type",
    "tags", "applied_at", "updated_at", "notes",
)

EXPORT_PROJECTION = {
    "role_title": 1,
    "company": 1,
    "current_stage": 1,
    "location": 1,
    "remote_status": 1,
    "compensation": 1,
    "company_type": 1,
    "tags": 1,
    "date_applied": 1,
    "updated_at": 1,
    "notes": 1,
}

STREAK_LOOKBACK_WEEKS = 52
OFFER_STAGE = "Offer"
RESPONSE_STAGES = ["Phone Screen", "Onsite", "Offer"]

SALARY_BUCKET_LABELS: list[str] = ["$0–50k", "$50–100k", "$100–150k", "$150–200k", "$200k+"]
SALARY_BUCKET_THRESHOLDS: list[int] = [50_000, 100_000, 150_000, 200_000]

PDF_APP_TABLE_LIMIT = 100
PDF_INTERVIEW_STAGES = {"Phone Screen", "Onsite"}
PDF_REPORT_PROJECTION = {
    "role_title": 1,
    "company": 1,
    "current_stage": 1,
    "date_applied": 1,
    "ai_analysis.fit_score": 1,
}
