"""Web tools for the Job Finder agent: Exa URL search + page fetch + LLM JD extraction.

Pattern mirrors applications/interview_prep/tools.py (Exa + httpx + BeautifulSoup).
LLM cleanup uses the existing ai/openrouter_client to extract job-description text
from raw page HTML — a single JSON-mode call.
"""

import httpx
import structlog
from bs4 import BeautifulSoup

from ai.openrouter_client import complete_json

logger = structlog.get_logger()

_USER_AGENT = "Mozilla/5.0 (compatible; Pipelined/1.0; +https://pipelined.app)"
_MAX_RAW_CHARS = 8000
_EXA_RESULTS = 6
_FETCH_TIMEOUT_SECONDS = 15.0

# Domains where job listings actually live. Used to filter Exa results so a
# generic "About Anthropic" page never wins over an ATS listing.
_JOB_DOMAIN_HINTS = (
    "greenhouse.io",
    "lever.co",
    "ashbyhq.com",
    "workday",
    "myworkdayjobs",
    "jobs.",
    "careers.",
    "boards.",
    "smartrecruiters",
    "jobvite",
    "icims",
    "linkedin.com/jobs",
    "indeed.com",
)


def _looks_like_job_url(url: str, company: str | None) -> bool:
    """Return True if a URL looks like a job listing (vs. marketing page)."""
    lowered = url.lower()
    if any(hint in lowered for hint in _JOB_DOMAIN_HINTS):
        return True
    if company:
        slug = company.lower().replace(" ", "").replace(",", "")
        if slug and slug in lowered:
            return True
    return False


async def find_job_url(
    company: str,
    role: str,
    location: str | None,
    exa_api_key: str,
) -> tuple[str | None, str]:
    """Search Exa for a plausible job listing URL. Returns (url, query_used)."""
    if not exa_api_key:
        return None, ""

    location_fragment = f" {location}" if location else ""
    query = f'"{role}" "{company}"{location_fragment} job description apply'

    payload = {
        "query": query,
        "numResults": _EXA_RESULTS,
        "type": "neural",
    }
    async with httpx.AsyncClient(timeout=_FETCH_TIMEOUT_SECONDS) as client:
        try:
            resp = await client.post(
                "https://api.exa.ai/search",
                json=payload,
                headers={"x-api-key": exa_api_key, "Content-Type": "application/json"},
            )
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("job_finder_exa_failed", error=str(exc), query=query)
            return None, query

    results = resp.json().get("results", [])
    for result in results:
        url = result.get("url", "")
        if url and _looks_like_job_url(url, company):
            return url, query

    if results:
        return results[0].get("url"), query

    return None, query


async def fetch_page_text(url: str) -> str:
    """Fetch a URL and return its main-content text, stripped of nav/footer/scripts."""
    headers = {"User-Agent": _USER_AGENT, "Accept": "text/html,application/xhtml+xml"}
    async with httpx.AsyncClient(timeout=_FETCH_TIMEOUT_SECONDS, follow_redirects=True) as client:
        try:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()
        except httpx.HTTPError as exc:
            logger.warning("job_finder_fetch_failed", url=url, error=str(exc))
            return ""

    soup = BeautifulSoup(resp.text, "html.parser")
    for tag in soup(["script", "style", "nav", "footer", "header", "aside", "noscript"]):
        tag.decompose()

    main = soup.find("main") or soup.find("article") or soup.find("body")
    text = (main or soup).get_text(separator="\n", strip=True)
    lines = [line for line in text.splitlines() if line.strip()]
    return "\n".join(lines)[:_MAX_RAW_CHARS]


_EXTRACT_SYSTEM = (
    "You extract job descriptions from raw web page text. "
    "Return ONLY valid JSON. Do not invent content."
)


def _extract_user_prompt(company: str, role: str, url: str, raw_text: str) -> str:
    return (
        f"Application: {role} at {company}\n"
        f"Page URL: {url}\n\n"
        f"Raw page text:\n{raw_text}\n\n"
        'Return JSON with keys:\n'
        '  "is_valid_job_page": boolean — is this a job listing for the role above?\n'
        '  "company_match_confidence": "high" | "medium" | "low"\n'
        '  "job_description": cleaned JD text (responsibilities, requirements, qualifications). '
        'Strip nav, "About <company>" boilerplate, apply buttons, footer. '
        'Aim for 400–3000 characters. Empty string if the page is not a valid job listing.\n'
    )


async def extract_job_description(company: str, role: str, url: str, raw_text: str) -> dict:
    """Use the LLM to extract a clean job description from raw page text."""
    if not raw_text.strip():
        return {"is_valid_job_page": False, "company_match_confidence": "low", "job_description": ""}

    parsed = await complete_json(
        system=_EXTRACT_SYSTEM,
        user=_extract_user_prompt(company, role, url, raw_text),
        temperature=0.1,
        max_tokens=2000,
    )
    return parsed
