"""Pydantic models for co-pilot chat."""

from pydantic import BaseModel, ConfigDict, Field

from ai.next_action import NextAction

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


class CopilotSessionMessage(BaseModel):
    model_config = ConfigDict(strict=True)

    role: str = Field(pattern="^(user|assistant)$")
    content: str = Field(max_length=MAX_MESSAGE_LENGTH)
    actions: list[dict] = Field(default_factory=list)


class CopilotSessionSaveRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    messages: list[CopilotSessionMessage] = Field(default_factory=list, max_length=MAX_HISTORY_MESSAGES)


class CopilotSessionResponse(BaseModel):
    model_config = ConfigDict(strict=True)

    messages: list[CopilotSessionMessage] = Field(default_factory=list)
