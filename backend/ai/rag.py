"""RAG retrieval and refresh for per-user vector search over pipeline data."""

import asyncio
import math
import os
from datetime import datetime, timezone

import structlog
from bson import ObjectId

from ai.embeddings import chunk_application, chunk_email_event, chunk_resume, embed_text
from database import get_collection

logger = structlog.get_logger()

RAG_ENABLED = os.getenv("RAG_ENABLED", "true").lower() == "true"
RAG_TOP_K = int(os.getenv("RAG_TOP_K", "5"))
EMBEDDING_BATCH_SIZE = int(os.getenv("EMBEDDING_BATCH_SIZE", "100"))


def _cosine_similarity(vec_a: list[float], vec_b: list[float]) -> float:
    """Compute cosine similarity between two vectors."""
    if not vec_a or not vec_b or len(vec_a) != len(vec_b):
        return 0.0

    dot = sum(a * b for a, b in zip(vec_a, vec_b))
    mag_a = math.sqrt(sum(a * a for a in vec_a))
    mag_b = math.sqrt(sum(b * b for b in vec_b))

    if mag_a == 0 or mag_b == 0:
        return 0.0
    return dot / (mag_a * mag_b)


async def retrieve_chunks(user_id: str, query_text: str, top_k: int | None = None) -> list[dict]:
    """Retrieve top-K relevant chunks for a user query using cosine similarity.

    CRITICAL: Filters by user_id to prevent data leakage. Never omit this filter.

    Args:
        user_id: User ObjectId as string
        query_text: Query text to embed and search
        top_k: Number of chunks to return (default RAG_TOP_K)

    Returns:
        List of dicts: {source_type, source_id, chunk_text, score}
    """
    if not RAG_ENABLED:
        return []

    if top_k is None:
        top_k = RAG_TOP_K

    try:
        user_oid = ObjectId(user_id)
    except Exception as e:
        logger.warning("rag_invalid_user_id", user_id=user_id, error=str(e))
        return []

    # Embed the query
    try:
        query_embedding = await embed_text(query_text)
    except Exception as e:
        logger.warning("rag_embed_query_failed", user_id=user_id, error=str(e))
        return []

    # Fetch all chunks for this user (CRITICAL: filter by user_id)
    embeddings_col = get_collection("user_embeddings")
    try:
        chunks = await embeddings_col.find({"user_id": user_oid}).to_list(length=None)
    except Exception as e:
        logger.warning("rag_fetch_chunks_failed", user_id=user_id, error=str(e))
        return []

    if not chunks:
        return []

    # Score all chunks using cosine similarity
    scored = []
    for chunk in chunks:
        embedding = chunk.get("embedding", [])
        score = _cosine_similarity(query_embedding, embedding)
        scored.append({
            "source_type": chunk.get("source_type", ""),
            "source_id": str(chunk.get("source_id", "")),
            "chunk_text": chunk.get("chunk_text", ""),
            "score": score,
        })

    # Sort by score (descending) and return top-k
    scored.sort(key=lambda x: x["score"], reverse=True)
    results = scored[:top_k]

    logger.info("rag_retrieved", user_id=user_id, query_len=len(query_text), results=len(results))
    return results


async def refresh_user_embeddings(user_id: str) -> int:
    """Pull user's applications, email_events, and resume; embed and upsert chunks.

    Non-blocking async operation. Should be called from scheduler, not inline.

    Args:
        user_id: User ObjectId as string

    Returns:
        Count of chunks written
    """
    if not RAG_ENABLED:
        return 0

    try:
        user_oid = ObjectId(user_id)
    except Exception as e:
        logger.warning("rag_refresh_invalid_user_id", user_id=user_id, error=str(e))
        return 0

    # Fetch user data
    users_col = get_collection("users")
    apps_col = get_collection("applications")
    email_events_col = get_collection("email_events")

    user_doc = await users_col.find_one({"_id": user_oid})
    if not user_doc:
        logger.warning("rag_refresh_user_not_found", user_id=user_id)
        return 0

    applications = await apps_col.find({"user_id": user_oid}).to_list(length=None)
    email_events = await email_events_col.find({"user_id": user_oid}).to_list(length=None)

    # Build list of (source_type, source_id, chunk_text) tuples
    to_embed = []

    # From applications
    for app in applications:
        chunks = chunk_application(app)
        for chunk_text in chunks:
            to_embed.append(("application", str(app.get("_id", "")), chunk_text))

    # From email events
    for event in email_events:
        chunks = chunk_email_event(event)
        for chunk_text in chunks:
            to_embed.append(("email_event", str(event.get("_id", "")), chunk_text))

    # From resume
    resume_text = user_doc.get("resume_text", "")
    if resume_text:
        chunks = chunk_resume(resume_text)
        for chunk_text in chunks:
            to_embed.append(("resume", user_id, chunk_text))

    if not to_embed:
        logger.info("rag_refresh_no_data", user_id=user_id)
        return 0

    # Embed chunks in batches
    embeddings_col = get_collection("user_embeddings")
    now = datetime.now(timezone.utc)
    written_count = 0

    for i in range(0, len(to_embed), EMBEDDING_BATCH_SIZE):
        batch = to_embed[i : i + EMBEDDING_BATCH_SIZE]
        embed_tasks = [embed_text(chunk_text) for _, _, chunk_text in batch]

        try:
            embeddings = await asyncio.gather(*embed_tasks, return_exceptions=True)
        except Exception as e:
            logger.warning("rag_refresh_embed_batch_failed", user_id=user_id, batch_idx=i, error=str(e))
            continue

        # Upsert chunks
        for (source_type, source_id, chunk_text), embedding in zip(batch, embeddings):
            if isinstance(embedding, Exception):
                logger.warning("rag_refresh_embed_chunk_failed", chunk_preview=chunk_text[:50], error=str(embedding))
                continue

            try:
                source_id_oid = ObjectId(source_id) if source_id != user_id else user_oid
            except Exception:
                logger.warning("rag_refresh_invalid_source_id", source_id=source_id)
                continue

            await embeddings_col.update_one(
                {
                    "user_id": user_oid,
                    "source_type": source_type,
                    "source_id": source_id_oid,
                    "chunk_text": chunk_text,
                },
                {
                    "$set": {
                        "embedding": embedding,
                        "updated_at": now,
                    }
                },
                upsert=True,
            )
            written_count += 1

    logger.info("rag_refresh_complete", user_id=user_id, chunks_written=written_count)
    return written_count
