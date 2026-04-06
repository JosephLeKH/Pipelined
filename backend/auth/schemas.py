"""Pydantic request/response models for auth endpoints."""

from pydantic import BaseModel, ConfigDict, EmailStr, Field


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

    @classmethod
    def from_doc(cls, doc: dict) -> "UserResponse":
        return cls(
            id=str(doc["_id"]),
            email=doc["email"],
            display_name=doc["display_name"],
            default_stages=doc["default_stages"],
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
