# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Pipelined is a job application tracking platform (FARM stack + Chrome Extension). Users capture applications via a one-click Chrome extension or manual entry, track them in a pipeline dashboard, view interviews on a calendar, and browse a curated job board. Agentic features (Morning Brief, Resume Insights, Application Autopilot) use OpenRouter as the canonical LLM provider.

**Stack:** FastAPI (Python 3.12) · React 18 + Vite · MongoDB Atlas (Motor async) · Chrome Extension MV3 · TailwindCSS · AWS ECS Fargate

### Product Policy (agentic features)

- **No auto-send** — follow-up drafts are generated on demand; users copy and send manually. Gmail sync is read-only ingestion; no `messages.send` paths.
- **No PDF/resume edit** — Resume Insights and Autopilot resume tips are suggest-only; stored resume files are never modified.
- **No auto-apply** — Autopilot approve creates a "To Apply" pipeline entry with a cover-letter draft; the user applies externally.

---

## Commands

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload                          # dev server
pytest tests/                                      # all tests
pytest tests/test_applications.py::test_name       # single test
pytest tests/ -x                                   # stop on first failure
```

Tests require a real MongoDB instance — set `MONGO_URI` in `.env` to point to a test cluster. Never mock the database.

### Frontend
```bash
cd frontend
npm install
npm run dev                                        # Vite dev server
npm test                                           # Vitest
npm run test -- --reporter=verbose src/components/StatsBar.test.jsx  # single file
npm run build                                      # production build
```

### Extension
```bash
cd extension
npm install
npm test                                           # run extension tests
# Load unpacked in chrome://extensions (no build step for content/background scripts)
```

---

## Architecture

### Monorepo Boundaries

```
/backend     → Python only. FastAPI, Motor, APScheduler.
/frontend    → JS/JSX only. React 18, Vite, TailwindCSS, React Query.
/extension   → JS/CSS/HTML only. Chrome MV3 (no build framework).
/shared      → JSON schemas and constants shared across boundaries. No runtime code.
```

**Never import across boundaries at runtime.** Frontend calls the backend via REST API only. Shared types live in `/shared` or are duplicated with a `// SYNC:` comment.

### Backend: Router / Service / Schema Split (hard rule)

Every feature module has exactly three files (`router.py`, `service.py`, `schemas.py`). Key backend modules:

| Module | Path | Purpose |
|--------|------|---------|
| `auth` | `backend/auth/` | JWT auth, OAuth, user prefs (timezone, morning brief, autopilot) |
| `applications` | `backend/applications/` | CRUD, fit scoring, follow-up drafts |
| `resume_insights` | `backend/applications/resume_insights/` | `POST /api/applications/{id}/resume-insights` |
| `interview_prep` | `backend/applications/interview_prep/` | Agent loop (Exa + Gemini), fit score |
| `brief` | `backend/brief/` | `GET /api/brief/today`, `/history` |
| `autopilot` | `backend/autopilot/` | Match scorer, nightly scan, pending opportunities API |
| `ai` | `backend/ai/openrouter_client.py` | OpenRouter `complete_json()` for agent features |
| `notifications` | `backend/notifications/` | Digest, morning brief aggregator + scheduler, in-app notifications |
| `parsing` | `backend/parsing/` | OpenAI resume parsing, `ai_cache` quota/budget |
| `jobs` | `backend/jobs/` | Job board API, GitHub sync, APScheduler factory (`sync.py`) |
| `email_integration` | `backend/email_integration/` | Gmail OAuth, read-only sync, email classifier |
| `cal` | `backend/cal/` | Calendar events |

`HTTPException` is raised only in `router.py`. Services raise domain exceptions (e.g., `DuplicateApplicationError`) that routers map to HTTP status codes.

Each module follows the router / service / schema split:

| File | Contains |
|------|----------|
| `router.py` | Route handlers, dependency injection, HTTP response construction. No business logic. |
| `service.py` | Business logic, DB queries via Motor, LLM calls. No HTTP concepts. |
| `schemas.py` | Pydantic request/response models. No DB calls. |

### Frontend Layer Separation

```
api/        → Axios functions. No React imports. Thin wrappers around HTTP calls.
hooks/      → React Query wrappers. Call api/ functions. Return { data, isLoading, error }.
components/ → Reusable UI. Never call api/ directly — use hooks or props.
pages/      → Route-level components. Compose from components/. No business logic.
lib/        → Pure functions, zero React imports.
```

Server data always goes through React Query (`useQuery`/`useMutation`), never `useState`.

### Extension Layer Separation

