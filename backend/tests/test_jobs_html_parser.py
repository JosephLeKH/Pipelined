"""Tests for jobs/html_parser.py: SimplifyJobs HTML <table> README parsing."""

from jobs.html_parser import has_html_tables, parse_html_tables


SAMPLE_HTML = """
# Some Header

<table>
<thead>
<tr><th>Company</th><th>Role</th><th>Location</th><th>Application</th><th>Age</th></tr>
</thead>
<tbody>
<tr>
<td><strong><a href="https://simplify.jobs/c/Acme?utm=GH">Acme Corp</a></strong></td>
<td>Software Engineer Intern</td>
<td>San Francisco, CA</td>
<td><div><a href="https://jobs.acme.com/swe-intern?ref=Simplify"><img src="x"></a> <a href="https://simplify.jobs/p/123"><img src="y"></a></div></td>
<td>0d</td>
</tr>
<tr>
<td><strong><a href="https://simplify.jobs/c/Multi?utm=GH">Multi Co</a></strong></td>
<td>Backend Intern</td>
<td><details><summary><strong>3 locations</strong></summary>Boston, MA<br>Austin, TX<br>NYC</details></td>
<td><div><a href="https://jobs.multi.com/be?ref=Simplify"><img src="x"></a></div></td>
<td>2d</td>
</tr>
<tr>
<td>↳</td>
<td>Frontend Intern</td>
<td>Remote</td>
<td><div><a href="https://jobs.multi.com/fe?ref=Simplify"><img src="x"></a></div></td>
<td>2d</td>
</tr>
<tr>
<td><strong>\U0001f512 Locked Co</strong></td>
<td>Closed Role</td>
<td>Remote</td>
<td><div></div></td>
<td>30d</td>
</tr>
</tbody>
</table>
"""


def test_has_html_tables_detects_table_tag():
    assert has_html_tables(SAMPLE_HTML) is True


def test_has_html_tables_false_for_markdown_only():
    assert has_html_tables("# Title\n\n| col |\n| --- |\n| value |") is False


def test_parse_html_tables_extracts_basic_row():
    listings = parse_html_tables(SAMPLE_HTML)

    assert len(listings) == 2
    first = listings[0]
    assert first["company"] == "Acme Corp"
    assert first["role"] == "Software Engineer Intern"
    assert first["location"] == "San Francisco, CA"


def test_parse_html_tables_prefers_direct_apply_url_over_simplify_referral():
    listings = parse_html_tables(SAMPLE_HTML)

    assert listings[0]["apply_url"] == "https://jobs.acme.com/swe-intern?ref=Simplify"


def test_parse_html_tables_flattens_multi_location_details():
    listings = parse_html_tables(SAMPLE_HTML)

    multi = next(L for L in listings if L["company"] == "Multi Co")
    assert multi["location"] == "Boston, MA · Austin, TX · NYC"


def test_parse_html_tables_skips_continuation_arrow_rows():
    listings = parse_html_tables(SAMPLE_HTML)

    assert all(not L["company"].startswith("↳") for L in listings)
    assert len(listings) == 2


def test_parse_html_tables_skips_locked_rows():
    listings = parse_html_tables(SAMPLE_HTML)

    companies = [L["company"] for L in listings]
    assert "Locked Co" not in companies
    assert not any("\U0001f512" in c for c in companies)


def test_parse_html_tables_parses_relative_age_date():
    listings = parse_html_tables(SAMPLE_HTML)

    assert "date_posted" in listings[0]
    assert "date_posted" in listings[1]


def test_parse_html_tables_returns_empty_for_no_tables():
    assert parse_html_tables("# Heading\n\nJust prose, no tables.") == []


def test_parse_html_tables_handles_table_without_thead():
    raw = "<table><tbody><tr><td>x</td></tr></tbody></table>"

    assert parse_html_tables(raw) == []
