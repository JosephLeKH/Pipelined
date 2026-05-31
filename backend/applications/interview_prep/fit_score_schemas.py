"""Pydantic models for fit score endpoint."""

from pydantic import BaseModel

from ai.next_action import NextAction


class FitScoreResponse(BaseModel):
    """Response for fit score generation endpoint."""

    score: int
    reason: str
    next_action: NextAction | None = None
