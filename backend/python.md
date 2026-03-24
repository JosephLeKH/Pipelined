# Style Guide — Python & FastAPI

**Scope:** All code in `/backend`  
**Runtime:** Python 3.12, FastAPI, Motor (async MongoDB), Pydantic v2  
**Load alongside:** `STYLE_GUIDE.md` (universal rules), `style/mongodb.md` (query patterns)

---

## 1. Project Structure

```
backend/
├── main.py                  # App factory, router mounts, lifespan
├── config.py                # Pydantic BaseSettings, all env vars
├── database.py              # Motor client init, collection refs
├── middleware/
│   └── rate_limit.py        # slowapi config
├── auth/
│   ├── router.py            # Route handlers only
│   ├── service.py           # Business logic only
│   ├── dependencies.py      # FastAPI Depends() callables
│   └── schemas.py           # Pydantic request/response models
├── applications/
│   ├── router.py
│   ├── service.py
│   └── schemas.py
├── calendar/
│   ├── router.py
│   ├── service.py
│   └── schemas.py
├── jobs/
│   ├── router.py
│   ├── service.py
│   ├── schemas.py
│   └── sync.py              # APScheduler + GitHub ingestion
├── parsing/
│   └── openai_client.py     # GPT-4o mini fallback
├── tests/
│   ├── conftest.py           # Fixtures: test DB, test client, test user factory
│   ├── test_auth.py
│   ├── test_applications.py
│   ├── test_calendar.py
│   ├── test_jobs.py
│   └── test_parsing.py
├── Dockerfile
├── docker-compose.yml
└── requirements.txt
```

### 1.1 The Router / Service / Schema Split

This is a **hard architectural rule**. Every feature module has exactly three files:

| File | Contains | Does NOT contain |
|---|---|---|
| `router.py` | Route handlers (`@router.get`, etc.), dependency injection, HTTP response construction | Business logic, direct DB calls, validation logic |
| `service.py` | Business logic functions, DB queries (via Motor), OpenAI calls, computation | HTTP concepts (Request, Response, status codes, cookies) |
| `schemas.py` | Pydantic models for request bodies, response bodies, query params | Business logic, DB calls |

**Why:** An agent working on business logic only loads `service.py`. An agent working on the API contract only loads `router.py` + `schemas.py`. Separation keeps context windows small and avoids cross-concern edits.

```python
# router.py — CORRECT: thin handler, delegates to service
@router.post("/", status_code=201)
async def create_application(
    body: ApplicationCreate,
    user: UserDoc = Depends(get_current_user),
):
    application = await application_service.create(user["_id"], body)
    return {"data": application}


# router.py — WRONG: business logic in the handler
@router.post("/", status_code=201)
async def create_application(
    body: ApplicationCreate,
    user: UserDoc = Depends(get_current_user),
):
    existing = await db.applications.find_one({"user_id": user["_id"], "company": body.company, "role_title": body.role_title})
    if existing:
        raise HTTPException(409, detail="Duplicate")
    doc = {**body.model_dump(), "user_id": user["_id"], "created_at": datetime.now(timezone.utc)}
    result = await db.applications.insert_one(doc)
    # ... 20 more lines of logic that belongs in service.py
```

---

## 2. Type Annotations

- **Every function signature must have full type annotations.** Parameters and return type. No exceptions.
- **Use `|` union syntax** (Python 3.10+), not `Optional` or `Union`.

```python
# CORRECT
async def get_application(user_id: ObjectId, app_id: ObjectId) -> dict | None:

# WRONG
async def get_application(user_id, app_id):
async def get_application(user_id: ObjectId, app_id: ObjectId) -> Optional[dict]:
```

- **Use TypedDict for MongoDB document shapes** when passing documents between functions. This gives agents type context without ORM overhead.

```python
from typing import TypedDict

class ApplicationDoc(TypedDict):
    _id: ObjectId
    user_id: ObjectId
    role_title: str
    company: str
    current_stage: str
    stages: list[str]
    stage_history: list[dict]
    updated_at: datetime
```

---

## 3. Pydantic Schemas

### 3.1 Schema Naming Convention

```
{Resource}Create     → POST request body
{Resource}Update     → PATCH request body (all fields Optional)
{Resource}Response   → Single resource in response
{Resource}ListQuery  → GET query parameters
```

### 3.2 Schema Rules

