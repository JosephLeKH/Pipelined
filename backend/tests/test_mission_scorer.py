"""Tests for mission priority scoring."""

from brief.mission_scorer import score_missions


def _sections(**kwargs: list[dict]) -> dict:
    return {
        "follow_ups": kwargs.get("follow_ups", []),
        "interviews": kwargs.get("interviews", []),
        "high_matches": kwargs.get("high_matches", []),
        "pending_approvals": kwargs.get("pending_approvals", []),
        "watchlist_finds": kwargs.get("watchlist_finds", []),
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
