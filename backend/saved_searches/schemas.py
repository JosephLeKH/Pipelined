"""Pydantic request/response models for saved searches endpoints."""

from datetime import datetime
from typing import Literal

from pydantic import AliasChoices, BaseModel, ConfigDict, Field


SavedSearchSort = Literal["newest", "oldest"]


class SavedSearchFilters(BaseModel):
    # populate_by_name lets us accept the canonical name AND the legacy alias on input,
    # so existing DB docs that wrote `min_salary` still load.
    model_config = ConfigDict(populate_by_name=True)

    role_type: str | None = None
    experience_level: str | None = None
    remote_status: str | None = None
    company_type: str | None = None
    salary_min: int | None = Field(
        default=None,
        validation_alias=AliasChoices("salary_min", "min_salary"),
    )
    salary_max: int | None = None
    date_from: str | None = None
    sort: SavedSearchSort | None = None


class SavedSearchCreate(BaseModel):
    model_config = ConfigDict(strict=True)

    name: str = Field(..., min_length=1, max_length=100)
    query: str = Field(default="")
    filters: SavedSearchFilters = Field(default_factory=SavedSearchFilters)


class SavedSearchResponse(BaseModel):
    id: str
    name: str
    query: str
    filters: SavedSearchFilters
    last_checked_at: datetime | None = None
    new_matches_count: int
    created_at: datetime

    @classmethod
    def from_doc(cls, doc: dict) -> "SavedSearchResponse":
        return cls(
            id=str(doc["_id"]),
            name=doc["name"],
            query=doc.get("query", ""),
            filters=SavedSearchFilters(**doc.get("filters", {})),
            last_checked_at=doc.get("last_checked_at"),
            new_matches_count=doc.get("new_matches_count", 0),
            created_at=doc["created_at"],
        )
