"""Tests for round-aware interview prep agent prompts."""

from applications.interview_prep.agent import _build_system_prompt, _round_focus_section


def test_round_focus_section_empty_when_no_round():
    assert _round_focus_section(None) == ""
    assert _round_focus_section("") == ""


def test_round_focus_section_includes_technical_guidance():
    section = _round_focus_section("technical")

    assert "technical" in section.lower() or "Technical" in section
    assert "coding" in section.lower() or "algorithms" in section.lower()


def test_build_system_prompt_includes_round_focus():
    prompt = _build_system_prompt(
        "Acme Corp",
        "Software Engineer",
        "Built APIs with Python.",
        interview_round="hm",
    )

    assert "Acme Corp" in prompt
    assert "Upcoming Interview Round" in prompt
    assert "team fit" in prompt.lower()


def test_build_system_prompt_omits_round_section_when_unknown():
    prompt = _build_system_prompt("Acme Corp", "Software Engineer", "", interview_round=None)

    assert "Upcoming Interview Round" not in prompt
