"""Morning brief aggregator: assembles daily action sections and persists briefs."""

import asyncio
import datetime as dt
from dataclasses import asdict, dataclass, field
from zoneinfo import ZoneInfo

import structlog
from bson import ObjectId

from applications.fit_display import get_display_fit
from auth.constants import (
    DEFAULT_MORNING_BRIEF_HOUR,
    DEFAULT_MORNING_BRIEF_IN_APP,
    DEFAULT_TIMEZONE,
)
from database import get_collection

logger = structlog.get_logger()

HIGH_MATCH_THRESHOLD = 80
MAX_SECTION_ITEMS = 5
MAX_PENDING_APPROVALS = 3
INTERVIEW_LOOKAHEAD_DAYS = 1
NOTIFICATION_TYPE_MORNING_BRIEF = "morning_brief_ready"

# NEVER send email via Gmail API — drafts are user-initiated only.


@dataclass
class BriefItem:
    title: str
    body: str
    action_url: str
    prep_ready: bool = False


@dataclass
class MorningBriefSections:
    follow_ups: list[BriefItem] = field(default_factory=list)
    interviews: list[BriefItem] = field(default_factory=list)
    high_matches: list[BriefItem] = field(default_factory=list)
    pending_approvals: list[BriefItem] = field(default_factory=list)


@dataclass
class MorningBrief:
    user_id: str
    date: str
    sections: MorningBriefSections
    summary_line: str


def _local_date_for_user(user_doc: dict, when: dt.datetime | None = None) -> str:
    """Return YYYY-MM-DD for the user's timezone."""
    tz_name = user_doc.get("timezone", DEFAULT_TIMEZONE)
    tz = ZoneInfo(tz_name)
    moment = (when or dt.datetime.now(dt.timezone.utc)).astimezone(tz)
    return moment.date().isoformat()


def _build_summary_line(sections: MorningBriefSections, pending_count: int = 0) -> str:
    parts: list[str] = []
    if pending_count > 0:
        match_word = "match" if pending_count == 1 else "matches"
        parts.append(f"I found {pending_count} great {match_word} overnight")
    if sections.follow_ups:
        parts.append(f"{len(sections.follow_ups)} follow-up{'s' if len(sections.follow_ups) != 1 else ''}")
    if sections.interviews:
        parts.append(f"{len(sections.interviews)} interview{'s' if len(sections.interviews) != 1 else ''}")
    if sections.high_matches:
        parts.append(f"{len(sections.high_matches)} high match{'es' if len(sections.high_matches) != 1 else ''}")
    if not parts:
        return "You're all caught up today"
    return ", ".join(parts)


def _sections_to_dict(sections: MorningBriefSections) -> dict:
    return {key: [asdict(item) for item in getattr(sections, key)] for key in (
        "follow_ups", "interviews", "high_matches", "pending_approvals",
    )}


def _sections_from_dict(data: dict) -> MorningBriefSections:
    return MorningBriefSections(
        follow_ups=[BriefItem(**item) for item in data.get("follow_ups", [])],
        interviews=[BriefItem(**item) for item in data.get("interviews", [])],
        high_matches=[BriefItem(**item) for item in data.get("high_matches", [])],
        pending_approvals=[BriefItem(**item) for item in data.get("pending_approvals", [])],
    )


async def _fetch_follow_ups(uid: ObjectId, today_start: dt.datetime) -> list[BriefItem]:
    apps_col = get_collection("applications")
    docs = await apps_col.find(
        {
            "user_id": uid,
            "archived": {"$ne": True},
            "follow_up_date": {"$lt": today_start, "$ne": None},
        },
        {"_id": 1, "company": 1, "role_title": 1},
    ).sort("follow_up_date", 1).limit(MAX_SECTION_ITEMS).to_list(length=MAX_SECTION_ITEMS)
    items: list[BriefItem] = []
    for doc in docs:
        company = doc.get("company") or "Unknown"
        app_id = str(doc["_id"])
        items.append(BriefItem(
            title=f"{company} — follow-up overdue",
            body="Generate a draft on demand in the detail panel",
            action_url=f"/dashboard?selected={app_id}&action=follow-up",
        ))
    return items


