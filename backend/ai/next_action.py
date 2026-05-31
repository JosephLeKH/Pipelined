"""Shared NextAction model for AI response schemas."""

from typing import Any

from pydantic import BaseModel, field_validator

VALID_INTENTS = {"copy", "navigate", "note", "schedule"}


class NextAction(BaseModel):
    """Represents a suggested next action for the user to take."""

    label: str
    intent: str
    payload: dict[str, Any]

    @field_validator("intent")
    @classmethod
    def validate_intent(cls, v: str) -> str:
        """Reject unknown intents."""
        if v not in VALID_INTENTS:
            raise ValueError(f"intent must be one of {VALID_INTENTS}, got {v}")
        return v
