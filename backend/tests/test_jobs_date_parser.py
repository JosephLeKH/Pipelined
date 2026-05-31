"""Tests for jobs/date_parser.parse_listing_date."""

from datetime import datetime, timezone

import pytest

from jobs.date_parser import parse_listing_date


REFERENCE_NOW = datetime(2026, 5, 31, 12, 0, 0, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("2d", datetime(2026, 5, 29, 12, 0, 0, tzinfo=timezone.utc)),
        ("1w", datetime(2026, 5, 24, 12, 0, 0, tzinfo=timezone.utc)),
        ("3mo", datetime(2026, 3, 2, 12, 0, 0, tzinfo=timezone.utc)),
        ("1y", datetime(2025, 5, 31, 12, 0, 0, tzinfo=timezone.utc)),
        ("5 d", datetime(2026, 5, 26, 12, 0, 0, tzinfo=timezone.utc)),
    ],
)
def test_parses_relative_age(raw: str, expected: datetime) -> None:
    assert parse_listing_date(raw, now=REFERENCE_NOW) == expected


def test_parses_iso_date() -> None:
    assert parse_listing_date("2025-11-17") == datetime(2025, 11, 17, tzinfo=timezone.utc)


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("Nov 17", datetime(2025, 11, 17, tzinfo=timezone.utc)),
        ("Nov 17, 2025", datetime(2025, 11, 17, tzinfo=timezone.utc)),
        ("Nov 17 2025", datetime(2025, 11, 17, tzinfo=timezone.utc)),
        ("November 17", datetime(2025, 11, 17, tzinfo=timezone.utc)),
        ("Apr 1", datetime(2026, 4, 1, tzinfo=timezone.utc)),
        ("Sept 5", datetime(2025, 9, 5, tzinfo=timezone.utc)),
    ],
)
def test_parses_month_day(raw: str, expected: datetime) -> None:
    assert parse_listing_date(raw, now=REFERENCE_NOW) == expected


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("Jan 2026", datetime(2026, 1, 1, tzinfo=timezone.utc)),
        ("December 2025", datetime(2025, 12, 1, tzinfo=timezone.utc)),
    ],
)
def test_parses_month_year(raw: str, expected: datetime) -> None:
    assert parse_listing_date(raw, now=REFERENCE_NOW) == expected


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("11/17/2025", datetime(2025, 11, 17, tzinfo=timezone.utc)),
        ("4/1/26", datetime(2026, 4, 1, tzinfo=timezone.utc)),
        ("11/17", datetime(2025, 11, 17, tzinfo=timezone.utc)),
    ],
)
def test_parses_mdy(raw: str, expected: datetime) -> None:
    assert parse_listing_date(raw, now=REFERENCE_NOW) == expected


def test_rolls_back_inferred_year_when_future() -> None:
    # "Dec 1" parsed in May 2026 with inferred year 2026 lands in the future,
    # so the parser walks back one year.
    result = parse_listing_date("Dec 1", now=REFERENCE_NOW)
    assert result == datetime(2025, 12, 1, tzinfo=timezone.utc)


def test_explicit_year_is_never_rolled_back() -> None:
    # When the year is provided explicitly, trust it even if it sits in the future.
    result = parse_listing_date("Dec 1, 2026", now=REFERENCE_NOW)
    assert result == datetime(2026, 12, 1, tzinfo=timezone.utc)


@pytest.mark.parametrize("raw", [None, "", "   ", "tbd", "early 2026", "Q4", "soon"])
def test_returns_none_for_unparseable_input(raw: str | None) -> None:
    assert parse_listing_date(raw, now=REFERENCE_NOW) is None


def test_strips_surrounding_whitespace() -> None:
    assert parse_listing_date("  2d  ", now=REFERENCE_NOW) == datetime(
        2026, 5, 29, 12, 0, 0, tzinfo=timezone.utc
    )


def test_uses_wall_clock_when_now_omitted() -> None:
    # Smoke test: without a fixed `now`, a 1d age should be roughly one day before
    # the real wall clock — proves the default path is hooked up.
    result = parse_listing_date("1d")
    assert result is not None
    delta = datetime.now(timezone.utc) - result
    assert 0 < delta.total_seconds() < 86_500  # within a day + slack
