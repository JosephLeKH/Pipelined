"""Tests for jobs/sync.py: parser, url_hash, upsert, stale marking, and integration."""

import base64
import hashlib
from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from database import get_collection
from jobs.sync import (
    STALE_LISTING_DAYS,
    _mark_stale_listings,
    _upsert_listing,
    compute_url_hash,
    parse_internship_table,
    sync_github_repos,
)

pytestmark = pytest.mark.asyncio(loop_scope="session")

SAMPLE_README = """
# Summer 2026 Internships

Some intro text.

| Company | Role | Location | Application/Link | Date Posted |
| --- | --- | --- | --- | --- |
| [Acme Corp](https://acme.com) | Software Engineer Intern | San Francisco, CA | [Apply](https://jobs.acme.com/swe-intern) | Jan 2026 |
| [Widgets Inc](https://widgets.com) | Data Engineer Intern | New York, NY | [Apply](https://jobs.widgets.com/de) | Feb 2026 |
| [Locked Co](https://locked.com) | Backend Intern | Remote | \U0001f512 | Jan 2026 |
| ↳ | Frontend Intern | Remote | [Apply](https://jobs.locked.com/fe) | Jan 2026 |

Some footer text.
"""


# ---------------------------------------------------------------------------
# compute_url_hash
# ---------------------------------------------------------------------------


def test_compute_url_hash_returns_sha256_of_normalized_url():
    url = "  HTTPS://Jobs.Acme.com/SWE-Intern  "
    expected = hashlib.sha256(url.lower().strip().encode()).hexdigest()

    result = compute_url_hash(url)

    assert result == expected


def test_compute_url_hash_is_case_and_space_insensitive():
    assert compute_url_hash("https://example.com/job") == compute_url_hash(
        "  HTTPS://EXAMPLE.COM/JOB  "
    )


# ---------------------------------------------------------------------------
# parse_internship_table
# ---------------------------------------------------------------------------


def test_parse_internship_table_extracts_valid_listings():
    listings = parse_internship_table(SAMPLE_README)

    assert len(listings) == 2
    assert listings[0]["company"] == "Acme Corp"
    assert listings[0]["role"] == "Software Engineer Intern"
    assert listings[0]["location"] == "San Francisco, CA"
    assert listings[0]["apply_url"] == "https://jobs.acme.com/swe-intern"


def test_parse_internship_table_extracts_second_listing():
    listings = parse_internship_table(SAMPLE_README)

    assert listings[1]["company"] == "Widgets Inc"
    assert listings[1]["apply_url"] == "https://jobs.widgets.com/de"


def test_parse_internship_table_skips_locked_listings():
    listings = parse_internship_table(SAMPLE_README)

    companies = [l["company"] for l in listings]
    assert "Locked Co" not in companies


def test_parse_internship_table_skips_continuation_rows():
    listings = parse_internship_table(SAMPLE_README)

    # The ↳ continuation row should be skipped
    assert len(listings) == 2


def test_parse_internship_table_returns_empty_for_no_table():
    result = parse_internship_table("# Just a heading\n\nNo table here.")

    assert result == []


def test_parse_internship_table_extracts_date_posted_from_month_year():
    listings = parse_internship_table(SAMPLE_README)

    # "Jan 2026" → first of January 2026 (parser convention for month+year).
    assert listings[0]["date_posted"] == datetime(2026, 1, 1, tzinfo=timezone.utc)
    assert listings[1]["date_posted"] == datetime(2026, 2, 1, tzinfo=timezone.utc)


def test_parse_internship_table_omits_date_when_column_missing():
    readme_no_date = """
| Company | Role | Location | Application/Link |
| --- | --- | --- | --- |
| [Acme](https://acme.com) | SWE | SF | [Apply](https://acme.com/jobs/swe) |
"""

    listings = parse_internship_table(readme_no_date)

    assert len(listings) == 1
    assert "date_posted" not in listings[0]


# ---------------------------------------------------------------------------
# _upsert_listing (requires real MongoDB via app fixture)
# ---------------------------------------------------------------------------


async def test_upsert_listing_inserts_new_document(app):
    # Arrange
    col = get_collection("job_listings")
    listing = {
        "company": "Acme",
        "role": "SWE Intern",
        "location": "SF",
        "apply_url": "https://acme.com/jobs/swe",
    }

    # Act
    await _upsert_listing(col, listing)

    # Assert
    doc = await col.find_one({"apply_url": listing["apply_url"]})
    assert doc is not None
    assert doc["company"] == "Acme"
    assert doc["is_stale"] is False
    assert "ingested_at" in doc
    assert "url_hash" in doc


async def test_upsert_listing_deduplicates_by_url_hash(app):
    # Arrange
    col = get_collection("job_listings")
    listing = {
        "company": "Acme",
        "role": "SWE Intern",
        "location": "SF",
        "apply_url": "https://acme.com/jobs/swe",
    }

    # Act — upsert same listing twice
    await _upsert_listing(col, listing)
    await _upsert_listing(col, {**listing, "company": "Acme Updated"})

    # Assert — only one document, company name updated
    count = await col.count_documents({})
    assert count == 1
    doc = await col.find_one({})
    assert doc["company"] == "Acme Updated"


