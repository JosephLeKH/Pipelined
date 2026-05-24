"""Agent activity schemas."""

from datetime import datetime

from pydantic import BaseModel


class AgentRunResponse(BaseModel):
    id: str
    agent_type: str
    status: str
    summary: str
    application_id: str | None = None
    created_at: datetime

    @classmethod
    def from_doc(cls, doc: dict) -> "AgentRunResponse":
        return cls(
            id=str(doc["_id"]),
            agent_type=doc["agent_type"],
            status=doc["status"],
            summary=doc["summary"],
            application_id=str(doc["application_id"]) if doc.get("application_id") else None,
            created_at=doc["created_at"],
        )


DEFAULT_ACTIVITY_LIMIT = 20
MAX_ACTIVITY_LIMIT = 50
