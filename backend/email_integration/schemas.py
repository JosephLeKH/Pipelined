"""Pydantic models for email integration endpoints."""

from datetime import datetime

from pydantic import BaseModel


class GmailAuthUrl(BaseModel):
    auth_url: str


class GmailConnectionStatus(BaseModel):
    connected: bool
    email: str | None = None
    connected_at: datetime | None = None
    last_sync_at: datetime | None = None
    emails_scanned: int = 0
    apps_tracked: int = 0
    status_updates_count: int = 0
    auto_track: bool = True
    status_updates: bool = True
    interview_prep: bool = False


class EmailAutomationSettings(BaseModel):
    auto_track: bool | None = None
    status_updates: bool | None = None
    interview_prep: bool | None = None


class EmailSyncResult(BaseModel):
    emails_processed: int
    apps_created: int
    apps_updated: int


class GmailActivityEvent(BaseModel):
    event_type: str
    timestamp: datetime
    application_id: str | None = None
    company: str | None = None
    role_title: str | None = None


class GmailActivityResponse(BaseModel):
    events: list[GmailActivityEvent]
