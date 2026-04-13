# Pipelined

[![CI](https://github.com/josephle/Pipelined/actions/workflows/ci.yml/badge.svg)](https://github.com/josephle/Pipelined/actions/workflows/ci.yml)

Job application tracking platform for students and job seekers. Capture applications with a one-click Chrome extension, track them through a pipeline dashboard, view interviews on a calendar, and browse a curated job board.

**Stack:** FastAPI · React 18 + Vite · MongoDB Atlas · Chrome Extension MV3 · TailwindCSS · AWS ECS Fargate

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Chrome Extension (MV3)                                          │
│  ┌─────────────┐  sendMessage  ┌──────────────┐                 │
│  │Content Script│ ──────────── │Service Worker│ ─── REST API ──►│
│  └─────────────┘               └──────────────┘                 │
└─────────────────────────────────────┬────────────────────────────┘
                                      │ HTTPS
┌─────────────────────────────────────▼────────────────────────────┐
│  FastAPI Backend (Python 3.12)                                   │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │  auth  │ applications │ calendar │ jobs │ parsing │ tags  │    │
│  │  router.py · service.py · schemas.py  (per module)       │    │
│  └──────────────────────────────────────────────────────────┘    │
│  APScheduler (GitHub job sync, daily 3 AM UTC)                   │
└───────────────────────────────┬──────────────────────────────────┘
                                │ Motor (async)
┌───────────────────────────────▼──────────────────────────────────┐
│  MongoDB Atlas                                                   │
│  collections: users, applications, calendar_events, jobs         │
└──────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│  React Frontend (Vite)                                           │
│  pages/ ─► components/ ─► hooks/ ─► api/ ─► Axios ─► Backend   │
│  React Query for server state · react-router-dom for routing    │
└──────────────────────────────────────────────────────────────────┘
```

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| Node | 20+ | For frontend and extension |
| Python | 3.12 | For backend |
| MongoDB | Atlas or local | Set `MONGO_URI` in `.env` |
| Chrome | Any modern | For extension development |

---

## Quick Start

### 1. Clone the repo

```bash
git clone https://github.com/your-org/pipelined.git
cd pipelined
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set MONGO_URI, JWT_SECRET, OPENAI_API_KEY at minimum
```

See [Environment Variables](#environment-variables) for descriptions of each variable.

### 3. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# API available at http://localhost:8000
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
# App available at http://localhost:5173
```

### 5. Load the Chrome extension

1. Open `chrome://extensions` in Chrome
2. Enable **Developer mode**
3. Click **Load unpacked** → select the `/extension` directory
4. The Pipelined icon appears in your toolbar

---

## Running Tests

### Backend

```bash
cd backend
pytest tests/                                            # all tests
pytest tests/test_applications.py::test_name            # single test
pytest tests/ -x                                        # stop on first failure
```

> Backend tests require a real MongoDB instance. Set `MONGO_URI` in `.env` to a test cluster.
> Tests wipe all collections between runs. **Never point at a production cluster.**

### Frontend

```bash
cd frontend
npm test                                                 # all tests (Vitest)
npm run test -- --reporter=verbose src/components/Foo.test.jsx  # single file
npm run build                                            # verify build passes
```

### Extension

```bash
cd extension
npm install
npm test                                                 # Jest + JSDOM
```

---

## Environment Variables

All variables are defined in `.env.example` at the project root.

| Variable | Description | Default |
|----------|-------------|---------|
| `MONGO_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGO_DB_NAME` | Database name | `pipelined` |
| `JWT_SECRET` | Secret key for JWT signing — **change in production** | `change-me-in-production` |
| `JWT_ACCESS_TTL_MINUTES` | Access token lifetime (minutes) | `15` |
| `JWT_REFRESH_TTL_DAYS` | Refresh token lifetime (days) | `7` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID (optional) | — |
| `OPENAI_API_KEY` | OpenAI API key for field extraction fallback | — |
| `OPENAI_MODEL` | Model used for parsing | `gpt-4o-mini` |
| `OPENAI_TIMEOUT_SECONDS` | Per-request timeout for OpenAI calls | `5` |
| `OPENAI_MONTHLY_BUDGET_USD` | Soft monthly budget cap for OpenAI | `50.0` |
| `GITHUB_TOKEN` | GitHub PAT for job sync (read:public_repo scope) | — |
| `GITHUB_SYNC_HOUR_UTC` | Hour of day for the daily GitHub sync | `3` |
| `GITHUB_REPOS` | JSON array of `owner/repo` strings to sync | `["SimplifyJobs/Summer2026-Internships"]` |
| `RATE_LIMIT_STANDARD` | Rate limit for standard endpoints | `60/minute` |
| `RATE_LIMIT_AI` | Rate limit for AI-backed endpoints | `10/minute` |
| `RATE_LIMIT_AUTH` | Rate limit for auth endpoints | `5/minute` |
| `STALE_APPLICATION_DAYS` | Days before an application is marked stale | `14` |
| `STALE_LISTING_DAYS` | Days before a job listing is considered stale | `60` |
| `ALLOWED_ORIGINS` | JSON array of allowed CORS origins | `["http://localhost:5173"]` |

---

## Deployment

### Docker

```bash
# Build and run the backend
docker build -t pipelined-api ./backend
docker run -p 8000:8000 --env-file .env pipelined-api

# Build the frontend (static files)
cd frontend && npm run build
# Serve dist/ with nginx or any static host
```

### AWS ECS Fargate

The production setup runs the FastAPI container on ECS Fargate behind an ALB. The container reads all configuration from ECS task definition environment variables (mapped from AWS Secrets Manager).

Key production checklist:
- Set `JWT_SECRET` to a cryptographically random 64+ character string
- Set `ALLOWED_ORIGINS` to your frontend domain only (no wildcards)
- Set `MONGO_URI` to a MongoDB Atlas connection string with TLS
- Enable CloudWatch log groups for the task

---

## Project Structure

```
/backend     Python — FastAPI, Motor, APScheduler
  /auth        JWT auth, Google OAuth
  /applications CRUD, bulk ops, analytics, CSV export
  /cal         Calendar events and interview prep
  /jobs        Job board sync from GitHub repos
  /parsing     OpenAI fallback field extraction
  /tags        Tag management (list, rename, delete)

/frontend    JavaScript — React 18, Vite, TailwindCSS
  /src/pages        Route-level pages
  /src/components   Reusable UI components
  /src/hooks        React Query wrappers
  /src/api          Axios API functions
  /src/lib          Pure utility functions and constants
  /src/context      React context providers

/extension   JavaScript — Chrome MV3
  /content          Content scripts and board parsers
  /background       Service worker (API calls, auth)
  /popup            Extension popup UI

/shared      JSON schemas and constants (no runtime code)
```

---

## Contributing

Before writing code, read the relevant style guides:

- **All work:** [`STYLE_GUIDE.md`](./STYLE_GUIDE.md)
- **Backend:** [`backend/python.md`](./backend/python.md) · [`backend/mongodb.md`](./backend/mongodb.md)
- **Frontend:** [`frontend/react.md`](./frontend/react.md)
- **Extension:** [`extension/extension.md`](./extension/extension.md)

Key rules:
- 300-line file limit, 40-line function limit
- No barrel re-exports — import directly from source files
- Every MongoDB query on `applications` and `calendar_events` must include `user_id`
- Python type annotations required on every function signature
- `structlog` for logging — no `print()` or bare `logging`
- Tests use real MongoDB (backend) and MSW (frontend) — no mocking the DB


---

## CI / Branch Protection

Every push to `main` and every pull request runs the CI pipeline automatically via GitHub Actions.

**Recommended branch protection rules** (Settings → Branches → main → Add rule):
- Check **Require status checks to pass before merging**
- Add these required status checks:
  - `backend`
  - `frontend`
  - `extension`
- Optionally enable **Require branches to be up to date before merging**
