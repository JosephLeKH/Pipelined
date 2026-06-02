"""HTML-table README parser for SimplifyJobs-style listing repos.

SimplifyJobs / Pitt-CSC READMEs render each role category as an HTML `<table>`
(thead/tbody/tr/td) rather than a markdown pipe table. The vanshb03 forks use
markdown tables, parsed by `jobs/sync.py::parse_internship_table`. This module
adds a parallel parser for the HTML format; `_sync_repo` sniffs the content
and routes to the right one.
"""

import re

from bs4 import BeautifulSoup, Tag

from jobs.date_parser import parse_listing_date

_BR_RE: re.Pattern = re.compile(r"<br\s*/?>", re.IGNORECASE)
_SIMPLIFY_REFERRAL_RE: re.Pattern = re.compile(r"simplify\.jobs/p/", re.IGNORECASE)
_LOCKED_EMOJI: str = "\U0001f512"
_CONTINUATION_PREFIX: str = "↳"


def _clean_location(cell: Tag) -> str:
    """Flatten <details><br>-separated location lists into 'A · B · C'.

    SimplifyJobs collapses multi-city rows under a <details><summary>N locations
    </summary>...</details> block. We strip the summary, split on <br>, and join
    the cities with a middle-dot separator to match the markdown parser's output.
    """
    detail = cell.find("details")
    if detail:
        summary = detail.find("summary")
        if summary:
            summary.extract()
        inner_html = detail.decode_contents()
    else:
        inner_html = cell.decode_contents()
    parts = [p.strip() for p in _BR_RE.split(inner_html) if p.strip()]
    joined = " · ".join(parts)
    return BeautifulSoup(joined, "html.parser").get_text(" ", strip=True)


def _extract_apply_url(cell: Tag) -> str | None:
    """Return the first non-Simplify-referral <a href> in this cell, or None.

    Each Application cell has two anchors: the direct employer URL (Workday,
    Greenhouse, Lever, etc.) and a `simplify.jobs/p/...` referral link. We
    prefer the direct URL so url_hash dedupe stays consistent across syncs.
    """
    for anchor in cell.find_all("a", href=True):
        href = anchor["href"]
        if _SIMPLIFY_REFERRAL_RE.search(href):
            continue
        return href
    return None


def _row_to_listing(headers: list[str], row: Tag) -> dict | None:
    """Extract a listing from one <tr>. Returns None for skipped rows.

    Skipped: empty rows, continuation rows (↳), locked roles (🔒), and rows
    with no extractable apply URL.
    """
    cells = row.find_all("td")
    if not cells:
        return None

    row_map = dict(zip(headers, cells))
    company_cell = row_map.get("company") or cells[0]
    company = company_cell.get_text(" ", strip=True)
    if not company or company.startswith(_CONTINUATION_PREFIX) or _LOCKED_EMOJI in company:
        return None

    role_cell = row_map.get("role")
    role = role_cell.get_text(" ", strip=True) if role_cell else ""
    if _LOCKED_EMOJI in role:
        return None

    apply_cell = row_map.get("application") or row_map.get("apply")
    if apply_cell is None:
        return None
    apply_url = _extract_apply_url(apply_cell)
    if not apply_url:
        return None

    location_cell = row_map.get("location")
    listing: dict = {
        "company": company,
        "role": role,
        "location": _clean_location(location_cell) if location_cell else "",
        "apply_url": apply_url,
    }

    age_cell = (
        row_map.get("age")
        or row_map.get("date posted")
        or row_map.get("date")
        or row_map.get("posted")
    )
    if age_cell is not None:
        parsed = parse_listing_date(age_cell.get_text(" ", strip=True))
        if parsed is not None:
            listing["date_posted"] = parsed

    return listing


def parse_html_tables(content: str) -> list[dict]:
    """Parse all <table> blocks in `content` into listing dicts.

    SimplifyJobs READMEs split roles across multiple <table>s (one per
    category: SWE, Data, PM, etc.); we flatten them into a single list.
    """
    soup = BeautifulSoup(content, "html.parser")
    listings: list[dict] = []
    for table in soup.find_all("table"):
        thead = table.find("thead")
        if not thead:
            continue
        headers = [h.get_text(" ", strip=True).lower() for h in thead.find_all("th")]

        body = table.find("tbody") or table
        for row in body.find_all("tr"):
            listing = _row_to_listing(headers, row)
            if listing is not None:
                listings.append(listing)
    return listings


def has_html_tables(content: str) -> bool:
    """Cheap sniff: does this README use HTML <table> markup?"""
    return "<table" in content.lower()
