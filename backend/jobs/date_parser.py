"""Parse README "date posted" / "age" cells into UTC datetimes.

The internship-aggregator READMEs we sync from use a mix of formats:
  - Relative age:   "2d", "1w", "3mo", "1y"
  - ISO:            "2025-11-17"
  - Month + day:    "Nov 17", "Nov 17 2025", "Nov 17, 2025"
  - Month + year:   "Jan 2026"
  - MDY:            "11/17", "11/17/2025"

Returns None on anything we cannot confidently parse so the upsert can fall
back to ingestion time.
"""

import re
from datetime import datetime, timedelta, timezone

_RELATIVE_AGE_RE: re.Pattern = re.compile(r"^(\d+)\s*(mo|d|w|y)\b", re.IGNORECASE)
_ISO_DATE_RE: re.Pattern = re.compile(r"^\d{4}-\d{2}-\d{2}$")
_MDY_RE: re.Pattern = re.compile(r"^(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?$")

_MONTH_NAMES: dict[str, int] = {
    "jan": 1, "january": 1,
    "feb": 2, "february": 2,
    "mar": 3, "march": 3,
    "apr": 4, "april": 4,
    "may": 5,
    "jun": 6, "june": 6,
    "jul": 7, "july": 7,
    "aug": 8, "august": 8,
    "sep": 9, "sept": 9, "september": 9,
    "oct": 10, "october": 10,
    "nov": 11, "november": 11,
    "dec": 12, "december": 12,
}

_MONTH_DAY_YEAR_RE: re.Pattern = re.compile(
    r"^([A-Za-z]+)\.?\s+(\d{1,2})(?:[,\s]+(\d{4}))?$"
)
_MONTH_YEAR_RE: re.Pattern = re.compile(r"^([A-Za-z]+)\.?\s+(\d{4})$")

_DAYS_PER_MONTH: int = 30
_DAYS_PER_YEAR: int = 365


def _roll_back_if_future(parsed: datetime, now: datetime) -> datetime:
    """When a year was inferred and the result is in the future, use prior year."""
    if parsed > now:
        return parsed.replace(year=parsed.year - 1)
    return parsed


def _parse_relative_age(text: str, now: datetime) -> datetime | None:
    """Return now minus the duration encoded by '2d' / '1w' / '3mo' / '1y'."""
    match = _RELATIVE_AGE_RE.match(text)
    if not match:
        return None
    count = int(match.group(1))
    unit = match.group(2).lower()
    if unit == "d":
        return now - timedelta(days=count)
    if unit == "w":
        return now - timedelta(weeks=count)
    if unit == "mo":
        return now - timedelta(days=count * _DAYS_PER_MONTH)
    if unit == "y":
        return now - timedelta(days=count * _DAYS_PER_YEAR)
    return None


def _parse_iso(text: str) -> datetime | None:
    """Parse a YYYY-MM-DD literal as UTC midnight."""
    if not _ISO_DATE_RE.match(text):
        return None
    try:
        return datetime.fromisoformat(text).replace(tzinfo=timezone.utc)
    except ValueError:
        return None


def _parse_month_day(text: str, now: datetime) -> datetime | None:
    """Parse 'Nov 17' or 'Nov 17 2025' or 'Nov 17, 2025'."""
    match = _MONTH_DAY_YEAR_RE.match(text)
    if not match:
        return None
    month_num = _MONTH_NAMES.get(match.group(1).lower())
    if not month_num:
        return None
    day = int(match.group(2))
    year_raw = match.group(3)
    year = int(year_raw) if year_raw else now.year
    try:
        parsed = datetime(year, month_num, day, tzinfo=timezone.utc)
    except ValueError:
        return None
    return parsed if year_raw else _roll_back_if_future(parsed, now)


def _parse_month_year(text: str) -> datetime | None:
    """Parse 'Jan 2026' as the first of that month at UTC midnight."""
    match = _MONTH_YEAR_RE.match(text)
    if not match:
        return None
    month_num = _MONTH_NAMES.get(match.group(1).lower())
    if not month_num:
        return None
    year = int(match.group(2))
    try:
        return datetime(year, month_num, 1, tzinfo=timezone.utc)
    except ValueError:
        return None


def _parse_mdy(text: str, now: datetime) -> datetime | None:
    """Parse '11/17' or '11/17/2025'. Two-digit years map into 2000s."""
    match = _MDY_RE.match(text)
    if not match:
        return None
    month = int(match.group(1))
    day = int(match.group(2))
    year_raw = match.group(3)
    if year_raw:
        year = int(year_raw)
        if year < 100:
            year += 2000
    else:
        year = now.year
    try:
        parsed = datetime(year, month, day, tzinfo=timezone.utc)
    except ValueError:
        return None
    return parsed if year_raw else _roll_back_if_future(parsed, now)


def parse_listing_date(raw: str | None, *, now: datetime | None = None) -> datetime | None:
    """Return a UTC datetime for a README date cell, or None when unparseable.

    `now` is injectable for deterministic tests; defaults to wall-clock UTC.
    """
    if not raw:
        return None
    cleaned = raw.strip()
    if not cleaned:
        return None

    reference = now or datetime.now(timezone.utc)

    for parser in (_parse_relative_age, _parse_month_day, _parse_mdy):
        result = parser(cleaned, reference)
        if result is not None:
            return result

    return _parse_iso(cleaned) or _parse_month_year(cleaned)
