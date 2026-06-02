"""Seed data: welcome notification plus two natural notifications referencing seeded apps.

These show up in the notification bell on first login. Bodies are plain prose
without em dashes so they read like product copy rather than templated output.
"""

from datetime import datetime, timedelta, timezone

from bson import ObjectId


DEMO_MARKER = "__demo__"


WELCOME_TITLE = "Welcome to Pipelined"

WELCOME_BODY = (
    "Hey! We've loaded 7 sample applications across every stage so you can dive "
    "in right away. Open the Anthropic offer to see how compensation tracking "
    "works, hit Cmd+K for the command palette, or drag cards in the Dashboard "
    "between stages. The Today page surfaces what needs attention each morning, "
    "and the Tags page lets you filter by category. Sample data is yours to "
    "edit or delete. Have fun poking around."
)


def build_demo_notifications(
    uid: ObjectId, apps_by_company: dict[str, ObjectId]
) -> list[dict]:
    """Three notifications: welcome, Stripe interview reminder, Google follow-up due.

    Stripe and Google notifications deep-link to their respective seeded
    application detail panels so clicking expands the relevant app.
    """
    now = datetime.now(timezone.utc)
    base = {"user_id": uid, "read": False, DEMO_MARKER: True}
    stripe_id = apps_by_company["Stripe"]
    google_id = apps_by_company["Google"]

    return [
        # Slightly older so the welcome message sits second-newest after the
        # interview reminder, which is the most actionable item.
        {
            **base,
            "type": "welcome",
            "title": WELCOME_TITLE,
            "body": WELCOME_BODY,
            "action_url": "/today",
            "created_at": now - timedelta(minutes=5),
        },
        {
            **base,
            "type": "interview_tomorrow",
            "title": "Stripe phone screen in 2 days",
            "body": "Backend Engineer, Payments Platform. 11am PT. "
                    "Brush up on event-driven systems before the call.",
            "action_url": f"/dashboard?selected={stripe_id}",
            "created_at": now - timedelta(minutes=2),
        },
        {
            **base,
            "type": "follow_up_due",
            "title": "Follow up with Google",
            "body": "Your check-in date is tomorrow. The onsite was 2 days ago "
                    "and the recruiter said to expect news this week.",
            "action_url": f"/dashboard?selected={google_id}&action=follow-up",
            "created_at": now - timedelta(minutes=1),
        },
    ]
