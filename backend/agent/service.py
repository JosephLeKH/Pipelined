"""Agent activity feed service."""

from bson import ObjectId

from agent.schemas import AgentRunResponse, DEFAULT_ACTIVITY_LIMIT, MAX_ACTIVITY_LIMIT
from database import get_collection

COLLECTION_NAME = "agent_runs"


async def get_agent_activity(
    user_id: str,
    *,
    limit: int = DEFAULT_ACTIVITY_LIMIT,
    application_id: str | None = None,
) -> list[dict]:
    """Return recent agent runs for a user, optionally filtered by application."""
    capped_limit = min(max(limit, 1), MAX_ACTIVITY_LIMIT)
    query: dict = {"user_id": ObjectId(user_id)}
    if application_id:
        query["application_id"] = ObjectId(application_id)

    cursor = (
        get_collection(COLLECTION_NAME)
        .find(query)
        .sort("created_at", -1)
        .limit(capped_limit)
    )
    docs = await cursor.to_list(length=capped_limit)
    return [AgentRunResponse.from_doc(doc).model_dump(mode="json") for doc in docs]
