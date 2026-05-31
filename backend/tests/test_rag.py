"""Tests for RAG foundation: embeddings, chunking, and retrieval."""

import asyncio
from unittest.mock import AsyncMock, Mock, patch

import pytest
from bson import ObjectId

from ai.embeddings import chunk_application, chunk_email_event, chunk_resume, embed_text
from ai.rag import refresh_user_embeddings, retrieve_chunks
from database import get_collection

pytestmark = pytest.mark.asyncio(loop_scope="session")


async def test_embed_text_returns_vector():
    """embed_text should call OpenRouter and return a float vector."""
    # Mock the response object (OpenAI client returns an object with .data attribute)
    mock_embedding_obj = AsyncMock()
    mock_embedding_obj.embedding = [0.1, 0.2, 0.3, 0.4, 0.5]

    mock_response = AsyncMock()
    mock_response.data = [mock_embedding_obj]

    with patch("ai.embeddings.get_openrouter_client") as mock_get_client:
        mock_client = AsyncMock()
        mock_get_client.return_value = mock_client
        mock_client.embeddings.create = AsyncMock(return_value=mock_response)

        result = await embed_text("hello world")

        assert isinstance(result, list)
        assert len(result) == 5
        assert all(isinstance(x, float) for x in result)
        mock_client.embeddings.create.assert_called_once()


async def test_chunk_application_produces_chunks():
    """chunk_application should split application doc into 1-3 chunks."""
    app = {
        "company": "Acme Corp",
        "role_title": "Software Engineer",
        "job_description": "Build web apps using Python and React.",
        "notes": "Great team, good work-life balance.",
    }
    chunks = chunk_application(app)

    assert isinstance(chunks, list)
    assert len(chunks) > 0
    assert all(isinstance(c, str) for c in chunks)


async def test_chunk_email_event_produces_chunk():
    """chunk_email_event should produce one chunk from email event."""
    event = {
        "from_email": "recruiter@acme.com",
        "subject": "Interview scheduled",
        "body_preview": "Your interview is scheduled for Friday at 2 PM.",
    }
    chunks = chunk_email_event(event)

    assert isinstance(chunks, list)
    assert len(chunks) == 1
    assert isinstance(chunks[0], str)


async def test_chunk_resume_produces_chunks():
    """chunk_resume should split resume into ~200-token chunks."""
    resume = """
    John Doe
    Software Engineer

    Skills:
    - Python, JavaScript, React
    - PostgreSQL, MongoDB
    - Docker, Kubernetes

    Experience:
    Acme Corp (2020-2023)
    - Led backend team
    - Designed microservices architecture
    - Improved API performance by 40%

    Google (2023-present)
    - Senior engineer
    - Building cloud infrastructure
    - Mentoring junior engineers
    """
    chunks = chunk_resume(resume)

    assert isinstance(chunks, list)
    assert len(chunks) > 0
    assert all(isinstance(c, str) for c in chunks)


async def test_retrieve_chunks_filters_by_user_id():
    """retrieve_chunks should NEVER return chunks from a different user (verified by unit test with mocks)."""
    # This test verifies the critical security property: user_id filter is in the MongoDB query.
    # We mock the MongoDB collection to ensure the filter is applied.

    user_a = ObjectId()
    user_b = ObjectId()
    app_a = ObjectId()
    app_b = ObjectId()

    mock_chunks_for_user_a = [
        {
            "user_id": user_a,
            "source_type": "application",
            "source_id": app_a,
            "chunk_text": "Acme Corp software engineer role",
            "embedding": [0.1, 0.2, 0.3],
        },
    ]

    with patch("ai.rag.get_collection") as mock_get_col:
        mock_col = AsyncMock()
        mock_cursor = AsyncMock()
        mock_cursor.to_list = AsyncMock(return_value=mock_chunks_for_user_a)
        mock_col.find = Mock(return_value=mock_cursor)  # find() is NOT async, returns cursor
        mock_get_col.return_value = mock_col

        with patch("ai.rag.embed_text") as mock_embed:
            mock_embed.return_value = [0.11, 0.21, 0.31]

            results = await retrieve_chunks(str(user_a), "software engineer", top_k=5)

            # Verify that the find() call included the user_id filter (CRITICAL)
            mock_col.find.assert_called_once()
            call_args = mock_col.find.call_args[0][0]
            assert "user_id" in call_args, "SECURITY: user_id MUST be in the MongoDB filter"
            assert call_args["user_id"] == user_a

            # Verify results are from user_a only
            assert len(results) == 1
            assert results[0]["source_id"] == str(app_a)
            assert "Acme" in results[0]["chunk_text"]