async def _fetch_interviews(uid: ObjectId, today: dt.date, lookahead: dt.date) -> list[BriefItem]:
    events_col = get_collection("calendar_events")
    apps_col = get_collection("applications")
    today_start = dt.datetime.combine(today, dt.time.min, tzinfo=dt.timezone.utc)
    lookahead_end = dt.datetime.combine(lookahead, dt.time.max, tzinfo=dt.timezone.utc)
    event_docs = await events_col.find(
        {"user_id": uid, "date": {"$gte": today_start, "$lte": lookahead_end}},
        {"_id": 1, "company": 1, "role_title": 1, "application_id": 1, "date": 1},
    ).sort("date", 1).limit(MAX_SECTION_ITEMS).to_list(length=MAX_SECTION_ITEMS)

    app_ids = [e["application_id"] for e in event_docs if e.get("application_id")]
    prep_by_app: dict[str, bool] = {}
    if app_ids:
        app_docs = await apps_col.find(
            {"user_id": uid, "_id": {"$in": app_ids}},
            {"interview_prep_briefing": 1},
        ).to_list(length=len(app_ids))
        prep_by_app = {
            str(a["_id"]): bool(a.get("interview_prep_briefing"))
            for a in app_docs
        }

    items: list[BriefItem] = []
    for event in event_docs:
        company = event.get("company") or "Unknown"
        role = event.get("role_title") or "Interview"
        app_id = event.get("application_id")
        prep_ready = prep_by_app.get(str(app_id), False) if app_id else False
        action_url = f"/dashboard?selected={app_id}" if app_id else "/calendar"
        items.append(BriefItem(
            title=f"{company} — {role}",
            body="Interview prep ready" if prep_ready else "Review interview details",
            action_url=action_url,
            prep_ready=prep_ready,
        ))
    return items


async def _fetch_high_matches(uid: ObjectId) -> list[BriefItem]:
    apps_col = get_collection("applications")
    docs = await apps_col.find(
        {"user_id": uid, "archived": {"$ne": True}},
        {"_id": 1, "company": 1, "role_title": 1, "ai_analysis": 1, "fit_score": 1, "fit_score_reason": 1},
    ).sort("updated_at", -1).limit(50).to_list(length=50)

    scored: list[tuple[int, dict]] = []
    for doc in docs:
        fit = get_display_fit(doc)
        if fit and fit["score"] >= HIGH_MATCH_THRESHOLD:
            scored.append((fit["score"], doc))
    scored.sort(key=lambda pair: pair[0], reverse=True)

    items: list[BriefItem] = []
    for score, doc in scored[:MAX_SECTION_ITEMS]:
        company = doc.get("company") or "Unknown"
        role = doc.get("role_title") or "Role"
        app_id = str(doc["_id"])
        items.append(BriefItem(
            title=f"{company} — {role}",
            body=f"Fit score {score}",
            action_url=f"/dashboard?selected={app_id}",
        ))
    return items


async def _count_pending_approvals(uid: ObjectId) -> int:
    pending_col = get_collection("pending_opportunities")
    return await pending_col.count_documents({"user_id": uid, "status": "pending"})


async def _fetch_pending_approvals(uid: ObjectId) -> list[BriefItem]:
    pending_col = get_collection("pending_opportunities")
    docs = await pending_col.find(
        {"user_id": uid, "status": "pending"},
        {"_id": 1, "match_score": 1, "match_reason": 1, "job_listing_id": 1},
    ).sort("match_score", -1).limit(MAX_PENDING_APPROVALS).to_list(length=MAX_PENDING_APPROVALS)

    listings_col = get_collection("job_listings")
    listing_ids = [d["job_listing_id"] for d in docs if d.get("job_listing_id")]
    listings_by_id: dict[str, dict] = {}
    if listing_ids:
        listing_docs = await listings_col.find(
            {"_id": {"$in": listing_ids}},
            {"company": 1, "role": 1},
        ).to_list(length=len(listing_ids))
        listings_by_id = {str(doc["_id"]): doc for doc in listing_docs}

    items: list[BriefItem] = []
    for doc in docs:
        listing = listings_by_id.get(str(doc.get("job_listing_id", "")), {})
        company = listing.get("company") or "Unknown"
        role = listing.get("role") or "Role"
        score = doc.get("match_score", 0)
        items.append(BriefItem(
            title=f"{company} — {role}",
            body=f"Match score {score}",
            action_url="/inbox/pending",
        ))
    return items


