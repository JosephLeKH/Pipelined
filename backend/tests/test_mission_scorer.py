"""Tests for mission priority scoring."""

from brief.mission_scorer import score_missions


def _sections(**kwargs: list[dict]) -> dict:
    return {
        "follow_ups": kwargs.get("follow_ups", []),
        "interviews": kwargs.get("interviews", []),
        "oa_deadlines": kwargs.get("oa_deadlines", []),
        "high_matches": kwargs.get("high_matches", []),
        "pending_approvals": kwargs.get("pending_approvals", []),
        "watchlist_finds": kwargs.get("watchlist_finds", []),
        "ghosts": kwargs.get("ghosts", []),
    }


def test_score_missions_ranks_follow_ups_highest():
    sections = _sections(
        follow_ups=[{
            "title": "Acme — follow-up overdue",
            "body": "Generate a draft on demand in the detail panel",
            "action_url": "/dashboard?selected=507f1f77bcf86cd799439011&action=follow-up",
            "entity_id": "507f1f77bcf86cd799439011",
        }],
        high_matches=[{
            "title": "Beta — Engineer",
            "body": "Fit score 95",
            "action_url": "/dashboard?selected=507f1f77bcf86cd799439012",
            "entity_id": "507f1f77bcf86cd799439012",
        }],
    )

    missions = score_missions(sections)

    assert len(missions) == 2
    assert missions[0].section == "follow_ups"
    assert missions[0].id == "507f1f77bcf86cd799439011"
    assert missions[1].id == "507f1f77bcf86cd799439012"


def test_score_missions_uses_entity_id_for_inbox_items():
    sections = _sections(
        pending_approvals=[{
            "title": "Delta — PM",
            "body": "Match score 88",
            "action_url": "/inbox/pending",
            "entity_id": "pending:507f1f77bcf86cd799439014",
        }],
        watchlist_finds=[{
            "title": "Watchlist finds ready for review",
            "body": "2 new roles from your watchlist",
            "action_url": "/inbox/pending",
            "entity_id": "watchlist_pending",
        }],
    )

    missions = score_missions(sections)
    ids = {mission.id for mission in missions}
    assert "pending:507f1f77bcf86cd799439014" in ids
    assert "watchlist_pending" in ids


def test_score_missions_ghosts_use_median_comparison_reason():
    sections = _sections(
        ghosts=[{
            "title": "Acme — no response",
            "body": "21 days waiting; median 7 days",
            "action_url": "/dashboard?selected=507f1f77bcf86cd799439013",
            "entity_id": "507f1f77bcf86cd799439013",
        }],
        follow_ups=[{
            "title": "Beta — follow-up overdue",
            "body": "Generate a draft on demand in the detail panel",
            "action_url": "/dashboard?selected=507f1f77bcf86cd799439014",
            "entity_id": "507f1f77bcf86cd799439014",
        }],
    )

    missions = score_missions(sections)
    ghost = next(m for m in missions if m.section == "ghosts")

    assert "median response: 7 days" in ghost.reason
    assert "21 days" in ghost.reason
    assert missions[0].section == "follow_ups"


def test_score_missions_ranks_oa_deadlines_above_high_matches():
    sections = _sections(
        oa_deadlines=[{
            "title": "Gamma — Engineer",
            "body": "Due in 2 days",
            "action_url": "/dashboard?selected=507f1f77bcf86cd799439015",
            "entity_id": "507f1f77bcf86cd799439015",
        }],
        high_matches=[{
            "title": "Beta — Engineer",
            "body": "Fit score 95",
            "action_url": "/dashboard?selected=507f1f77bcf86cd799439012",
            "entity_id": "507f1f77bcf86cd799439012",
        }],
    )

    missions = score_missions(sections)
    oa = next(m for m in missions if m.section == "oa_deadlines")
    high = next(m for m in missions if m.section == "high_matches")

    assert oa.priority < high.priority
    assert oa.id == "507f1f77bcf86cd799439015"
    assert "OA due in 2 days" in oa.reason


def test_score_missions_oa_overdue_reason():
    sections = _sections(
        oa_deadlines=[{
            "title": "Delta — SWE",
            "body": "Overdue by 1 day",
            "action_url": "/dashboard?selected=507f1f77bcf86cd799439016",
            "entity_id": "507f1f77bcf86cd799439016",
        }],
    )

    missions = score_missions(sections)

    assert missions[0].reason == "OA overdue by 1 days — complete ASAP"
