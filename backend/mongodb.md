# Style Guide — MongoDB & Motor

**Scope:** All database access in `/backend`  
**Runtime:** Motor 3.4+ (async), MongoDB Atlas 7.x  
**Load alongside:** `STYLE_GUIDE.md`, `style/python.md`

---

## 1. Access Pattern

- **All database calls go through service files.** Router files never import `database.py` or call Motor directly.
- **One collection reference pattern.** Access collections via `database.get_collection()`, never by re-instantiating the client.

```python
# CORRECT — in service.py
from database import get_collection

async def get_application(user_id: ObjectId, app_id: ObjectId) -> dict | None:
    col = get_collection("applications")
    return await col.find_one({"_id": app_id, "user_id": user_id})

# WRONG — in router.py
from motor.motor_asyncio import AsyncIOMotorClient
client = AsyncIOMotorClient(...)  # Never instantiate clients outside database.py
```

---

## 2. Query Rules

### 2.1 Always Scope by `user_id`

**Every query on `applications` and `calendar_events` must include `user_id` in the filter.** This is a security rule, not a suggestion. A missing `user_id` filter leaks data across users.

```python
# CORRECT
await col.find_one({"_id": app_id, "user_id": user_id})

# CRITICAL BUG — returns any user's application
await col.find_one({"_id": app_id})
```

### 2.2 Projection

- **Always use projection to return only needed fields** for list queries. Never return full documents when a list endpoint only shows 5 fields.
- **Omit projection for detail queries** where the full document is needed (e.g., detail panel).

```python
# List query — project only what the list row displays
async def list_applications(user_id: ObjectId, filters: dict) -> list[dict]:
    col = get_collection("applications")
    cursor = col.find(
        {"user_id": user_id, **build_filter(filters)},
        projection={
            "role_title": 1,
            "company": 1,
            "current_stage": 1,
            "date_applied": 1,
            "source": 1,
            "updated_at": 1,
            "tags": 1,
        },
    )
    return await cursor.sort("date_applied", -1).to_list(length=50)

# Detail query — full document
async def get_application(user_id: ObjectId, app_id: ObjectId) -> dict | None:
    return await col.find_one({"_id": app_id, "user_id": user_id})
```

### 2.3 Cursor-Based Pagination (Applications)

Never use `skip()` for paginated application lists. It scans skipped documents and is O(n).

```python
async def list_applications(
    user_id: ObjectId,
    cursor: str | None,
    limit: int = 50,
    sort_by: str = "date_applied",
    sort_order: int = -1,
) -> tuple[list[dict], str | None]:
    col = get_collection("applications")

    query = {"user_id": user_id}

    if cursor:
        cursor_id = ObjectId(cursor)
        if sort_order == -1:
            query["_id"] = {"$lt": cursor_id}
        else:
            query["_id"] = {"$gt": cursor_id}

    docs = await (
        col.find(query)
        .sort([(sort_by, sort_order), ("_id", sort_order)])
        .limit(limit + 1)  # Fetch one extra to determine if there's a next page
        .to_list(length=limit + 1)
    )

    has_next = len(docs) > limit
    if has_next:
        docs = docs[:limit]

    next_cursor = str(docs[-1]["_id"]) if has_next and docs else None
    return docs, next_cursor
```

### 2.4 Offset Pagination (Job Listings)

Job listings are a lower-cardinality, read-only collection. Offset is acceptable here.

```python
async def list_job_listings(filters: dict, page: int = 1, per_page: int = 30) -> tuple[list[dict], int]:
    col = get_collection("job_listings")
    query = build_listing_filter(filters)

    total = await col.count_documents(query)
    docs = await (
        col.find(query)
        .sort("date_posted", -1)
        .skip((page - 1) * per_page)
        .limit(per_page)
        .to_list(length=per_page)
    )
    return docs, total
```

---

## 3. Write Patterns

### 3.1 Insert with Timestamps

Every document insert must include `created_at` and `updated_at` (where the schema defines them).

```python
from datetime import datetime, timezone

async def create_application(user_id: ObjectId, data: dict) -> dict:
    now = datetime.now(timezone.utc)
    doc = {
        **data,
        "user_id": user_id,
        "current_stage": data.get("current_stage", "Applied"),
        "stages": data.get("stages", await get_user_default_stages(user_id)),
        "stage_history": [{"stage": "Applied", "transitioned_at": now}],
        "tags": data.get("tags", []),
        "notes": "",
        "created_at": now,
        "updated_at": now,
    }
    result = await get_collection("applications").insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc
```

### 3.2 Partial Update with `$set`

PATCH operations use `$set` with only the changed fields. Never replace the full document.

```python
async def update_application(user_id: ObjectId, app_id: ObjectId, updates: dict) -> dict | None:
    col = get_collection("applications")
    now = datetime.now(timezone.utc)

    # Build $set payload — only non-None fields from the update
    set_fields = {k: v for k, v in updates.items() if v is not None}
    set_fields["updated_at"] = now

    # If stage changed, also append to stage_history
    push_ops = {}
    if "current_stage" in set_fields:
        push_ops["stage_history"] = {
            "stage": set_fields["current_stage"],
            "transitioned_at": now,
        }

    update_doc = {"$set": set_fields}
    if push_ops:
        update_doc["$push"] = push_ops

    result = await col.find_one_and_update(
        {"_id": app_id, "user_id": user_id},
        update_doc,
        return_document=True,  # return the updated document
    )
    return result
```

### 3.3 Cascade Delete with Transaction

When deleting an application, also delete its linked calendar events. Use a multi-document transaction.

