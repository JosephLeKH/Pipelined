"""Pydantic request/response models for the feedback endpoint."""

from pydantic import BaseModel, ConfigDict, Field

FEEDBACK_MESSAGE_MAX_LENGTH = 500
FEEDBACK_CATEGORY_CHOICES = {"Bug", "Feature Request", "General", "nps"}
FEEDBACK_PAGE_MAX_LENGTH = 200


class FeedbackRequest(BaseModel):
    model_config = ConfigDict(strict=True)

    message: str = Field(min_length=1, max_length=FEEDBACK_MESSAGE_MAX_LENGTH)
    email: str | None = Field(None, max_length=200)
    category: str = Field(min_length=1, max_length=50)
    page: str = Field(default="", max_length=FEEDBACK_PAGE_MAX_LENGTH)
