"""Pydantic request/response models for auth endpoints."""

from zoneinfo import available_timezones

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from auth.constants import (
    AUTOPILOT_MAX_DAILY_MAX,
    AUTOPILOT_MAX_DAILY_MIN,
    AUTOPILOT_MIN_SCORE_MAX,
    AUTOPILOT_MIN_SCORE_MIN,
    DEFAULT_AUTOPILOT_ENABLED,
    DEFAULT_AUTOPILOT_MAX_DAILY,
    DEFAULT_AUTOPILOT_MIN_MATCH_SCORE,
    DEFAULT_MORNING_BRIEF_EMAIL,
    DEFAULT_MORNING_BRIEF_ENABLED,
    DEFAULT_MORNING_BRIEF_HOUR,
    DEFAULT_MORNING_BRIEF_IN_APP,
    DEFAULT_TIMEZONE,
    DEFAULT_WEEKLY_DIGEST_ENABLED,
    MORNING_BRIEF_HOUR_MAX,
    MORNING_BRIEF_HOUR_MIN,
)

_VALID_TIMEZONES: frozenset[str] = frozenset(available_timezones())
DEFAULT_WEEKLY_GOAL = 5


REFERRAL_CODE_MAX_LENGTH = 12


class RegisterRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)
    referral_code: str | None = Field(None, max_length=REFERRAL_CODE_MAX_LENGTH)


class LoginRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class GoogleAuthRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    id_token: str = Field(min_length=1)


class GithubAuthRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    code: str = Field(min_length=1)


def _weekly_digest_enabled_from_doc(doc: dict) -> bool:
    """Map legacy digest_enabled to weekly_digest_enabled when unset."""
    if "weekly_digest_enabled" in doc:
        return bool(doc["weekly_digest_enabled"])
    if "digest_enabled" in doc:
        return bool(doc["digest_enabled"])
    return DEFAULT_WEEKLY_DIGEST_ENABLED


class UserResponse(BaseModel):
    id: str
    email: str | None
    display_name: str
    default_stages: list[str]
    timezone: str
    digest_enabled: bool
    morning_brief_enabled: bool = DEFAULT_MORNING_BRIEF_ENABLED
    morning_brief_hour: int = DEFAULT_MORNING_BRIEF_HOUR
    morning_brief_email: bool = DEFAULT_MORNING_BRIEF_EMAIL
    morning_brief_in_app: bool = DEFAULT_MORNING_BRIEF_IN_APP
    weekly_digest_enabled: bool = DEFAULT_WEEKLY_DIGEST_ENABLED
    has_resume: bool = False
    weekly_goal: int = DEFAULT_WEEKLY_GOAL
    email_verified: bool = False
    avatar_url: str | None = None
    ai_scores_remaining_today: int = 20
    referral_code: str | None = None
    referral_count: int = 0
    autopilot_enabled: bool = DEFAULT_AUTOPILOT_ENABLED
    autopilot_min_match_score: int = DEFAULT_AUTOPILOT_MIN_MATCH_SCORE
    autopilot_max_daily: int = DEFAULT_AUTOPILOT_MAX_DAILY

    @classmethod
    def from_doc(cls, doc: dict) -> "UserResponse":
        from parsing.ai_cache import get_ai_scores_remaining  # deferred to avoid import cycle
        weekly_digest = _weekly_digest_enabled_from_doc(doc)
        return cls(
            id=str(doc["_id"]),
            email=doc.get("email"),
            display_name=doc["display_name"],
            default_stages=doc["default_stages"],
            timezone=doc.get("timezone", DEFAULT_TIMEZONE),
            digest_enabled=weekly_digest,
            morning_brief_enabled=doc.get("morning_brief_enabled", DEFAULT_MORNING_BRIEF_ENABLED),
            morning_brief_hour=doc.get("morning_brief_hour", DEFAULT_MORNING_BRIEF_HOUR),
            morning_brief_email=doc.get("morning_brief_email", DEFAULT_MORNING_BRIEF_EMAIL),
            morning_brief_in_app=doc.get("morning_brief_in_app", DEFAULT_MORNING_BRIEF_IN_APP),
            weekly_digest_enabled=weekly_digest,
            has_resume=bool(doc.get("resume_text")),
            weekly_goal=doc.get("weekly_goal", DEFAULT_WEEKLY_GOAL),
            email_verified=bool(doc.get("email_verified", False)),
            avatar_url=doc.get("avatar_url"),
            ai_scores_remaining_today=get_ai_scores_remaining(doc),
            referral_code=doc.get("referral_code"),
            referral_count=doc.get("referral_count", 0),
            autopilot_enabled=doc.get("autopilot_enabled", DEFAULT_AUTOPILOT_ENABLED),
            autopilot_min_match_score=doc.get(
                "autopilot_min_match_score", DEFAULT_AUTOPILOT_MIN_MATCH_SCORE
            ),
            autopilot_max_daily=doc.get("autopilot_max_daily", DEFAULT_AUTOPILOT_MAX_DAILY),
        )


class TokenPayload(BaseModel):
    sub: str
    exp: int
    type: str
    iat: int | None = None


class ChangePasswordRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    new_password: str = Field(min_length=8, max_length=128)


class VerifyEmailRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    token: str = Field(min_length=1)


STAGES_MIN_COUNT = 2
STAGES_MAX_COUNT = 10
STAGE_NAME_MAX_LENGTH = 40
WEEKLY_GOAL_MIN = 1
WEEKLY_GOAL_MAX = 50


class UpdateUserRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    default_stages: list[str] | None = Field(
        None,
        min_length=STAGES_MIN_COUNT,
        max_length=STAGES_MAX_COUNT,
    )
    timezone: str | None = None
    digest_enabled: bool | None = None
    morning_brief_enabled: bool | None = None
    morning_brief_hour: int | None = Field(None, ge=MORNING_BRIEF_HOUR_MIN, le=MORNING_BRIEF_HOUR_MAX)
    morning_brief_email: bool | None = None
    morning_brief_in_app: bool | None = None
    weekly_digest_enabled: bool | None = None
    weekly_goal: int | None = Field(None, ge=WEEKLY_GOAL_MIN, le=WEEKLY_GOAL_MAX)
    autopilot_enabled: bool | None = None
    autopilot_min_match_score: int | None = Field(
        None, ge=AUTOPILOT_MIN_SCORE_MIN, le=AUTOPILOT_MIN_SCORE_MAX
    )
    autopilot_max_daily: int | None = Field(
        None, ge=AUTOPILOT_MAX_DAILY_MIN, le=AUTOPILOT_MAX_DAILY_MAX
    )

    def model_post_init(self, __context: object) -> None:
        if self.default_stages is not None:
            for stage in self.default_stages:
                if not stage or len(stage) > STAGE_NAME_MAX_LENGTH:
                    raise ValueError(
                        f"Each stage must be 1–{STAGE_NAME_MAX_LENGTH} characters."
                    )
        if self.timezone is not None and self.timezone not in _VALID_TIMEZONES:
            raise ValueError(f"Unknown timezone: {self.timezone}")
