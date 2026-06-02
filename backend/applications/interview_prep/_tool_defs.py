"""OpenAI-compatible tool definitions for the Interview Prep agent.

Extracted to keep `agent.py` under the 300-line project file limit.
"""

from typing import Any

from ._finish_schema import BRIEFING_SCHEMA

TOOL_DEFS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": (
                "Search the web for any topic. Use for: company culture, interview experiences, "
                "Glassdoor/Blind snippets, engineering blogs, funding news, LeetCode discussion threads. "
                "Examples: '{company} software engineer interview experience 2024', "
                "'{company} engineering blog', '{company} layoffs OR acquisition 2024'."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "The search query"}
                },
                "required": ["query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "get_levels_data",
            "description": (
                "Get compensation data from Levels.fyi for a specific company and role. "
                "Returns total comp percentiles filtered to the candidate's experience level."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "company": {"type": "string"},
                    "role": {"type": "string"},
                    "location": {"type": "string", "description": "e.g. 'San Francisco, CA' or 'Remote'"},
                    "yoe": {"type": "integer", "description": "Years of experience"},
                },
                "required": ["company", "role", "location", "yoe"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "search_reddit",
            "description": (
                "Search Reddit for interview reports. Good subreddits: "
                "cscareerquestions, leetcode, ExperiencedDevs, cscareeradvice. "
                "Use for: recent interview experiences, actual questions asked, process specifics."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "subreddit": {"type": "string", "description": "Subreddit name without r/"},
                    "query": {"type": "string", "description": "Search query"},
                },
                "required": ["subreddit", "query"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "fetch_page",
            "description": (
                "Fetch and read the text content of a specific URL. "
                "Use when a search result points to a high-value page worth reading in full "
                "(e.g., company engineering blog post, public Glassdoor page, StackShare profile)."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {"type": "string", "description": "Full URL to fetch"}
                },
                "required": ["url"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "finish",
            "description": (
                "Call this when you have data for ALL four sections "
                "(compensation, interview_process, company_intel, personalized). "
                "Fill EVERY field per the parameters schema — no shortcuts, no extra keys. "
                "`rounds` must be a list of objects (name/description/what_to_expect), not strings."
            ),
            "parameters": BRIEFING_SCHEMA,
        },
    },
]
