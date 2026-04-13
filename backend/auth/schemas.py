"""Pydantic request/response models for auth endpoints."""

from zoneinfo import available_timezones

from pydantic import BaseModel, ConfigDict, EmailStr, Field

_VALID_TIMEZONES: frozenset[str] = frozenset(available_timezones())
DEFAULT_TIMEZONE = "America/New_York"
DEFAULT_WEEKLY_GOAL = 5


class RegisterRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    display_name: str = Field(min_length=1, max_length=100)


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


class UserResponse(BaseModel):
    id: str
    email: str | None
    display_name: str
    default_stages: list[str]
    timezone: str
    digest_enabled: bool
    has_resume: bool = False
    weekly_goal: int = DEFAULT_WEEKLY_GOAL
    email_verified: bool = False
    avatar_url: str | None = None
    ai_scores_remaining_today: int = 20

    @classmethod
    def from_doc(cls, doc: dict) -> "UserResponse":
        from parsing.ai_cache import get_ai_scores_remaining  # deferred to avoid import cycle
        return cls(
            id=str(doc["_id"]),
            email=doc.get("email"),
            display_name=doc["display_name"],
            default_stages=doc["default_stages"],
            timezone=doc.get("timezone", DEFAULT_TIMEZONE),
            digest_enabled=doc.get("digest_enabled", True),
            has_resume=bool(doc.get("resume_text")),
            weekly_goal=doc.get("weekly_goal", DEFAULT_WEEKLY_GOAL),
            email_verified=bool(doc.get("email_verified", False)),
            avatar_url=doc.get("avatar_url"),
            ai_scores_remaining_today=get_ai_scores_remaining(doc),
        )


class TokenPayload(BaseModel):
    sub: str
    exp: int
    type: str


class ForgotPasswordRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    email: EmailStr


class ResetPasswordRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    token: str = Field(min_length=1)
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
    weekly_goal: int | None = Field(None, ge=WEEKLY_GOAL_MIN, le=WEEKLY_GOAL_MAX)

    def model_post_init(self, __context: object) -> None:
        if self.default_stages is not None:
            for stage in self.default_stages:
                if not stage or len(stage) > STAGE_NAME_MAX_LENGTH:
                    raise ValueError(
                        f"Each stage must be 1–{STAGE_NAME_MAX_LENGTH} characters."
                    )
        if self.timezone is not None and self.timezone not in _VALID_TIMEZONES:
            raise ValueError(f"Unknown timezone: {self.timezone}")
