"""Seed data: 5 calendar events spread across two weeks, tied to demo apps.

Includes prep checklists and prep notes on the high-stakes onsite so the
calendar detail panel renders as a populated example.
"""

from datetime import date, datetime, timedelta, timezone

from bson import ObjectId


DEMO_MARKER = "__demo__"


def _iso_date(days_from_now: int) -> str:
    return (date.today() + timedelta(days=days_from_now)).isoformat()


def _airbnb_onsite_checklist() -> list[dict]:
    return [
        {"id": "prep-1", "text": "Review URL shortener system design", "checked": True},
        {"id": "prep-2", "text": "Practice 2 medium leetcode problems", "checked": True},
        {"id": "prep-3", "text": "Prep 4 STAR stories (conflict, leadership, failure, impact)", "checked": False},
        {"id": "prep-4", "text": "Re-read Airbnb engineering blog posts on search ranking", "checked": False},
    ]


def build_demo_events(uid: ObjectId, apps_by_company: dict[str, ObjectId]) -> list[dict]:
    """Five events: phone screen, onsite (with prep), comp chat, coffee chat, recruiter follow-up.

    Apps that aren't in apps_by_company are silently skipped so the function
    stays resilient to partial-insert recovery.
    """
    now = datetime.now(timezone.utc)
    base = {"user_id": uid, "created_at": now, DEMO_MARKER: True}
    events: list[dict] = []

    if "Stripe" in apps_by_company:
        events.append({
            **base,
            "application_id": apps_by_company["Stripe"],
            "event_type": "phone_screen",
            "date": _iso_date(2),
            "time": "11:00",
            "title": "Stripe: Recruiter phone screen",
            "notes": "30-min intro call. Behavioral plus role expectations.",
            "prep_checklist": [],
            "prep_notes": "Skim Stripe API docs; have a question about Workflows.",
        })

    if "Airbnb" in apps_by_company:
        events.append({
            **base,
            "application_id": apps_by_company["Airbnb"],
            "event_type": "onsite",
            "date": _iso_date(5),
            "time": "10:00",
            "title": "Airbnb: Onsite (4 rounds)",
            "notes": "System design, 2 coding rounds, behavioral. Bring water and snacks.",
            "prep_checklist": _airbnb_onsite_checklist(),
            "prep_notes": "Topics that come up most: rate limiter, URL shortener, "
                          "distributed cache. Behavioral focus on cross-team collaboration.",
        })

    if "Anthropic" in apps_by_company:
        events.append({
            **base,
            "application_id": apps_by_company["Anthropic"],
            "event_type": "other",
            "date": _iso_date(3),
            "time": "14:30",
            "title": "Anthropic: Compensation discussion with HM",
            "notes": "Walkthrough of offer package and negotiation room.",
            "prep_checklist": [],
            "prep_notes": "Anchor: $235k base. Comparables: peer offers at "
                          "$225k-$240k. Be ready to talk equity vesting.",
        })

    if "Linear" in apps_by_company:
        events.append({
            **base,
            "application_id": apps_by_company["Linear"],
            "event_type": "other",
            "date": _iso_date(7),
            "time": "15:00",
            "title": "Linear: Coffee chat with engineering manager",
            "notes": "Casual conversation about team and stack. Not a formal interview.",
            "prep_checklist": [],
            "prep_notes": "Look up the EM on LinkedIn. Ask about how they "
                          "handle on-call and code review culture.",
        })

    if "Google" in apps_by_company:
        events.append({
            **base,
            "application_id": apps_by_company["Google"],
            "event_type": "other",
            "date": _iso_date(9),
            "time": "13:00",
            "title": "Google: Recruiter follow-up call",
            "notes": "Debrief from onsite. Expect feedback and possible next steps.",
            "prep_checklist": [],
            "prep_notes": "Have a clean ask ready if they push for a decision: "
                          "two weeks to compare with Anthropic offer.",
        })

    return events