async def test_retrieve_chunks_returns_dict_with_metadata():
    """retrieve_chunks should return list of dicts with source info and score."""
    user_id = ObjectId()
    app_id = ObjectId()

    mock_chunks = [
        {
            "user_id": user_id,
            "source_type": "application",
            "source_id": app_id,
            "chunk_text": "Acme Corp software engineer role",
            "embedding": [0.1, 0.2, 0.3],
        },
    ]

    with patch("ai.rag.get_collection") as mock_get_col:
        mock_col = AsyncMock()
        mock_get_col.return_value = mock_col
        mock_cursor = AsyncMock()
        mock_cursor.to_list = AsyncMock(return_value=mock_chunks)
        mock_col.find = Mock(return_value=mock_cursor)  # find() is NOT async, returns cursor

        with patch("ai.rag.embed_text") as mock_embed:
            mock_embed.return_value = [0.1, 0.2, 0.3]

            results = await retrieve_chunks(str(user_id), "engineer", top_k=5)

            assert len(results) > 0
            result = results[0]
            assert "source_type" in result
            assert "source_id" in result
            assert "chunk_text" in result
            assert "score" in result
            assert isinstance(result["score"], float)


async def test_refresh_user_embeddings_writes_chunks():
    """refresh_user_embeddings should embed and write all user's docs."""
    user_id = ObjectId()
    app_id_1 = ObjectId()
    app_id_2 = ObjectId()

    mock_user = {
        "_id": user_id,
        "email": "test@example.com",
        "resume_text": "Python expert with 5 years experience",
    }
    mock_apps = [
        {
            "user_id": user_id,
            "_id": app_id_1,
            "company": "Acme",
            "role_title": "Engineer",
            "job_description": "Build stuff",
        },
        {
            "user_id": user_id,
            "_id": app_id_2,
            "company": "Google",
            "role_title": "Senior Engineer",
            "job_description": "Lead team",
        },
    ]
    mock_email_events = []

    with patch("ai.rag.get_collection") as mock_get_col:
        # Set up different mock collections based on the argument
        def get_mock_col(name):
            col = AsyncMock()
            if name == "users":
                col.find_one = AsyncMock(return_value=mock_user)
            elif name == "applications":
                mock_cursor = AsyncMock()
                mock_cursor.to_list = AsyncMock(return_value=mock_apps)
                col.find = Mock(return_value=mock_cursor)  # find() is NOT async
            elif name == "email_events":
                mock_cursor = AsyncMock()
                mock_cursor.to_list = AsyncMock(return_value=mock_email_events)
                col.find = Mock(return_value=mock_cursor)  # find() is NOT async
            elif name == "user_embeddings":
                col.update_one = AsyncMock()
            return col

        mock_get_col.side_effect = get_mock_col

        with patch("ai.rag.embed_text") as mock_embed:
            mock_embed.return_value = [0.1, 0.2, 0.3, 0.4, 0.5]

            count = await refresh_user_embeddings(str(user_id))

            # Should write chunks for 2 apps + 1 resume
            assert count > 0


async def test_refresh_user_embeddings_nonblocking():
    """refresh_user_embeddings should be async and not block."""
    user_id = ObjectId()

    with patch("ai.rag.get_collection") as mock_get_col:
        col = AsyncMock()
        col.find_one = AsyncMock(return_value=None)  # User not found, return early
        mock_get_col.return_value = col

        # Should be awaitable and return an int
        result = await refresh_user_embeddings(str(user_id))
        assert isinstance(result, int)
