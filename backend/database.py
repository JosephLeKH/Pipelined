"""Motor async MongoDB client initialization and collection accessors."""

import asyncio

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorCollection, AsyncIOMotorDatabase

from config import settings
from copilot.constants import COPILOT_SESSION_TTL_SECONDS

MAX_POOL_SIZE = 50
SERVER_SELECTION_TIMEOUT_MS = 5000

client: AsyncIOMotorClient | None = None
db: AsyncIOMotorDatabase | None = None


async def connect() -> None:
    """Initialize Motor client and database reference."""
    global client, db
    client = AsyncIOMotorClient(
        settings.mongo_uri,
        maxPoolSize=MAX_POOL_SIZE,
        retryWrites=True,
        retryReads=True,
        serverSelectionTimeoutMS=SERVER_SELECTION_TIMEOUT_MS,
    )
    db = client[settings.mongo_db_name]


async def disconnect() -> None:
    """Close Motor client connection."""
    global client
    if client:
        client.close()
        client = None


def get_client() -> AsyncIOMotorClient:
    """Return the active Motor client (required for transactions)."""
    if client is None:
        raise RuntimeError("Database not connected. Call connect() first.")
    return client


def get_collection(name: str) -> AsyncIOMotorCollection:
    """Return a collection reference from the active database."""
    if db is None:
        raise RuntimeError("Database not connected. Call connect() first.")
    return db[name]


async def _ensure_app_event_listing_indexes(
    apps: AsyncIOMotorCollection,
    events: AsyncIOMotorCollection,
    listings: AsyncIOMotorCollection,
) -> None:
    """Create indexes for applications, calendar_events, and job_listings."""
    await asyncio.gather(
        apps.create_index([("user_id", 1), ("date_applied", -1)], name="user_date"),
        apps.create_index(
            [("user_id", 1), ("company", 1), ("role_title", 1)],
            name="duplicate_guard",
            unique=True,
        ),
        apps.create_index([("user_id", 1), ("updated_at", 1)], name="user_updated"),
        apps.create_index(
            [("role_title", "text"), ("company", "text"), ("notes", "text"), ("tags", "text")],
            name="application_text_search",
        ),
        events.create_index([("user_id", 1), ("date", 1)], name="user_date"),
        events.create_index([("application_id", 1)], name="app_id"),
        listings.create_index("url_hash", unique=True, name="url_dedup"),
        listings.create_index([("is_stale", 1), ("date_posted", -1)], name="stale_date"),
        listings.create_index(
            [("experience_level", 1), ("remote_status", 1)], name="filters"
        ),
        listings.create_index(
            [("role", "text"), ("company", "text"), ("description", "text")],
            name="job_text_search",
        ),
    )


async def _ensure_user_support_indexes(
    users: AsyncIOMotorCollection,
    shares: AsyncIOMotorCollection,
    contacts: AsyncIOMotorCollection,
    notifications: AsyncIOMotorCollection,
    ai_cache: AsyncIOMotorCollection,
    ai_budget: AsyncIOMotorCollection,
    app_templates: AsyncIOMotorCollection,
) -> None:
    """Create indexes for users, shares, contacts, notifications, AI cache/budget, and templates."""
    await asyncio.gather(
        users.create_index("email", unique=True, name="email"),
        users.create_index("google_id", unique=True, sparse=True, name="google_id"),
        users.create_index("referral_code", unique=True, sparse=True, name="referral_code"),
        shares.create_index("slug", unique=True, name="slug_unique"),
        shares.create_index("expires_at", expireAfterSeconds=0, name="expires_at_ttl"),
        contacts.create_index([("user_id", 1), ("name", 1)], name="contact_user_name"),
        contacts.create_index([("user_id", 1), ("company", 1)], name="contact_user_company"),
        notifications.create_index([("user_id", 1), ("created_at", -1)], name="notif_user_date"),
        notifications.create_index([("user_id", 1), ("read", 1)], name="notif_user_read"),
        notifications.create_index("created_at", expireAfterSeconds=30 * 24 * 3600, name="notif_ttl"),
        ai_cache.create_index("cache_key", unique=True, name="cache_key_unique"),
        ai_cache.create_index("created_at", expireAfterSeconds=30 * 24 * 3600, name="cache_ttl"),
        ai_budget.create_index("month", unique=True, name="month_unique"),
        app_templates.create_index([("user_id", 1), ("created_at", -1)], name="template_user_date"),
    )


