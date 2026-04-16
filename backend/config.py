"""Application configuration from environment variables."""

import structlog
from pydantic import field_validator
from pydantic_settings import BaseSettings

logger = structlog.get_logger()

DEV_JWT_SECRET = "dev-secret-change-in-production"


def validate_production_secrets(s: "Settings") -> None:
    """Raise RuntimeError if insecure dev defaults are detected in production.

    In DEBUG mode, log warnings instead of raising.
    """
    issues: list[str] = []

    if s.jwt_secret == DEV_JWT_SECRET:
        issues.append("JWT_SECRET is set to the insecure dev default")
    if not s.openai_api_key:
        issues.append("OPENAI_API_KEY is empty")

    if not issues:
        return

    if s.debug:
        for issue in issues:
            logger.warning("insecure_dev_secret_in_use", issue=issue)
    else:
        raise RuntimeError(
            "Production secrets validation failed — refusing to start: "
            + "; ".join(issues)
        )


class Settings(BaseSettings):
    # Database
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "pipelined"

    # Auth
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_access_ttl_minutes: int = 15
    jwt_refresh_ttl_days: int = 7
    google_client_id: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_timeout_seconds: int = 5
    openai_monthly_budget_usd: float = 50.0
    ai_fit_scores_daily_limit: int = 20

    # GitHub Sync
    github_token: str = ""
    github_sync_hour_utc: int = 3
    github_repos: list[str] = ["SimplifyJobs/Summer2026-Internships"]

    # Rate Limiting
    rate_limit_standard: str = "60/minute"
    rate_limit_ai: str = "10/minute"
    rate_limit_auth: str = "5/minute"
    rate_limit_report: str = "10/hour"
    trusted_proxies: list[str] = []

    @field_validator("trusted_proxies", mode="before")
    @classmethod
    def parse_comma_separated(cls, v: str | list) -> list[str]:
        """Parse TRUSTED_PROXIES env var from comma-separated string."""
        if isinstance(v, list):
            return v
        if not v:
            return []
        return [ip.strip() for ip in v.split(",") if ip.strip()]

    # Application
    stale_application_days: int = 14
    stale_listing_days: int = 60

    # CORS
    allowed_origins: list[str] = ["http://localhost:5173"]

    # Email / SMTP
    frontend_url: str = "http://localhost:5173"
    smtp_host: str = "localhost"
    smtp_port: int = 1025
    smtp_use_tls: bool = False
    smtp_username: str = ""
    smtp_password: str = ""
    smtp_from_email: str = "noreply@pipelined.app"

    # Analytics
    posthog_api_key: str = ""

    # Environment
    debug: bool = False

    # Tier limits — set to True in tests to bypass enforcement
    disable_tier_limits: bool = False

    model_config = {"env_file": ".env"}


PREDEFINED_TAGS: list[str] = [
    "referral",
    "dream company",
    "remote",
    "hybrid",
    "in-office",
    "startup",
    "faang",
    "contract",
    "internship",
    "return offer",
]


UNLIMITED = -1

FREE_TIER_LIMITS: dict[str, int | bool] = {
    "max_applications": 100,
    "max_contacts": 50,
    "max_saved_searches": 5,
    "max_csv_import_rows": 100,
    "ai_fit_scores_per_day": 10,
    "share_link_enabled": True,
}

PRO_TIER_LIMITS: dict[str, int | bool] = {
    "max_applications": UNLIMITED,
    "max_contacts": UNLIMITED,
    "max_saved_searches": 25,
    "max_csv_import_rows": 1000,
    "ai_fit_scores_per_day": 100,
    "share_link_enabled": True,
    "priority_support": True,
}

TIER_LIMITS: dict[str, dict[str, int | bool]] = {
    "free": FREE_TIER_LIMITS,
    "pro": PRO_TIER_LIMITS,
}

settings = Settings()
