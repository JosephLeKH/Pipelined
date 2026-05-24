"""Pydantic models for co-pilot chat."""

from pydantic import BaseModel, ConfigDict, Field

MAX_MESSAGE_LENGTH = 4000
MAX_HISTORY_MESSAGES = 12


class CopilotMessage(BaseModel):
    model_config = ConfigDict(strict=True)

    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)


class CopilotChatRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    message: str = Field(min_length=1, max_length=MAX_MESSAGE_LENGTH)
    history: list[CopilotMessage] = Field(default_factory=list, max_length=MAX_HISTORY_MESSAGES)
