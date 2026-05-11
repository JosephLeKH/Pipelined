"""Agentic loop for the Interview Prep feature.

The agent receives company/role/resume context, decides which tools to call,
and iterates until it calls `finish` with a structured InterviewBriefing.
"""

from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any

import anthropic
import structlog

from .schemas import InterviewBriefing
from .tools import fetch_page, get_levels_data, search_reddit, web_search

logger = structlog.get_logger()

_MODEL = "claude-haiku-4-5-20251001"
_MAX_ITERATIONS = 12

TOOL_DEFS: list[dict[str, Any]] = [
    {
        "name": "web_search",
        "description": (
            "Search the web for any topic. Use for: company culture, interview experiences, "
            "Glassdoor/Blind snippets, engineering blogs, funding news, LeetCode discussion threads. "
            "Examples: '{company} software engineer interview experience 2024', "
            "'{company} engineering blog', '{company} layoffs OR acquisition 2024'."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "query": {"type": "string", "description": "The search query"}
            },
            "required": ["query"],
        },
    },
    {
        "name": "get_levels_data",
        "description": (
            "Get compensation data from Levels.fyi for a specific company and role. "
            "Returns total comp percentiles filtered to the candidate's experience level."
        ),
        "input_schema": {
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
    {
        "name": "search_reddit",
        "description": (
            "Search Reddit for interview reports. Good subreddits: "
            "cscareerquestions, leetcode, ExperiencedDevs, cscareeradvice. "
            "Use for: recent interview experiences, actual questions asked, process specifics."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "subreddit": {"type": "string", "description": "Subreddit name without r/"},
                "query": {"type": "string", "description": "Search query"},
            },
            "required": ["subreddit", "query"],
        },
    },
    {
        "name": "fetch_page",
        "description": (
            "Fetch and read the text content of a specific URL. "
            "Use when a search result points to a high-value page worth reading in full "
            "(e.g., company engineering blog post, public Glassdoor page, StackShare profile)."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "url": {"type": "string", "description": "Full URL to fetch"}
            },
            "required": ["url"],
        },
    },
    {
        "name": "finish",
        "description": (
            "Call this when you have gathered sufficient information. "
            "Provide the complete InterviewBriefing as structured JSON. "
            "Do not call this until you have data for ALL four sections: "
            "compensation, interview_process, company_intel, and personalized."
        ),
        "input_schema": {
            "type": "object",
            "properties": {
                "briefing": {
                    "type": "object",
                    "description": "Complete InterviewBriefing JSON matching the schema",
                }
            },
            "required": ["briefing"],
        },
    },
]


def _build_system_prompt(company: str, role: str, resume_text: str) -> str:
    resume_section = (
        f"## Candidate Resume\n{resume_text.strip()}"
        if resume_text
        else "## Candidate Resume\nNo resume provided — skip personalized sections."
    )
    return f"""You are an expert interview preparation researcher. Your job is to gather comprehensive, \
actionable intelligence for a software engineer preparing to interview at a specific company.

## Target
- **Company:** {company}
- **Role:** {role}

{resume_section}

## Your Research Goal
Gather enough information to fill all four sections of the InterviewBriefing:

1. **Compensation** — Total comp (base + equity + bonus) percentiles from Levels.fyi or similar. \
Filter to the candidate's YOE level. Provide p25/median/p75.

2. **Interview Process** — Round structure, difficulty, timeline. Include actual questions recently \
asked (especially from Reddit and LeetCode Discuss). Use web_search with queries like:
   - "{company} software engineer interview experience 2024"
   - "site:reddit.com {company} interview"
   - "site:leetcode.com/discuss {company} interview questions"
   - "site:glassdoor.com {company} interview"

3. **Company Intelligence** — Tech stack, what they're building, recent news, culture signals, \
red/green flags from Glassdoor/Blind reviews.

4. **Personalized Notes** — Based on the candidate's resume: which parts of their background \
are strongest for this role, gaps to address, contextual salary framing, and smart questions to ask.

## Research Strategy
- Start with 2–3 parallel mental searches, then iterate based on what you find
- Search Reddit (cscareerquestions, leetcode, ExperiencedDevs) for interview reports
- Search for the engineering blog to understand tech stack and culture
- Get Levels.fyi data early so you can personalize the salary context
- If a search returns little signal, try a different query — don't give up

## Output
Call `finish` once you have solid data for all four sections. \
The briefing should be immediately actionable — specific, not generic."""


