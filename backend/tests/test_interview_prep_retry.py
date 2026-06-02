"""Tests for the interview_prep agent loop's validation-retry path.

MongoDB-free — the LLM client and tool functions are stubbed so the loop
runs entirely in-process.
"""

import json
import types
from typing import Any

import pytest

from applications.interview_prep import agent as agent_module


def _tool_call(name: str, arguments: dict[str, Any], call_id: str = "call_1") -> Any:
    function = types.SimpleNamespace(name=name, arguments=json.dumps(arguments))
    return types.SimpleNamespace(id=call_id, function=function)


def _completion(tool_calls: list[Any], content: str | None = None) -> Any:
    message = types.SimpleNamespace(content=content, tool_calls=tool_calls)
    choice = types.SimpleNamespace(message=message)
    return types.SimpleNamespace(choices=[choice])


def _bad_briefing() -> dict[str, Any]:
    """Missing required nested fields — should trigger ValidationError."""
    return {
        "compensation": {"median_total_comp": "$200k"},  # missing p25/p75/base_range/notes/sources
        "interview_process": {"total_rounds": 4},  # missing rounds/etc
        "company_intel": {},
        "personalized": {},
    }


def _good_briefing() -> dict[str, Any]:
    return {
        "compensation": {
            "p25_total_comp": "$180k",
            "median_total_comp": "$220k",
            "p75_total_comp": "$260k",
            "base_range": "$160k–$200k",
            "notes": "Senior level, SF metro.",
            "sources": ["levels.fyi"],
        },
        "interview_process": {
            "total_rounds": 4,
            "duration_weeks": "3-5",
            "difficulty": "Hard",
            "rounds": [
                {
                    "name": "Recruiter screen",
                    "description": "30-min call",
                    "what_to_expect": "Background and motivation.",
                },
                {
                    "name": "Technical phone screen",
                    "description": "60-min coding",
                    "what_to_expect": "One medium LeetCode.",
                },
            ],
            "recent_questions": ["Reverse linked list", "LRU cache"],
            "tips": ["Practice systems design"],
            "sources": ["reddit.com/r/cscareerquestions"],
        },
        "company_intel": {
            "what_theyre_building": "Developer tooling.",
            "tech_stack": ["Python", "TypeScript"],
            "culture_signals": ["Async-first"],
            "recent_news": ["Series C announced 2026"],
            "red_flags": [],
            "green_flags": ["Strong eng blog"],
        },
        "personalized": {
            "salary_context": "Above current TC by 30%.",
            "experience_gaps": ["Limited Rust"],
            "relevant_experience": ["3 yrs Python backend"],
            "questions_to_ask": ["What does on-call look like?"],
        },
    }


class _ScriptedLLM:
    """Returns scripted ChatCompletion-shaped responses, recording prompts."""

    def __init__(self, scripted: list[Any]):
        self._scripted = list(scripted)
        self.calls: list[list[dict[str, Any]]] = []

    async def __call__(self, *, messages: list[dict[str, Any]], **_kwargs: Any) -> Any:
        self.calls.append([dict(m) for m in messages])
        if not self._scripted:
            raise AssertionError("LLM was called more times than scripted")
        return self._scripted.pop(0)


@pytest.mark.asyncio
async def test_agent_retries_after_validation_error_then_succeeds(monkeypatch):
    """A bad first finish() call should trigger a corrective re-prompt and a passing retry."""
    scripted = _ScriptedLLM(
        [
            _completion([_tool_call("finish", _bad_briefing(), call_id="c1")]),
            _completion([_tool_call("finish", _good_briefing(), call_id="c2")]),
        ]
    )
    monkeypatch.setattr(agent_module, "chat_completion_with_fallback", scripted)

    events = []
    async for ev in agent_module.run_agent(
        company="Acme",
        role="Senior SWE",
        resume_text="3 years Python backend.",
        exa_api_key="exa-test",
        app_id="68000000000000000000aaaa",
    ):
        events.append(ev)

    assert len(scripted.calls) == 2, "LLM should have been called twice (bad → retry)"

    # Corrective feedback message should be appended before the retry call.
    retry_messages = scripted.calls[1]
    feedback_msg = retry_messages[-1]
    assert feedback_msg["role"] == "user"
    assert "did not match the required schema" in feedback_msg["content"]
    assert "compensation" in feedback_msg["content"] or "interview_process" in feedback_msg["content"]

    done_events = [e for e in events if e["type"] == "done"]
    assert len(done_events) == 1
    briefing = done_events[0]["briefing"]
    assert briefing["company"] == "Acme"
    assert briefing["role"] == "Senior SWE"
    assert briefing["compensation"]["median_total_comp"] == "$220k"
    assert briefing["interview_process"]["total_rounds"] == 4
    assert isinstance(briefing["interview_process"]["rounds"], list)
    assert briefing["interview_process"]["rounds"][0]["name"] == "Recruiter screen"


@pytest.mark.asyncio
async def test_agent_gives_up_after_max_validation_retries(monkeypatch):
    """If the model never produces a valid briefing, return an error (no infinite loop)."""
    # _MAX_VALIDATION_RETRIES = 2 → 1 original + 2 retries = 3 bad calls total.
    scripted = _ScriptedLLM(
        [
            _completion([_tool_call("finish", _bad_briefing(), call_id=f"c{i}")])
            for i in range(3)
        ]
    )
    monkeypatch.setattr(agent_module, "chat_completion_with_fallback", scripted)

    events = []
    async for ev in agent_module.run_agent(
        company="Acme",
        role="SWE",
        resume_text="",
        exa_api_key="exa-test",
    ):
        events.append(ev)

    assert len(scripted.calls) == 3
    error_events = [e for e in events if e["type"] == "error"]
    assert len(error_events) == 1
    assert "Couldn't assemble a valid briefing" in error_events[0]["message"]


@pytest.mark.asyncio
async def test_agent_first_attempt_success_uses_one_llm_call(monkeypatch):
    """Happy path: a valid finish() on the first try should not trigger any retry prompts."""
    scripted = _ScriptedLLM(
        [_completion([_tool_call("finish", _good_briefing(), call_id="c1")])]
    )
    monkeypatch.setattr(agent_module, "chat_completion_with_fallback", scripted)

    events = []
    async for ev in agent_module.run_agent(
        company="Acme",
        role="SWE",
        resume_text="r",
        exa_api_key="exa-test",
    ):
        events.append(ev)

    assert len(scripted.calls) == 1
    done_events = [e for e in events if e["type"] == "done"]
    assert len(done_events) == 1
