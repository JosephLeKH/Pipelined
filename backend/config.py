"""Application configuration from environment variables."""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Database
    mongo_uri: str = "mongodb://localhost:27017"
    mongo_db_name: str = "pipelined"

    # Auth
    jwt_secret: str = "dev-secret-change-in-production"
    jwt_access_ttl_minutes: int = 15
    jwt_refresh_ttl_days: int = 7
    google_client_id: str = ""

    # OpenAI
    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"
    openai_timeout_seconds: int = 5
    openai_monthly_budget_usd: float = 50.0

    # GitHub Sync
    github_token: str = ""
    github_sync_hour_utc: int = 3
    github_repos: list[str] = ["SimplifyJobs/Summer2026-Internships"]

    # Rate Limiting
    rate_limit_standard: str = "60/minute"
    rate_limit_ai: str = "10/minute"
    rate_limit_auth: str = "5/minute"

    # Application
    stale_application_days: int = 14
    stale_listing_days: int = 60

    # CORS
    allowed_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_file": ".env"}


settings = Settings()