ProgressEvent = dict[str, Any]


async def run_agent(
    company: str,
    role: str,
    resume_text: str,
    anthropic_api_key: str,
    exa_api_key: str,
) -> AsyncGenerator[ProgressEvent, None]:
    """Run the interview prep agent loop, yielding progress events then the final briefing.

    Yields dicts with keys:
      {"type": "progress", "step": "...", "tool": "..."}
      {"type": "done", "briefing": {...}}
      {"type": "error", "message": "..."}
    """
    client = anthropic.AsyncAnthropic(api_key=anthropic_api_key)
    system_prompt = _build_system_prompt(company, role, resume_text)

    messages: list[dict[str, Any]] = [
        {
            "role": "user",
            "content": (
                f"Research and prepare a complete interview briefing for {role} at {company}. "
                "Gather compensation data, interview process details, company intelligence, "
                "and personalize everything based on my resume. Call finish() when ready."
            ),
        }
    ]

    for iteration in range(_MAX_ITERATIONS):
        response = await client.messages.create(
            model=_MODEL,
            max_tokens=4096,
            system=[
                {
                    "type": "text",
                    "text": system_prompt,
                    "cache_control": {"type": "ephemeral"},
                }
            ],
            tools=TOOL_DEFS,
            messages=messages,
        )

        tool_calls = [b for b in response.content if b.type == "tool_use"]

        if not tool_calls:
            # Model stopped without calling finish — shouldn't happen but handle gracefully
            logger.warning("agent_stopped_without_finish", iteration=iteration)
            yield {
                "type": "error",
                "message": "Agent finished without producing a briefing. Please try again.",
            }
            return

        # Append the assistant's response to messages
        messages.append({"role": "assistant", "content": response.content})

        tool_results: list[dict[str, Any]] = []
        briefing_result: dict[str, Any] | None = None

        for call in tool_calls:
            tool_name: str = call.name
            tool_input: dict[str, Any] = call.input

            if tool_name == "finish":
                briefing_result = tool_input.get("briefing", {})
                tool_results.append(
                    {"type": "tool_result", "tool_use_id": call.id, "content": "Done."}
                )
                continue

            # Emit progress event
            step_labels = {
                "web_search": f"Searching: {tool_input.get('query', '')}",
                "get_levels_data": f"Getting comp data for {tool_input.get('company', '')}",
                "search_reddit": f"Searching r/{tool_input.get('subreddit', '')}: {tool_input.get('query', '')}",
                "fetch_page": f"Reading: {tool_input.get('url', '')}",
            }
            yield {
                "type": "progress",
                "step": step_labels.get(tool_name, tool_name),
                "tool": tool_name,
            }

            # Execute the tool
            try:
                if tool_name == "web_search":
                    result = await web_search(tool_input["query"], exa_api_key)
                elif tool_name == "get_levels_data":
                    result = await get_levels_data(
                        tool_input["company"],
                        tool_input["role"],
                        tool_input.get("location", "United States"),
                        tool_input.get("yoe", 0),
                        exa_api_key,
                    )
                elif tool_name == "search_reddit":
                    result = await search_reddit(tool_input["subreddit"], tool_input["query"])
                elif tool_name == "fetch_page":
                    result = await fetch_page(tool_input["url"])
                else:
                    result = f"Unknown tool: {tool_name}"
            except Exception as e:
                logger.exception("tool_error", tool=tool_name, error=str(e))
                result = f"Tool error ({tool_name}): {e}"

            tool_results.append(
                {"type": "tool_result", "tool_use_id": call.id, "content": result}
            )

        # If finish was called, validate and emit the briefing
        if briefing_result is not None:
            try:
                briefing_result["company"] = company
                briefing_result["role"] = role
                briefing_result["generated_at"] = datetime.now(UTC).isoformat()
                validated = InterviewBriefing.model_validate(briefing_result)
                yield {"type": "done", "briefing": validated.model_dump(mode="json")}
            except Exception as e:
                logger.exception("briefing_validation_error", error=str(e))
                yield {
                    "type": "error",
                    "message": f"Briefing data was malformed: {e}. Please try again.",
                }
            return

        # Continue the loop with tool results
        messages.append({"role": "user", "content": tool_results})

    yield {
        "type": "error",
        "message": "Agent reached max iterations without finishing. Please try again.",
    }