| Layer | Responsibility |
|-------|---------------|
| Content script | DOM detection, data extraction, banner injection via Shadow DOM |
| Service worker | All network I/O (API calls), token management, message routing |
| Popup | Renders cached data from `chrome.storage.local` only — never blocks on network |

Content scripts **never** call the Pipelined API directly. They extract and `sendMessage` to the service worker.

### Key Data Flows

- **Extension save:** Content script detects job page → extracts fields → sends to service worker → service worker POSTs to `/api/applications`. For Workday/unstructured pages, page text is sent for OpenAI GPT-4o mini fallback parsing.
- **GitHub job sync:** APScheduler job `github_sync` (daily, configurable hour UTC, default 3 AM) polls configured GitHub repos, deduplicating by `url_hash`. Feeds job board and Autopilot scan.
- **Morning Brief:** Scheduler job `morning_brief` runs hourly at `:15` UTC. `send_due_morning_briefs()` generates one brief per user per local date when local hour matches `morning_brief_hour` (default 8). Persists to `morning_briefs` collection; optional SMTP email + `morning_brief_ready` in-app notification.
- **Autopilot scan:** Scheduler job `autopilot_scan` runs daily at 05:00 UTC. Scores listings via OpenRouter, generates cover letter + resume tips, inserts into `pending_opportunities`. User reviews at `/inbox/pending`; approve creates application at stage "To Apply".
- **Resume Insights:** User pastes job description on application → `POST /api/applications/{id}/resume-insights` → OpenRouter JSON response cached on application as `resume_insights`.
- **Auth:** JWT access tokens (15 min) + refresh tokens (7 days) stored as httpOnly cookies. Extension uses Bearer tokens stored in `chrome.storage.session`.

### APScheduler Jobs (`backend/jobs/sync.py`)

| Job ID | Schedule | Handler |
|--------|----------|---------|
| `github_sync` | Daily at `GITHUB_SYNC_HOUR_UTC` (default 3) | `sync_github_repos` |
| `weekly_digest` | Mondays 08:00 UTC (gated by `weekly_digest_enabled`) | `send_all_digests` |
| `purge_deleted` | Daily 04:00 UTC | `purge_stale_deleted_applications` |
| `morning_brief` | Hourly at `:15` UTC | `send_due_morning_briefs` |
| `generate_notifications` | Hourly at `:00` UTC | `generate_notifications` |
| `gmail_sync` | Every `GMAIL_SYNC_INTERVAL_HOURS` (default 4) | `sync_all_users` (read-only) |
| `autopilot_scan` | Daily 05:00 UTC | `autopilot_scan` |

---

## Style Rules

> **MANDATORY:** Before writing any code, read the relevant style guides:
> - **All work:** Read `STYLE_GUIDE.md` (root) first — universal rules that apply everywhere.
> - **Backend (`/backend/**`):** Also read `backend/python.md` and `backend/mongodb.md`.
> - **Frontend (`/frontend/**`):** Also read `frontend/react.md`.
> - **Extension (`/extension/**`):** Also read `extension/extension.md`.
>
> These guides are the source of truth. The constraints below are a quick-reference summary only — the full guides take precedence.

### Critical Constraints

- **300-line file limit, 40-line function limit.** Split if exceeded.
- **No barrel re-exports.** Every import points to the source file. For `lucide-react`, `recharts`, `date-fns`, `lodash` use direct subpath imports (e.g., `lucide-react/dist/esm/icons/check`).
- **Async waterfall prevention.** Use `asyncio.gather()` for independent async operations on the backend. Never await sequentially when calls can run in parallel.
- **Every query on `applications` and `calendar_events` must include `user_id` in the filter.** Missing `user_id` is a security bug.
- **No magic values.** Every behavioral constant must be a named constant at module scope or in `config.py`/`constants.js`.
- **Python type annotations required** on every function signature. Use `|` union syntax, not `Optional`.
- **Use `structlog`** for backend logging, never `print()` or bare `logging`.

### API Contract

All responses use the envelope format:
```json
{ "data": { ... } }              // success (single)
{ "data": [...], "meta": {...} } // success (list)
{ "error": { "code", "message", "details" } } // error
```

HTTP methods: GET (read), POST → 201 (create), PATCH → 200 (partial update), DELETE → 204. Never use PUT.

### Testing Rules

- **Python:** Real MongoDB test instance (wipe per-test in `conftest.py`). Mock only OpenAI and GitHub API.
- **Frontend:** Vitest + React Testing Library + MSW for API mocking. Query by role/text/label.
- **Extension:** JSDOM fixtures for content script tests; `jest-chrome` for service worker tests.
- Test naming: `test_<behavior>` (Python), `describe + it("should <behavior>")` (JS).
- Structure: Arrange → Act → Assert with blank lines between sections.