```python
async def delete_application(user_id: ObjectId, app_id: ObjectId) -> bool:
    client = get_client()
    async with await client.start_session() as session:
        async with session.start_transaction():
            apps = get_collection("applications")
            events = get_collection("calendar_events")

            result = await apps.delete_one(
                {"_id": app_id, "user_id": user_id},
                session=session,
            )
            if result.deleted_count == 0:
                return False

            await events.delete_many(
                {"application_id": app_id, "user_id": user_id},
                session=session,
            )
            return True
```

### 3.4 Upsert for Job Listings

Ingested listings use `url_hash` as the dedup key. Upsert to avoid duplicate insert errors.

```python
async def upsert_listing(listing: dict) -> None:
    col = get_collection("job_listings")
    await col.update_one(
        {"url_hash": listing["url_hash"]},
        {
            "$set": listing,
            "$setOnInsert": {"ingested_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )
```

---

## 4. Aggregation Pipelines

### 4.1 Stats Computation

```python
async def compute_stats(user_id: ObjectId) -> dict:
    col = get_collection("applications")
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$facet": {
            "total": [{"$count": "count"}],
            "active": [
                {"$match": {"current_stage": {"$nin": ["Rejected", "Offer"]}}},
                {"$count": "count"},
            ],
            "with_response": [
                {"$match": {"stage_history.1": {"$exists": True}}},  # More than 1 entry = at least one transition
                {"$count": "count"},
            ],
            "avg_response_days": [
                {"$match": {"stage_history.1": {"$exists": True}}},
                {"$project": {
                    "days": {
                        "$dateDiff": {
                            "startDate": {"$arrayElemAt": ["$stage_history.transitioned_at", 0]},
                            "endDate": {"$arrayElemAt": ["$stage_history.transitioned_at", 1]},
                            "unit": "day",
                        }
                    }
                }},
                {"$group": {"_id": None, "avg": {"$avg": "$days"}}},
            ],
        }},
    ]
    result = (await col.aggregate(pipeline).to_list(length=1))[0]

    total = result["total"][0]["count"] if result["total"] else 0
    active = result["active"][0]["count"] if result["active"] else 0
    with_response = result["with_response"][0]["count"] if result["with_response"] else 0
    avg_days = round(result["avg_response_days"][0]["avg"], 1) if result["avg_response_days"] else None

    return {
        "total_applied": total,
        "active_count": active,
        "response_rate": round(with_response / total, 2) if total > 0 else 0,
        "avg_days_to_first_response": avg_days,
    }
```

### 4.2 Aggregation Rules

- **Always start with `$match` to reduce the working set.** MongoDB pushes `$match` early in the pipeline and can use indexes.
- **Use `$facet` for multi-stat queries** instead of running separate aggregations. One round trip beats four.
- **Limit `$unwind` usage.** It explodes array fields into separate documents, which kills performance on large arrays. For `stage_history` analysis, use `$arrayElemAt` or `$first`/`$last` instead.

---

## 5. Indexing

### 5.1 Required Indexes

These must exist before any queries run. Create them in the database setup script or migration.

```python
async def ensure_indexes():
    apps = get_collection("applications")
    await apps.create_index([("user_id", 1), ("date_applied", -1)], name="user_date")
    await apps.create_index(
        [("user_id", 1), ("company", 1), ("role_title", 1)],
        name="duplicate_guard",
        unique=True,
    )
    await apps.create_index([("user_id", 1), ("updated_at", 1)], name="user_updated")

    events = get_collection("calendar_events")
    await events.create_index([("user_id", 1), ("date", 1)], name="user_date")
    await events.create_index([("application_id", 1)], name="app_id")

    listings = get_collection("job_listings")
    await listings.create_index("url_hash", unique=True, name="url_dedup")
    await listings.create_index([("is_stale", 1), ("date_posted", -1)], name="stale_date")
    await listings.create_index([("experience_level", 1), ("remote_status", 1)], name="filters")

    users = get_collection("users")
    await users.create_index("email", unique=True, name="email")
    await users.create_index("google_id", unique=True, sparse=True, name="google_id")
```

### 5.2 Index Rules

- **Every query pattern must be covered by an index.** If you write a new query that filters or sorts on a field combination, add an index. No collection scans in production.
- **Compound indexes follow the ESR rule:** Equality fields first, Sort fields second, Range fields last. This gives MongoDB the best index utilization.
- **Never add an index speculatively.** Indexes cost write performance and storage. Only index for proven query patterns.

```python
# Query: find user's applications, sorted by date, filtered by stage
# Filter: { user_id: EQUAL, current_stage: EQUAL, date_applied: SORT }
# ESR index: { user_id: 1, current_stage: 1, date_applied: -1 }
```

---

## 6. Connection Resilience

```python
# database.py — retry and timeout configuration
client = AsyncIOMotorClient(
    settings.mongo_uri,
    maxPoolSize=50,               # Connections per process
    minPoolSize=5,                # Keep warm connections
    retryWrites=True,             # Auto-retry write failures
    retryReads=True,              # Auto-retry read failures
    serverSelectionTimeoutMS=5000, # Fail fast if cluster unreachable
    connectTimeoutMS=3000,        # TCP connect timeout
    socketTimeoutMS=10000,        # Per-operation timeout
    maxIdleTimeMS=60000,          # Close idle connections after 1 min
)
```

- **Never set `w=0` (unacknowledged writes).** All writes must be acknowledged. Data loss is not an acceptable trade-off for speed.
- **`[PREFER]` Use `w="majority"` for critical writes** (user creation, application creation). Default `w=1` is fine for updates.