async def test_upsert_listing_preserves_ingested_at_on_update(app):
    # Arrange
    col = get_collection("job_listings")
    listing = {
        "company": "Acme",
        "role": "SWE Intern",
        "location": "SF",
        "apply_url": "https://acme.com/jobs/swe",
    }

    # Act — insert, then re-upsert
    await _upsert_listing(col, listing)
    first_doc = await col.find_one({})
    first_ingested_at = first_doc["ingested_at"]

    await _upsert_listing(col, listing)
    second_doc = await col.find_one({})

    # Assert — ingested_at unchanged ($setOnInsert semantics)
    assert second_doc["ingested_at"] == first_ingested_at


async def test_upsert_listing_refreshes_date_posted_when_source_provides_one(app):
    # Arrange
    col = get_collection("job_listings")
    initial_date = datetime(2025, 11, 1, tzinfo=timezone.utc)
    updated_date = datetime(2026, 1, 15, tzinfo=timezone.utc)
    listing = {
        "company": "Acme",
        "role": "SWE Intern",
        "location": "SF",
        "apply_url": "https://acme.com/jobs/swe",
        "date_posted": initial_date,
    }

    # Act — insert with first date, then re-upsert with a fresher one
    await _upsert_listing(col, listing)
    await _upsert_listing(col, {**listing, "date_posted": updated_date})

    # Assert — date_posted updated to the most recent parse
    doc = await col.find_one({})
    assert doc["date_posted"] == updated_date


async def test_upsert_listing_keeps_first_insert_date_when_source_has_none(app):
    # Arrange — listing has no parsed date_posted
    col = get_collection("job_listings")
    listing = {
        "company": "Acme",
        "role": "SWE Intern",
        "location": "SF",
        "apply_url": "https://acme.com/jobs/swe",
    }

    # Act — insert, then re-upsert with the same dateless listing
    await _upsert_listing(col, listing)
    first_doc = await col.find_one({})
    first_date_posted = first_doc["date_posted"]

    await _upsert_listing(col, listing)
    second_doc = await col.find_one({})

    # Assert — date_posted stamped on first insert is preserved
    assert second_doc["date_posted"] == first_date_posted


# ---------------------------------------------------------------------------
# _mark_stale_listings (requires real MongoDB via app fixture)
# ---------------------------------------------------------------------------


async def test_mark_stale_listings_marks_old_documents(app):
    # Arrange
    col = get_collection("job_listings")
    old_date = datetime.now(timezone.utc) - timedelta(days=STALE_LISTING_DAYS + 1)
    await col.insert_one({
        "apply_url": "https://old.com/job",
        "date_posted": old_date,
        "is_stale": False,
        "ingested_at": old_date,
    })

    # Act
    await _mark_stale_listings(col)

    # Assert
    doc = await col.find_one({})
    assert doc["is_stale"] is True


async def test_mark_stale_listings_does_not_mark_recent_documents(app):
    # Arrange
    col = get_collection("job_listings")
    recent_date = datetime.now(timezone.utc) - timedelta(days=STALE_LISTING_DAYS - 1)
    await col.insert_one({
        "apply_url": "https://recent.com/job",
        "date_posted": recent_date,
        "is_stale": False,
        "ingested_at": recent_date,
    })

    # Act
    await _mark_stale_listings(col)

    # Assert
    doc = await col.find_one({})
    assert doc["is_stale"] is False


# ---------------------------------------------------------------------------
# sync_github_repos (integration test with mocked httpx)
# ---------------------------------------------------------------------------


def _make_readme_response(content: str) -> MagicMock:
    """Build a mock httpx.Response returning base64-encoded README content."""
    b64 = base64.b64encode(content.encode()).decode()
    resp = MagicMock()
    resp.json.return_value = {"content": b64, "encoding": "base64"}
    resp.raise_for_status = MagicMock()
    resp.headers = {}
    return resp


async def test_sync_github_repos_ingests_listings(app):
    # Arrange
    col = get_collection("job_listings")
    mock_client = AsyncMock()
    mock_client.get.return_value = _make_readme_response(SAMPLE_README)

    with patch("jobs.sync.httpx.AsyncClient") as mock_cls, patch(
        "jobs.sync.settings"
    ) as mock_settings:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_settings.github_token = "test-token"
        mock_settings.github_repos = ["TestOrg/TestRepo"]

        # Act
        await sync_github_repos()

    # Assert
    count = await col.count_documents({})
    assert count == 2

    companies = [d["company"] async for d in col.find({})]
    assert "Acme Corp" in companies
    assert "Widgets Inc" in companies


async def test_sync_github_repos_continues_on_repo_error(app):
    # Arrange — mock the client to raise on the first call, succeed on the second
    col = get_collection("job_listings")
    mock_client = AsyncMock()
    mock_client.get.side_effect = [
        Exception("GitHub API error"),
        _make_readme_response(SAMPLE_README),
    ]

    with patch("jobs.sync.httpx.AsyncClient") as mock_cls, patch(
        "jobs.sync.settings"
    ) as mock_settings:
        mock_cls.return_value.__aenter__ = AsyncMock(return_value=mock_client)
        mock_cls.return_value.__aexit__ = AsyncMock(return_value=False)
        mock_settings.github_token = ""
        mock_settings.github_repos = ["FailRepo/Fail", "TestOrg/TestRepo"]

        # Act — should not raise even though one repo fails
        await sync_github_repos()

    # Assert — listings from the successful repo are present
    count = await col.count_documents({})
    assert count == 2
