"""Agentic loop for the Interview Prep feature.

The agent receives company/role/resume context, decides which tools to call,
and iterates until it calls `finish` with a structured InterviewBriefing.
"""

import json
from collections.abc import AsyncGenerator
from datetime import UTC, datetime
from typing import Any

import structlog
from pydantic import ValidationError

from ai.next_action import NextAction
from ai.openrouter_client import chat_completion_with_fallback

from ._finish_schema import format_validation_errors
from ._tool_defs import TOOL_DEFS
from .constants import INTERVIEW_ROUND_FOCUS
from .schemas import InterviewBriefing
from .tools import fetch_page, get_levels_data, search_reddit, web_search

logger = structlog.get_logger()

_MAX_ITERATIONS = 12
_MAX_VALIDATION_RETRIES = 2


def _round_focus_section(interview_round: str | None) -> str:
    if not interview_round:
        return ""
    focus = INTERVIEW_ROUND_FOCUS.get(interview_round, "")
    label = interview_round.replace("_", " ").title()
    return (
        f"\n## Upcoming Interview Round\n"
        f"The candidate has an upcoming **{label}** round. {focus}\n"
        "Prioritize research and personalized notes relevant to this specific round.\n"
    )


def _build_system_prompt(
    company: str, role: str, resume_text: str, interview_round: str | None = None
) -> str:
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
{_round_focus_section(interview_round)}
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
    exa_api_key: str,
    interview_round: str | None = None,
    app_id: str | None = None,
) -> AsyncGenerator[ProgressEvent, None]:
    """Run the interview prep agent loop, yielding progress events then the final briefing.

    Yields dicts with keys:
      {"type": "progress", "step": "...", "tool": "..."}
      {"type": "done", "briefing": {...}}
      {"type": "error", "message": "..."}
    """
    system_prompt = _build_system_prompt(company, role, resume_text, interview_round)

    round_hint = ""
    if interview_round:
        round_hint = f" Tailor the briefing to the upcoming {interview_round} round."

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": system_prompt},
        {
            "role": "user",
            "content": (
                f"Research and prepare a complete interview briefing for {role} at {company}.{round_hint} "
                "Gather compensation data, interview process details, company intelligence, "
                "and personalize everything based on my resume. Call finish() when ready."
            ),
        },
    ]

    validation_retries = 0

    for iteration in range(_MAX_ITERATIONS):
        response = await chat_completion_with_fallback(
            messages=messages,
            max_tokens=4096,
            tools=TOOL_DEFS,
            tool_choice="auto",
        )

        message = response.choices[0].message
        tool_calls = message.tool_calls or []

        if not tool_calls:
            logger.warning("agent_stopped_without_finish", iteration=iteration)
            yield {
                "type": "error",
                "message": "Agent finished without producing a briefing. Please try again.",
            }
            return

        # Append the assistant turn (including tool_calls) to history
        assistant_msg: dict[str, Any] = {"role": "assistant", "content": message.content}
        assistant_msg["tool_calls"] = [
            {
                "id": tc.id,
                "type": "function",
                "function": {"name": tc.function.name, "arguments": tc.function.arguments},
            }
            for tc in tool_calls
        ]
        messages.append(assistant_msg)

        briefing_result: dict[str, Any] | None = None

        for tc in tool_calls:
            tool_name: str = tc.function.name
            tool_input: dict[str, Any] = json.loads(tc.function.arguments)

            if tool_name == "finish":
                briefing_result = tool_input
                messages.append({"role": "tool", "tool_call_id": tc.id, "content": "Done."})
                continue

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

            messages.append({"role": "tool", "tool_call_id": tc.id, "content": result})

        if briefing_result is not None:
            try:
                briefing_result["company"] = company
                briefing_result["role"] = role
                briefing_result["generated_at"] = datetime.now(UTC).isoformat()
                if app_id:
                    briefing_result["next_action"] = NextAction(
                        label="Start mock interview",
                        intent="navigate",
                        payload={"to": f"/dashboard/{app_id}?tab=mock-interview"},
                    ).model_dump()
                validated = InterviewBriefing.model_validate(briefing_result)
                yield {"type": "done", "briefing": validated.model_dump(mode="json")}
                return
            except ValidationError as exc:
                validation_retries += 1
                if validation_retries > _MAX_VALIDATION_RETRIES:
                    logger.warning(
                        "briefing_validation_giving_up",
                        attempts=validation_retries,
                        error_count=exc.error_count(),
                    )
                    yield {
                        "type": "error",
                        "message": (
                            f"Couldn't assemble a valid briefing after {validation_retries} attempts. "
                            "Please try again."
                        ),
                    }
                    return
                feedback = format_validation_errors(exc)
                logger.info(
                    "briefing_validation_retry",
                    attempt=validation_retries,
                    error_count=exc.error_count(),
                )
                messages.append(
                    {
                        "role": "user",
                        "content": (
                            "Your finish() call did not match the required schema. "
                            "Fix these errors and call finish() again — every required field "
                            "must be present with the correct type:\n\n"
                            f"{feedback}"
                        ),
                    }
                )
                # Fall through to next loop iteration — do not return.
            except Exception as exc:
                logger.exception("briefing_validation_error", error=str(exc))
                yield {
                    "type": "error",
                    "message": f"Briefing data was malformed: {exc}. Please try again.",
                }
                return

    yield {
        "type": "error",
        "message": "Agent reached max iterations without finishing. Please try again.",
    }
