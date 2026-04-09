"""Pydantic request/response models for auth endpoints."""

from zoneinfo import available_timezones

from pydantic import BaseModel, ConfigDict, EmailStr, Field

_VALID_TIMEZONES: frozenset[str] = frozenset(available_timezones())
DEFAULT_TIMEZONE = "America/New_York"


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


class UserResponse(BaseModel):
    id: str
    email: str
    display_name: str
    default_stages: list[str]
    timezone: str

    @classmethod
    def from_doc(cls, doc: dict) -> "UserResponse":
        return cls(
            id=str(doc["_id"]),
            email=doc["email"],
            display_name=doc["display_name"],
            default_stages=doc["default_stages"],
            timezone=doc.get("timezone", DEFAULT_TIMEZONE),
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


STAGES_MIN_COUNT = 2
STAGES_MAX_COUNT = 10
STAGE_NAME_MAX_LENGTH = 40


class UpdateUserRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    default_stages: list[str] | None = Field(
        None,
        min_length=STAGES_MIN_COUNT,
        max_length=STAGES_MAX_COUNT,
    )
    timezone: str | None = None

    def model_post_init(self, __context: object) -> None:
        if self.default_stages is not None:
            for stage in self.default_stages:
                if not stage or len(stage) > STAGE_NAME_MAX_LENGTH:
                    raise ValueError(
                        f"Each stage must be 1–{STAGE_NAME_MAX_LENGTH} characters."
                    )
        if self.timezone is not None and self.timezone not in _VALID_TIMEZONES:
            raise ValueError(f"Unknown timezone: {self.timezone}")