async def ensure_indexes() -> None:
    """Create all required MongoDB indexes. Safe to call on every startup (idempotent)."""
    apps = get_collection("applications")
    events = get_collection("calendar_events")
    listings = get_collection("job_listings")
    users = get_collection("users")
    shares = get_collection("shares")
    contacts = get_collection("contacts")
    notifications = get_collection("notifications")
    ai_cache = get_collection("ai_cache")
    ai_budget = get_collection("ai_budget")
    app_templates = get_collection("application_templates")
    undo_stack = get_collection("undo_stack")
    morning_briefs = get_collection("morning_briefs")
    morning_brief_on_demand = get_collection("morning_brief_on_demand")
    pending_opportunities = get_collection("pending_opportunities")
    recruiter_leads = get_collection("recruiter_leads")
    agent_runs = get_collection("agent_runs")
    weekly_reviews = get_collection("weekly_reviews")
    copilot_sessions = get_collection("copilot_sessions")
    user_embeddings = get_collection("user_embeddings")
    user_embeddings_queue = get_collection("user_embeddings_queue")
    user_job_scores = get_collection("user_job_scores")

    await asyncio.gather(
        _ensure_app_event_listing_indexes(apps, events, listings),
        _ensure_user_support_indexes(users, shares, contacts, notifications, ai_cache, ai_budget, app_templates),
        undo_stack.create_index("expires_at", expireAfterSeconds=0, name="undo_stack_ttl"),
        undo_stack.create_index([("user_id", 1), ("created_at", -1)], name="undo_stack_user_date"),
        morning_briefs.create_index([("user_id", 1), ("date", 1)], unique=True, name="brief_user_date"),
        morning_brief_on_demand.create_index([("user_id", 1), ("created_at", -1)], name="brief_on_demand_user_date"),
        pending_opportunities.create_index([("user_id", 1), ("status", 1)], name="pending_user_status"),
        pending_opportunities.create_index(
            [("user_id", 1), ("job_listing_id", 1)],
            unique=True,
            partialFilterExpression={"status": "pending"},
            name="pending_user_listing_unique",
        ),
        agent_runs.create_index([("user_id", 1), ("created_at", -1)], name="agent_runs_user_date"),
        agent_runs.create_index(
            [("user_id", 1), ("application_id", 1), ("created_at", -1)],
            name="agent_runs_user_app_date",
        ),
        agent_runs.create_index(
            [("agent_type", 1), ("created_at", -1)],
            name="agent_runs_type_date",
        ),
        copilot_sessions.create_index("user_id", unique=True, name="copilot_session_user"),
        copilot_sessions.create_index(
            "updated_at",
            expireAfterSeconds=COPILOT_SESSION_TTL_SECONDS,
            name="copilot_session_ttl",
        ),
        weekly_reviews.create_index(
            [("user_id", 1), ("week_start", 1)], unique=True, name="weekly_review_user_week",
        ),
        recruiter_leads.create_index([("user_id", 1), ("status", 1)], name="recruiter_leads_user_status"),
        recruiter_leads.create_index([("user_id", 1), ("created_at", -1)], name="recruiter_leads_user_date"),
        recruiter_leads.create_index(
            [("user_id", 1), ("company", 1)],
            unique=True,
            partialFilterExpression={"status": "pending"},
            name="recruiter_leads_user_company_unique",
        ),
        user_embeddings.create_index(
            [("user_id", 1), ("source_type", 1)],
            name="user_embeddings_user_source",
        ),
        user_embeddings.create_index(
            "updated_at",
            expireAfterSeconds=7776000,
            name="user_embeddings_ttl",
        ),
        user_embeddings_queue.create_index("user_id", unique=True, name="queue_user_unique"),
        user_job_scores.create_index(
            [("user_id", 1), ("listing_id", 1)],
            unique=True,
            name="user_job_scores_unique",
        ),
        user_job_scores.create_index(
            "computed_at",
            expireAfterSeconds=30 * 24 * 3600,
            name="user_job_scores_ttl",
        ),
    )
