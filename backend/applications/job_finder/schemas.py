"""Response schemas for the Job Finder agent.

Returns a preview the frontend shows for user confirmation before persisting.
Nothing here is auto-saved; the user explicitly confirms in the UI.
"""

from pydantic import BaseModel, Field


class JobFinderResult(BaseModel):
    """Preview shown to the user after find-jd runs.

    source_url: best-guess URL — newly found by Exa search, or the application's
                existing URL if it had one.
    job_description: cleaned job description body, or None if extraction failed.
    is_valid_job_page: LLM's judgment that the URL points to a real job listing
                       for the role (vs. a generic careers landing page).
    company_match_confidence: "high" | "medium" | "low" — judgment on whether
                              the listing matches the application's company.
    source: "search" if we found a new URL, "existing_url" if we used what was
            already on the application, "fallback" if no URL could be found.
    """

    source_url: str | None = None
    job_description: str | None = None
    is_valid_job_page: bool = False
    company_match_confidence: str = Field(default="low", pattern="^(high|medium|low)$")
    source: str = Field(default="fallback", pattern="^(search|existing_url|fallback)$")
    search_query: str | None = None
