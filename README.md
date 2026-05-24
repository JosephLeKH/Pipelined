# Pipelined

Job application tracker with an AI layer on top. **Today** (`/today`) is the post-login home — ranked missions from your Morning Brief (follow-ups, ghost apps, interviews, high-fit matches, watchlist finds, autopilot pending) with snooze/done actions and weekly review stats. **Co-pilot** is a slide-over chat grounded in your pipeline data (suggest-only — never sends or applies). **Application Autopilot** and **Watchlist** scan overnight, score listings against your resume, and queue drafts at `/inbox/pending` — they never submit applications for you. **Apply Pack** generates copy-paste cover letters, form answers, LinkedIn notes, and talking points. **Mock Interview** streams a realistic practice session with end-of-session debrief. **Resume Insights** compares your resume to a job description without editing your PDF. The **Interview Prep Agent** researches salary bands, interview rounds, and company culture via Exa + Gemini. A Chrome extension captures job postings from any major job board in one click.

**Stack:** FastAPI · React 18 + Vite · MongoDB Atlas · Chrome Extension MV3 · TailwindCSS

**Product policy:** Pipelined suggests and drafts — it does not auto-send emails, auto-apply to jobs, or modify your stored resume file.

---

## Features

### Agentic (OpenRouter-powered)

- **Today** — `/today` mission cards ranked by priority with human-readable reasons; snooze/done API; end-of-day progress strip; weekly review section
- **Morning Brief** — daily action list at your local hour (default 8am): follow-ups, ghosts, interviews, high-fit apps, watchlist finds, autopilot matches. Email (SMTP) + in-app notification → `/today`
- **Co-pilot** — `POST /api/copilot/chat` SSE chat grounded in pipeline context; 20/hour; `open_app` deep links only
- **Apply Pack** — `POST /api/applications/{id}/apply-pack` generates cover letter, form answers, LinkedIn note, talking points (5/hour)
- **Mock Interview** — `POST /api/applications/{id}/mock-interview` SSE session; 10 turns, 3 sessions/day
- **Resume Insights** — `POST /api/applications/{id}/resume-insights` keyword gaps, section suggestions, bullet rewrites
- **Application Autopilot** — nightly job board scan; high-fit matches queued at `/inbox/pending`; approve → "To Apply"
- **Watchlist** — track up to 25 company career pages; daily scan queues matches alongside Autopilot
- **Weekly Review** — `GET /api/review/weekly` response rate, ghost rate, velocity vs goal, stale apps
- **Ghost missions** — apps silent longer than your median response time surface on Today
- **Agent Activity** — `GET /api/agent/activity` audit trail of agent runs
- **Email Timeline** — `GET /api/applications/{id}/email-events` classified Gmail metadata per application
- **Follow-up drafts** — LLM-generated follow-up text in the detail panel; you copy and send manually

### Core

- **Interview Prep Agent** — agentic loop (Exa web search + Gemini) that pulls salary data, interview Q&A, and company intel, then streams a personalized briefing
- **Resume fit scoring** — scores your resume against a job description via OpenRouter (with legacy OpenAI/Gemini fallbacks)
- **One-click capture** — Chrome extension extracts job details from LinkedIn, Greenhouse, Workday, and more; falls back to GPT-4o mini parsing for unstructured pages
- **Pipeline dashboard** — Kanban board across custom stages with drag-and-drop and follow-up reminders
- **Interview calendar** — upcoming interviews with per-application prep checklists
- **Job board** — curated internship/new-grad listings synced daily from GitHub repos

See `docs/AGENTIC_FEATURES.md` for full API reference, scheduler jobs, and troubleshooting.

---

## Local Setup

### Prerequisites

- Python 3.12
- Node 20+
- MongoDB (Atlas free tier or local instance)
- Chrome (for extension)

### 1. Clone

```bash
git clone https://github.com/your-org/pipelined.git
cd pipelined
```

### 2. Create the backend `.env`

```bash
cp .env.example backend/.env
```

Fill in the values. Only the first three are required to run locally; the rest enable optional features.

```bash
# Required
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net   # or mongodb://localhost:27017
MONGO_DB_NAME=pipelined
JWT_SECRET=any-long-random-string-here

# Optional — defaults shown
JWT_ACCESS_TTL_MINUTES=15
JWT_REFRESH_TTL_DAYS=7
ALLOWED_ORIGINS=["http://localhost:5173"]
DEBUG=true
FRONTEND_URL=http://localhost:5173

# OpenRouter — canonical LLM provider for agent features
# (Today, Resume Insights, Apply Pack, Mock Interview, Autopilot, Co-pilot, fit scoring, follow-up drafts)
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=google/gemini-2.0-flash-001

# OpenAI — resume parsing and extension fallback parsing
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Gemini — Interview Prep Agent fallback (free tier at aistudio.google.com)
GEMINI_API_KEY=AIza...

# Exa — required for Interview Prep Agent web search
EXA_API_KEY=...

# SMTP — Morning Brief email delivery (defaults to localhost:1025 for local dev with Mailpit)
SMTP_HOST=localhost
SMTP_PORT=1025
SMTP_FROM_EMAIL=noreply@pipelined.app

# GitHub — enables daily job board sync (feeds Autopilot)
GITHUB_TOKEN=ghp_...
GITHUB_REPOS=["SimplifyJobs/Summer2026-Internships"]

# Gmail OAuth — read-only email sync + classification (Email Timeline)
# GMAIL_CLIENT_ID=...
# GMAIL_CLIENT_SECRET=...
# GMAIL_SYNC_INTERVAL_HOURS=4
```

### 3. Start the backend

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
# API at http://localhost:8000
```

### 4. Start the frontend

```bash
cd frontend
npm install
npm run dev
# App at http://localhost:5173
```

### 5. Load the Chrome extension (optional)

1. Go to `chrome://extensions` and enable **Developer mode**
2. Click **Load unpacked** → select the `/extension` folder
3. Sign in at `localhost:5173` first — the extension uses the same session

---

## Running Tests

```bash
# Backend (requires a real MongoDB instance — uses MONGO_URI from .env)
cd backend && pytest tests/

# Frontend
cd frontend && npm test

# Extension
cd extension && npm install && npm test
```

---

## Project Structure

```
/backend     FastAPI — auth, applications, brief/, copilot/, review/, watchlist/,
             autopilot/, agent/, email_integration/, ai/ (OpenRouter), notifications/
/frontend    React 18 + Vite — /today, /dashboard, /inbox/pending, CoPilotPanel, detail panel
/extension   Chrome MV3 — content scripts, service worker, popup
/shared      JSON schemas shared across layers
/docs        AGENTIC_FEATURES.md — agent feature reference
```
