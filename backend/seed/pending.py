"""Seed data: 2 pending opportunities + their paired job listings.

These show up at /inbox/pending so the page renders populated instead of an
empty Autopilot inbox. Each pending opp links to a synthetic job_listing row
so the detail panel has all the fields it expects (company, role, apply_url).
"""

from datetime import datetime, timedelta, timezone
from hashlib import sha256

from bson import ObjectId


DEMO_MARKER = "__demo__"


def _url_hash(url: str) -> str:
    return sha256(url.encode("utf-8")).hexdigest()


def build_demo_job_listings(uid_for_owner: ObjectId) -> list[dict]:
    """Two job_listings that the demo pending opportunities will point at.

    user_id is not part of the listings schema (job listings are global), but
    we tag with DEMO_MARKER so a cleanup script can identify them.
    """
    now = datetime.now(timezone.utc)
    return [
        {
            "company": "Discord",
            "role": "Backend Engineer, Platform",
            "location": "Remote (US)",
            "remote_status": "remote",
            "company_type": "mid",
            "experience_level": "mid",
            "role_type": "full_time",
            "salary_range": "$170k - $210k",
            "apply_url": "https://discord.com/careers/backend-platform",
            "url_hash": _url_hash("https://discord.com/careers/backend-platform-demo"),
            "date_posted": now - timedelta(days=4),
            "is_stale": False,
            "ingested_at": now,
            "description": "Build the platform powering 200M+ users. "
                           "Go, Elixir, Rust across the stack.",
            DEMO_MARKER: True,
        },
        {
            "company": "Replit",
            "role": "Full-Stack Engineer, AI Workflows",
            "location": "San Francisco, CA",
            "remote_status": "hybrid",
            "company_type": "mid",
            "experience_level": "mid",
            "role_type": "full_time",
            "salary_range": "$180k - $230k",
            "apply_url": "https://replit.com/careers/ai-workflows",
            "url_hash": _url_hash("https://replit.com/careers/ai-workflows-demo"),
            "date_posted": now - timedelta(days=2),
            "is_stale": False,
            "ingested_at": now,
            "description": "Ship LLM-powered coding tools used by millions of "
                           "students and indie devs. TypeScript + Python.",
            DEMO_MARKER: True,
        },
    ]


def build_demo_pending_opportunities(
    uid: ObjectId, listing_ids_by_company: dict[str, ObjectId]
) -> list[dict]:
    """Two autopilot-style pending opportunities pointing at the seeded listings."""
    now = datetime.now(timezone.utc)
    base = {"user_id": uid, "status": "pending", DEMO_MARKER: True}
    opps: list[dict] = []

    if "Discord" in listing_ids_by_company:
        opps.append({
            **base,
            "source": "autopilot",
            "job_listing_id": listing_ids_by_company["Discord"],
            "match_score": 88,
            "match_reason": "Your Go and event-driven systems experience lines "
                            "up with the Platform team. Recent open-source work "
                            "on real-time messaging matches the role.",
            "cover_letter": {
                "subject": "Backend Engineer, Platform application",
                "body": "Hi Discord team,\n\nI've been a heavy user since 2018 "
                        "and I've shipped event-driven Go services that handle "
                        "real-time fanout at meaningful scale. I'd love to chat "
                        "about the Platform role.\n\nBest,\nJoseph",
            },
            "resume_tips": {
                "summary": "Two small tweaks would push this resume past the "
                           "Discord screen.",
                "bullet_suggestions": [
                    "Quantify the WebSocket fanout numbers from your Vimes work.",
                    "Add a one-line mention of Elixir exposure (even if minor).",
                ],
            },
            "talking_points": [
                "Ask about their move from Cassandra to ScyllaDB",
                "Mention the talk by Stanislav Vishnevskiy on real-time at scale",
                "Be ready for a system design on rate limiting voice channels",
            ],
            "created_at": now - timedelta(hours=18),
        })

    if "Replit" in listing_ids_by_company:
        opps.append({
            **base,
            "source": "autopilot",
            "job_listing_id": listing_ids_by_company["Replit"],
            "match_score": 82,
            "match_reason": "Your Next.js + Python full-stack background fits "
                            "the AI Workflows team. Bonus: you've written about "
                            "LLM-tooling tradeoffs publicly.",
            "cover_letter": {
                "subject": "Full-Stack Engineer, AI Workflows application",
                "body": "Hi Replit team,\n\nReplit Agent is one of the few "
                        "LLM products I actually use every week. I'd love to "
                        "help ship more of that experience and bring my "
                        "full-stack + ML background to the AI Workflows team."
                        "\n\nBest,\nJoseph",
            },
            "resume_tips": {
                "summary": "Lead with the LLM project, not the backend tenure.",
                "bullet_suggestions": [
                    "Move the Anthropic / OpenRouter experience to the top.",
                    "Drop the older internship to free a line.",
                ],
            },
            "talking_points": [
                "Compare Replit Agent to Cursor and Continue.dev",
                "Ask about their evaluation harness for code-generation quality",
                "Bring up your work on prompt caching",
            ],
            "created_at": now - timedelta(hours=6),
        })

    return opps
