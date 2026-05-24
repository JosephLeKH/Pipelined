"""Tests for mission priority scoring."""

from brief.mission_scorer import score_missions


def _sections(**kwargs: list[dict]) -> dict:
    return {
        "follow_ups": kwargs.get("follow_ups", []),
        "interviews": kwargs.get("interviews", []),
        "high_matches": kwargs.get("high_matches", []),
        "pending_approvals": kwargs.get("pending_approvals", []),
    }


def test_score_missions_ranks_follow_ups_highest():
    sections = _sections(
        follow_ups=[{
            "title": "Acme — follow-up overdue",
            "body": "Generate a draft on demand in the detail panel",
            "action_url": "/dashboard?selected=1",
        }],
        high_matches=[{
            "title": "Beta — Engineer",
            "body": "Fit score 95",
            "action_url": "/dashboard?selected=2",
        }],
    )

    missions = score_missions(sections)

    assert len(missions) == 2
    assert missions[0].section == "follow_ups"
    assert missions[0].priority == 1
    assert missions[0].reason == "Follow-up is overdue — respond today"
    assert missions[1].section == "high_matches"
    assert missions[1].priority == 2


def test_score_missions_includes_reason_for_interviews():
    sections = _sections(
        interviews=[{
            "title": "Gamma — SWE",
            "body": "Interview prep ready",
            "action_url": "/dashboard?selected=3",
            "prep_ready": True,
        }],
    )

    missions = score_missions(sections)

    assert missions[0].id == "interviews:0"
    assert missions[0].reason == "Interview coming up — prep briefing ready"
    assert missions[0].prep_ready is True


def test_score_missions_sorts_by_computed_score():
    sections = _sections(
        pending_approvals=[{
            "title": "Delta — PM",
            "body": "Match score 88",
            "action_url": "/inbox/pending",
        }],
        interviews=[{
            "title": "Echo — Engineer",
            "body": "Review interview details",
            "action_url": "/calendar",
            "prep_ready": False,
        }],
    )

    missions = score_missions(sections)

    assert missions[0].section == "interviews"
    assert missions[1].section == "pending_approvals"
    assert "Autopilot match (88%)" in missions[1].reason
