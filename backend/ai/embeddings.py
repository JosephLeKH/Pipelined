"""Embedding and chunking utilities for RAG."""

import os

import structlog

from ai.openrouter_client import get_openrouter_client

logger = structlog.get_logger()

EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "nomic-ai/nomic-embed-text-v1.5")


async def embed_text(text: str) -> list[float]:
    """Embed text using OpenRouter embedding model.

    Args:
        text: Text to embed

    Returns:
        List of floats representing the embedding vector

    Raises:
        Exception: If embedding fails
    """
    client = get_openrouter_client()
    response = await client.embeddings.create(
        model=EMBEDDING_MODEL,
        input=text,
    )
    if response.data and len(response.data) > 0:
        embedding = response.data[0].embedding
        if isinstance(embedding, list):
            return embedding
    raise Exception(f"Failed to embed text: invalid response format")


def chunk_application(app: dict) -> list[str]:
    """Split an application into 1-3 short chunks for embedding.

    Args:
        app: Application document with company, role_title, job_description, notes

    Returns:
        List of chunk strings
    """
    chunks = []

    company = app.get("company", "Unknown company")
    role = app.get("role_title", "Unknown role")
    basic_chunk = f"{role} at {company}"
    if "job_description" in app:
        basic_chunk += f": {app['job_description'][:100]}"
    chunks.append(basic_chunk)

    if "notes" in app and app["notes"]:
        chunks.append(f"Notes on {company} {role}: {app['notes']}")

    if "job_description" in app and len(app["job_description"]) > 100:
        chunks.append(f"Full JD for {role}: {app['job_description']}")

    return [c for c in chunks if c]


def chunk_email_event(event: dict) -> list[str]:
    """Extract one chunk from an email event.

    Args:
        event: Email event document with from_email, subject, body_preview

    Returns:
        List with single chunk string
    """
    from_email = event.get("from_email", "")
    subject = event.get("subject", "")
    body = event.get("body_preview", "")
    chunk = f"Email from {from_email}: {subject}. {body}"
    return [chunk]


def chunk_resume(resume_text: str) -> list[str]:
    """Split resume into ~200-token chunks.

    Args:
        resume_text: Plain text resume

    Returns:
        List of chunk strings, each approximately 200 tokens
    """
    if not resume_text or not resume_text.strip():
        return []

    # Simple chunking: split by newlines, group lines into ~200-token chunks
    # Assume ~4 chars per token
    target_chars = 200 * 4
    lines = resume_text.split("\n")
    chunks = []
    current_chunk = []
    current_size = 0

    for line in lines:
        line_size = len(line)
        if current_size + line_size > target_chars and current_chunk:
            chunks.append("\n".join(current_chunk))
            current_chunk = [line]
            current_size = line_size
        else:
            current_chunk.append(line)
            current_size += line_size

    if current_chunk:
        chunks.append("\n".join(current_chunk))

    return [c for c in chunks if c.strip()]
