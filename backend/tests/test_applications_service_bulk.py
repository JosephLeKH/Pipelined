"""Tests for bulk import auto-score scheduling."""

import asyncio
from unittest.mock import AsyncMock, patch

import pytest

from applications.service_bulk import schedule_bulk_auto_scores


@pytest.mark.asyncio
async def test_schedule_bulk_auto_scores_runs_all() -> None:
    """schedule_bulk_auto_scores invokes auto_score_fit for each application."""
    ids = [f"app-{i}" for i in range(12)]
    with patch("applications.service_bulk.auto_score_fit", new=AsyncMock()) as mock_auto:
        await schedule_bulk_auto_scores(user_id="u1", application_ids=ids)
        assert mock_auto.await_count == 12


@pytest.mark.asyncio
async def test_schedule_bulk_auto_scores_empty_list_noop() -> None:
    """schedule_bulk_auto_scores with empty list does nothing."""
    with patch("applications.service_bulk.auto_score_fit", new=AsyncMock()) as mock_auto:
        await schedule_bulk_auto_scores(user_id="u1", application_ids=[])
        mock_auto.assert_not_called()


@pytest.mark.asyncio
async def test_schedule_bulk_auto_scores_caps_concurrency() -> None:
    """At any instant, no more than 5 auto_score_fit calls run concurrently."""
    in_flight = 0
    peak = 0

    async def fake_auto(user_id: str, application_id: str) -> None:
        nonlocal in_flight, peak
        in_flight += 1
        peak = max(peak, in_flight)
        await asyncio.sleep(0.01)
        in_flight -= 1

    with patch("applications.service_bulk.auto_score_fit", side_effect=fake_auto):
        ids = [f"app-{i}" for i in range(20)]
        await schedule_bulk_auto_scores(user_id="u1", application_ids=ids)

    assert peak <= 5
