"""Seed data: 7 realistic demo applications across every default stage."""

from datetime import datetime, timedelta, timezone

from bson import ObjectId


DEMO_MARKER = "__demo__"


def _days_ago(days: int) -> datetime:
    return datetime.now(timezone.utc) - timedelta(days=days)


def _days_from_now(days: int) -> datetime:
    return datetime.now(timezone.utc) + timedelta(days=days)


def _stage_history(*entries: tuple[str, datetime]) -> list[dict]:
    return [{"stage": s, "transitioned_at": t} for s, t in entries]


def build_demo_applications(uid: ObjectId, stages: list[str]) -> list[dict]:
    """Return 7 hardcoded application docs ready for insert_many.

    Spans every default stage and includes notes, fit scores, tags, follow-up
    dates, location, and offer details where appropriate.
    """
    now = datetime.now(timezone.utc)
    base = {
        "user_id": uid,
        "stages": stages,
        "source": "manual",
        "archived": False,
        "deleted": False,
        "created_at": now,
        "updated_at": now,
        DEMO_MARKER: True,
    }

    return [
        {
            **base,
            "role_title": "Senior Software Engineer, ML Infrastructure",
            "company": "Google",
            "normalised_company": "google",
            "normalised_role": "senior software engineer, ml infrastructure",
            "current_stage": "Onsite",
            "date_applied": _days_ago(18),
            "tags": ["dream", "big-tech", "ml"],
            "notes": "Phone screen went well. Recruiter mentioned the ML Infra "
                     "team is hiring 4 ICs this half. Onsite loop next Thursday.",
            "fit_score": 87,
            "fit_score_reason": "Strong Python and distributed systems match; "
                                "lighter on Borg / internal infra exposure.",
            "fit_score_status": "complete",
            "fit_score_computed_at": _days_ago(17),
            "location": "Mountain View, CA",
            "remote_status": "hybrid",
            "company_type": "enterprise",
            "company_domain": "google.com",
            "follow_up_date": _days_from_now(1),
            "stage_history": _stage_history(
                ("Applied", _days_ago(18)),
                ("Phone Screen", _days_ago(11)),
                ("Onsite", _days_ago(2)),
            ),
        },
        {
            **base,
            "role_title": "Backend Engineer, Payments Platform",
            "company": "Stripe",
            "normalised_company": "stripe",
            "normalised_role": "backend engineer, payments platform",
            "current_stage": "Phone Screen",
            "date_applied": _days_ago(6),
            "tags": ["fintech", "remote", "dream"],
            "notes": "Recruiter call Monday at 11am PT. Brush up on event-driven "
                     "systems and idempotency patterns. They ask about it a lot.",
            "fit_score": 92,
            "fit_score_reason": "Backend and Go experience aligns with the role.",
            "fit_score_status": "complete",
            "fit_score_computed_at": _days_ago(5),
            "location": "Remote (US)",
            "remote_status": "remote",
            "company_type": "mid",
            "company_domain": "stripe.com",
            "follow_up_date": _days_from_now(2),
            "stage_history": _stage_history(
                ("Applied", _days_ago(6)),
                ("Phone Screen", _days_ago(1)),
            ),
        },
        {
            **base,
            "role_title": "Member of Technical Staff",
            "company": "Anthropic",
            "normalised_company": "anthropic",
            "normalised_role": "member of technical staff",
            "current_stage": "Offer",
            "date_applied": _days_ago(32),
            "tags": ["ai", "dream", "big-tech"],
            "notes": "Verbal offer 2026-05-30. Written offer expected by EOW. "
                     "Compensation discussion scheduled with hiring manager Tuesday.",
            "fit_score": 95,
            "fit_score_reason": "Research-engineering background with Claude-relevant LLM work.",
            "fit_score_status": "complete",
            "fit_score_computed_at": _days_ago(28),
            "compensation": "$220k base + equity",
            "location": "San Francisco, CA",
            "remote_status": "hybrid",
            "company_type": "mid",
            "company_domain": "anthropic.com",
            "offer_details": {
                "base_salary": 220000,
                "equity": "$180k over 4 years (1-year cliff)",
                "signing_bonus": 25000,
                "location": "San Francisco, CA",
                "deadline": "2026-06-12",
                "notes": "Comp negotiable. Anchor at $235k base based on peer offers.",
            },
            "deadline": _days_from_now(11),
            "stage_history": _stage_history(
                ("Applied", _days_ago(32)),
                ("Phone Screen", _days_ago(25)),
                ("Onsite", _days_ago(14)),
                ("Offer", _days_ago(1)),
            ),
        },
        {
            **base,
            "role_title": "Software Engineer",
            "company": "Linear",
            "normalised_company": "linear",
            "normalised_role": "software engineer",
            "current_stage": "Applied",
            "date_applied": _days_ago(3),
            "tags": ["startup", "design-tools", "remote"],
            "notes": "Cold-applied via careers page. Watched their engineering "
                     "values talk on YouTube. Really like the small-team philosophy.",
            "fit_score": 78,
            "fit_score_reason": "Frontend depth is a slight stretch; backend match is strong.",
            "fit_score_status": "complete",
            "fit_score_computed_at": _days_ago(3),
            "location": "Remote",
            "remote_status": "remote",
            "company_type": "startup",
            "company_domain": "linear.app",
            "stage_history": _stage_history(("Applied", _days_ago(3))),
        },
        {
            **base,
            "role_title": "Product Engineer, Growth",
            "company": "Notion",
            "normalised_company": "notion",
            "normalised_role": "product engineer, growth",
            "current_stage": "Rejected",
            "date_applied": _days_ago(41),
            "tags": ["productivity", "startup"],
            "notes": "Made it to onsite. Rejected after final round. Feedback: "
                     "\"Strong technically but team going with someone who has "
                     "more growth-PM experience.\" Reapply in 6 months.",
            "fit_score": 71,
            "fit_score_reason": "Strong full-stack, lighter on growth-engineering metrics.",
            "fit_score_status": "complete",
            "fit_score_computed_at": _days_ago(40),
            "location": "San Francisco, CA",
            "remote_status": "hybrid",
            "company_type": "mid",
            "company_domain": "notion.so",
            "stage_history": _stage_history(
                ("Applied", _days_ago(41)),
                ("Phone Screen", _days_ago(34)),
                ("Onsite", _days_ago(20)),
                ("Rejected", _days_ago(8)),
            ),
        },
        {
            **base,
            "role_title": "Developer Experience Engineer",
            "company": "Vercel",
            "normalised_company": "vercel",
            "normalised_role": "developer experience engineer",
            "current_stage": "Applied",
            "date_applied": _days_ago(1),
            "tags": ["startup", "dx", "remote"],
            "notes": "Posted on their job board. Reached out to a recruiter on "
                     "LinkedIn. She replied and asked for a portfolio link.",
            "fit_score": 84,
            "fit_score_reason": "Open-source contributions and Next.js work line up nicely.",
            "fit_score_status": "complete",
            "fit_score_computed_at": _days_ago(1),
            "location": "Remote",
            "remote_status": "remote",
            "company_type": "mid",
            "company_domain": "vercel.com",
            "stage_history": _stage_history(("Applied", _days_ago(1))),
        },
        {
            **base,
            "role_title": "Software Engineer, New Grad",
            "company": "Airbnb",
            "normalised_company": "airbnb",
            "normalised_role": "software engineer, new grad",
            "current_stage": "Onsite",
            "date_applied": _days_ago(22),
            "tags": ["big-tech", "marketplace"],
            "notes": "Returning intern conversion track. Final loop next Wednesday. "
                     "Need to prep: system design (URL shortener / rate limiter), "
                     "behavioral (STAR format), one coding round.",
            "fit_score": 81,
            "fit_score_reason": "Internship return offer gives strong internal signal.",
            "fit_score_status": "complete",
            "fit_score_computed_at": _days_ago(21),
            "location": "San Francisco, CA",
            "remote_status": "hybrid",
            "company_type": "enterprise",
            "company_domain": "airbnb.com",
            "follow_up_date": _days_from_now(5),
            "stage_history": _stage_history(
                ("Applied", _days_ago(22)),
                ("Phone Screen", _days_ago(15)),
                ("Onsite", _days_ago(4)),
            ),
        },
    ]
