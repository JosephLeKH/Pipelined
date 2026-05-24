"""Tests for morning brief email formatting."""

from notifications.morning_brief_email import MORNING_BRIEF_SUBJECT_PREFIX, format_morning_brief_email


def test_format_morning_brief_email_subject_includes_summary():
    brief = {
        "summary_line": "2 follow-ups, 1 interview",
        "sections": {
            "follow_ups": [{
                "title": "Acme — follow-up overdue",
                "body": "Draft ready in detail panel",
                "action_url": "/dashboard?selected=abc",
            }],
        },
    }

    subject, body = format_morning_brief_email(brief, "Alex")

    assert subject == f"{MORNING_BRIEF_SUBJECT_PREFIX}2 follow-ups, 1 interview"
    assert "Alex" in body
    assert "/brief" in body
    assert "/dashboard?selected=abc" in body
    assert "mailto:" not in body.lower()