async def build_morning_brief(user_id: str, local_date: str | None = None) -> MorningBrief:
    """Assemble morning brief sections for a user."""
    uid = ObjectId(user_id)
    users_col = get_collection("users")
    user = await users_col.find_one({"_id": uid})
    if not user:
        raise ValueError(f"User not found: {user_id}")

    tz = ZoneInfo(user.get("timezone", DEFAULT_TIMEZONE))
    now_local = dt.datetime.now(dt.timezone.utc).astimezone(tz)
    brief_date = local_date or now_local.date().isoformat()
    today = dt.date.fromisoformat(brief_date)
    today_start = dt.datetime.combine(today, dt.time.min, tzinfo=dt.timezone.utc)
    lookahead = today + dt.timedelta(days=INTERVIEW_LOOKAHEAD_DAYS)

    follow_ups, interviews, high_matches, pending_approvals, pending_count = await asyncio.gather(
        _fetch_follow_ups(uid, today_start),
        _fetch_interviews(uid, today, lookahead),
        _fetch_high_matches(uid),
        _fetch_pending_approvals(uid),
        _count_pending_approvals(uid),
    )
    sections = MorningBriefSections(
        follow_ups=follow_ups,
        interviews=interviews,
        high_matches=high_matches,
        pending_approvals=pending_approvals,
    )
    return MorningBrief(
        user_id=user_id,
        date=brief_date,
        sections=sections,
        summary_line=_build_summary_line(sections, pending_count),
    )


async def generate_and_store_brief(user_id: str, local_date: str | None = None) -> dict:
    """Build and upsert today's brief document; return the stored doc."""
    brief = await build_morning_brief(user_id, local_date)
    col = get_collection("morning_briefs")
    uid = ObjectId(user_id)
    now = dt.datetime.now(dt.timezone.utc)
    set_fields = {
        "user_id": uid,
        "date": brief.date,
        "sections": _sections_to_dict(brief.sections),
        "summary_line": brief.summary_line,
    }
    await col.update_one(
        {"user_id": uid, "date": brief.date},
        {"$set": set_fields, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    stored = await col.find_one({"user_id": uid, "date": brief.date})
    logger.info("morning_brief_stored", user_id=user_id, date=brief.date)
    return stored


async def get_brief_for_date(user_id: str, local_date: str) -> dict | None:
    """Return a stored brief for the user and local date, if present."""
    col = get_collection("morning_briefs")
    return await col.find_one({"user_id": ObjectId(user_id), "date": local_date})


async def list_brief_history(user_id: str, days: int = 7) -> list[dict]:
    """Return stored briefs for the past N local dates, newest first."""
    users_col = get_collection("users")
    user = await users_col.find_one({"_id": ObjectId(user_id)}, {"timezone": 1})
    tz = ZoneInfo((user or {}).get("timezone", DEFAULT_TIMEZONE))
    today = dt.datetime.now(dt.timezone.utc).astimezone(tz).date()
    dates = [(today - dt.timedelta(days=offset)).isoformat() for offset in range(days)]
    col = get_collection("morning_briefs")
    cursor = col.find({"user_id": ObjectId(user_id), "date": {"$in": dates}}).sort("date", -1)
    return await cursor.to_list(length=days)


def brief_doc_to_response(doc: dict) -> dict:
    """Map a morning_briefs document to an API-friendly dict."""
    return {
        "date": doc["date"],
        "sections": doc.get("sections", {}),
        "summary_line": doc.get("summary_line", ""),
        "created_at": doc.get("created_at"),
    }