- **Always set `model_config = ConfigDict(strict=True)`** on request schemas. This rejects type coercion (e.g., string "123" won't silently become int 123).
- **Response schemas must exclude internal fields** (`password_hash`, `_id` as raw ObjectId). Map `_id` to `id: str` in the response.
- **Use `Field()` for constraints, not custom validators,** when a built-in constraint exists.

```python
from pydantic import BaseModel, ConfigDict, Field

class ApplicationCreate(BaseModel):
    model_config = ConfigDict(strict=True)

    role_title: str = Field(min_length=1, max_length=200)
    company: str = Field(min_length=1, max_length=200)
    source: Literal["extension", "board", "manual"]
    source_url: AnyHttpUrl | None = None
    compensation: str | None = Field(None, max_length=100)
    company_type: Literal["startup", "mid", "enterprise", "gov", "nonprofit", "other"] | None = None
    location: str | None = Field(None, max_length=200)
    remote_status: Literal["remote", "hybrid", "onsite", "unknown"] | None = None
    date_applied: datetime | None = None
    tags: list[str] = Field(default_factory=list, max_length=20)


class ApplicationUpdate(BaseModel):
    model_config = ConfigDict(strict=True)

    role_title: str | None = Field(None, min_length=1, max_length=200)
    company: str | None = Field(None, min_length=1, max_length=200)
    current_stage: str | None = Field(None, min_length=1, max_length=50)
    notes: str | None = None
    tags: list[str] | None = None
    # ... all fields optional for PATCH


class ApplicationResponse(BaseModel):
    id: str
    role_title: str
    company: str
    current_stage: str
    source: str
    date_applied: datetime
    updated_at: datetime
    # ... other fields

    @classmethod
    def from_doc(cls, doc: dict) -> "ApplicationResponse":
        return cls(id=str(doc["_id"]), **{k: doc[k] for k in cls.model_fields if k != "id" and k in doc})
```

---

## 4. FastAPI Patterns

### 4.1 Router Setup

```python
"""Application CRUD route handlers."""

from fastapi import APIRouter, Depends, HTTPException, Query

from auth.dependencies import get_current_user
from applications import service as application_service
from applications.schemas import ApplicationCreate, ApplicationUpdate, ApplicationResponse

router = APIRouter(prefix="/api/applications", tags=["applications"])
```

- **One router per module.** Mounted in `main.py` via `app.include_router(router)`.
- **Always set `prefix` and `tags`** on the router, not on individual routes.

### 4.2 Dependency Injection

- **Auth is always a dependency, never inline.** Never decode JWTs inside a route handler.

```python
# CORRECT — auth as dependency
@router.get("/")
async def list_applications(
    user: dict = Depends(get_current_user),
    sort_by: str = Query("date_applied", pattern="^(date_applied|company|current_stage|updated_at)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
):
    ...

# WRONG — auth inline
@router.get("/")
async def list_applications(request: Request):
    token = request.cookies.get("access_token")
    payload = jwt.decode(token, ...)  # NO. This belongs in dependencies.py
```

### 4.3 Error Raising

- **Use `HTTPException` only in `router.py`.** Service functions return `None` or raise domain-specific exceptions that the router maps to HTTP status codes.

```python
# service.py — raises domain exception
class DuplicateApplicationError(Exception):
    def __init__(self, existing_id: str):
        self.existing_id = existing_id

async def create(user_id: ObjectId, body: ApplicationCreate) -> dict:
    existing = await _check_duplicate(user_id, body.company, body.role_title)
    if existing:
        raise DuplicateApplicationError(str(existing["_id"]))
    ...


# router.py — maps domain exception to HTTP
@router.post("/", status_code=201)
async def create_application(body: ApplicationCreate, user: dict = Depends(get_current_user)):
    try:
        application = await application_service.create(user["_id"], body)
    except DuplicateApplicationError as e:
        raise HTTPException(409, detail={
            "code": "DUPLICATE_APPLICATION",
            "message": f"You've already tracked this role at this company.",
            "details": {"existing_id": e.existing_id},
        })
    return {"data": ApplicationResponse.from_doc(application)}
```

### 4.4 Async Waterfall Prevention

**CRITICAL.** Never await independent operations sequentially. This is the single most impactful performance rule on the backend.

```python
# WRONG — sequential (config blocks on auth, data blocks on both)
async def get_dashboard_data(user_id: ObjectId) -> dict:
    stats = await compute_stats(user_id)
    recent = await get_recent_applications(user_id, limit=5)
    events = await get_upcoming_events(user_id, limit=5)
    return {"stats": stats, "recent": recent, "events": events}

# CORRECT — parallel (all three are independent)
async def get_dashboard_data(user_id: ObjectId) -> dict:
    stats, recent, events = await asyncio.gather(
        compute_stats(user_id),
        get_recent_applications(user_id, limit=5),
        get_upcoming_events(user_id, limit=5),
    )
    return {"stats": stats, "recent": recent, "events": events}
```

When operations have **partial dependencies** (B depends on A, but C is independent):

```python
# CORRECT — start independent work immediately, await dependency only when needed
async def create_from_extension(user_id: ObjectId, body: dict, page_text: str | None) -> dict:
    # Start duplicate check and stage lookup in parallel
    dup_check = check_duplicate(user_id, body["company"], body["role_title"])
    stages_lookup = get_user_default_stages(user_id)

    existing = await dup_check
    if existing:
        raise DuplicateApplicationError(str(existing["_id"]))

    default_stages = await stages_lookup

    # OpenAI fallback only if needed — cannot be parallelized with the above
    if page_text and not body.get("role_title"):
        parsed = await parse_with_openai(page_text)
        body = {**body, **{k: v for k, v in parsed.items() if v and not body.get(k)}}

    return await insert_application(user_id, body, default_stages)
```

### 4.5 Configuration

- **All config via Pydantic `BaseSettings`.** Never call `os.environ` directly outside `config.py`.
- **Every setting has a type, a default (if safe), and a description.**

```python
"""Application configuration from environment variables."""

from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # Database
    mongo_uri: str
    mongo_db_name: str = "pipelined"

    # Auth
    jwt_secret: str
    jwt_access_ttl_minutes: int = 15
    jwt_refresh_ttl_days: int = 7
    google_client_id: str

    # OpenAI
    openai_api_key: str
    openai_model: str = "gpt-4o-mini"
    openai_timeout_seconds: int = 5
    openai_monthly_budget_usd: float = 50.0

    # GitHub Sync
    github_token: str
    github_sync_hour_utc: int = 3
    github_repos: list[str] = ["SimplifyJobs/Summer2026-Internships"]

    # Rate Limiting
    rate_limit_standard: str = "60/minute"
    rate_limit_ai: str = "10/minute"
    rate_limit_auth: str = "5/minute"

    # Application
    stale_application_days: int = 14
    stale_listing_days: int = 60

    model_config = {"env_file": ".env"}

settings = Settings()
```

---

## 5. Async & Concurrency

### 5.1 Motor Client

- **One client per process.** Initialized in `database.py`, shared via module-level reference. Never instantiate Motor inside a request handler.
- **Connection pooling:** Motor manages its own pool. Set `maxPoolSize=50` for the Fargate container (4 uvicorn workers × ~12 connections each).

```python
"""Motor async client initialization."""

from motor.motor_asyncio import AsyncIOMotorClient
from config import settings

client: AsyncIOMotorClient | None = None
db = None

async def connect():
    global client, db
    client = AsyncIOMotorClient(
        settings.mongo_uri,
        maxPoolSize=50,
        retryWrites=True,
        retryReads=True,
        serverSelectionTimeoutMS=5000,
    )
    db = client[settings.mongo_db_name]

async def disconnect():
    global client
    if client:
        client.close()

def get_collection(name: str):
    return db[name]
```

### 5.2 httpx for External Calls

- **Always use `async with httpx.AsyncClient()` or a module-level client.** Never use `requests`.
- **Always set timeouts.** Default httpx timeout is 5 seconds. Override per-call when needed.

```python
# CORRECT — shared client with default timeout
http_client = httpx.AsyncClient(timeout=httpx.Timeout(10.0, connect=3.0))

async def verify_google_token(id_token: str) -> dict:
    response = await http_client.get(
        "https://oauth2.googleapis.com/tokeninfo",
        params={"id_token": id_token},
    )
    response.raise_for_status()
    return response.json()
```

---

## 6. Logging

- **Use `structlog`** for structured JSON logging. Never use `print()` or bare `logging.info()`.
- **Bind context at the request level** (user_id, request_id) so all log lines within a request are correlated.

```python
import structlog

logger = structlog.get_logger()

# In service functions — context is inherited from middleware
async def create(user_id: ObjectId, body: ApplicationCreate) -> dict:
    log = logger.bind(user_id=str(user_id), company=body.company, role=body.role_title)
    log.info("creating_application")

    result = await db.applications.insert_one(doc)
    log.info("application_created", application_id=str(result.inserted_id))
    return doc
```

- **Log events as `snake_case` verb phrases:** `creating_application`, `application_created`, `openai_fallback_triggered`, `github_sync_completed`.
- **Never log request/response bodies at INFO level.** Use DEBUG for payloads.

---

## 7. Testing

### 7.1 Fixtures

```python
# conftest.py
import pytest
from httpx import AsyncClient, ASGITransport
from main import create_app
from database import connect, disconnect, db

@pytest.fixture(scope="session")
async def app():
    application = create_app()
    await connect()  # connects to test DB (MONGO_URI env var points to test cluster)
    yield application
    await disconnect()

@pytest.fixture(autouse=True)
async def clean_db():
    """Wipe all collections before each test."""
    for name in await db.list_collection_names():
        await db[name].delete_many({})

@pytest.fixture
async def client(app):
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c

@pytest.fixture
async def test_user(client):
    """Create a user and return (user_doc, auth_cookies)."""
    response = await client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "TestPass123!",
        "display_name": "Test User",
    })
    cookies = response.cookies
    user = response.json()["data"]
    return user, cookies
```

### 7.2 Test Style

```python
async def test_stage_transition_appends_to_history(client, test_user):
    user, cookies = test_user

    # Arrange — create an application
    create_resp = await client.post("/api/applications", json={
        "role_title": "SWE", "company": "Acme", "source": "manual",
    }, cookies=cookies)
    app_id = create_resp.json()["data"]["id"]

    # Act — transition stage
    await client.patch(f"/api/applications/{app_id}", json={
        "current_stage": "Phone Screen",
    }, cookies=cookies)

    # Assert — history has two entries (initial "Applied" + "Phone Screen")
    get_resp = await client.get(f"/api/applications/{app_id}", cookies=cookies)
    history = get_resp.json()["data"]["stage_history"]
    assert len(history) == 2
    assert history[0]["stage"] == "Applied"
    assert history[1]["stage"] == "Phone Screen"
```
