# Pipelined

Job application tracker with an AI layer on top. **Morning Brief** delivers a daily prioritized action list (follow-ups, interviews, high-fit matches, autopilot finds). **Application Autopilot** scans the job board overnight, scores listings against your resume, and queues cover-letter drafts for your approval — it never submits applications for you. **Resume Insights** compares your resume to a job description and returns keyword gaps and bullet rewrite suggestions without editing your PDF. The **Interview Prep Agent** researches salary bands, interview rounds, and company culture, then tailors a briefing to your resume. A Chrome extension captures job postings from any major job board in one click.

**Stack:** FastAPI · React 18 + Vite · MongoDB Atlas · Chrome Extension MV3 · TailwindCSS

**Product policy:** Pipelined suggests and drafts — it does not auto-send emails, auto-apply to jobs, or modify your stored resume file.

---

## Features

### Agentic (OpenRouter-powered)

- **Morning Brief** — daily action list at your local hour (default 8am): overdue follow-ups, upcoming interviews, high-fit applications, and overnight autopilot matches. Delivered via email (SMTP) and in-app at `/brief`.
- **Resume Insights** — `POST /api/applications/{id}/resume-insights` compares resume text to a pasted job description; returns keyword gaps, section suggestions, and bullet rewrites. Suggestions only — your PDF is never modified.
- **Application Autopilot** — nightly scan of curated job listings; high-fit matches (configurable threshold, default 80+) get cover-letter drafts and resume tips queued at `/inbox/pending`. Approve adds a "To Apply" application to your pipeline; you apply externally when ready.
- **Follow-up drafts** — LLM-generated follow-up text in the detail panel; you copy and send manually. No Gmail auto-send.

### Core

- **Interview Prep Agent** — agentic loop (Exa web search + Gemini) that pulls salary data, interview Q&A, and company intel, then streams a personalized briefing
- **Resume fit scoring** — scores your resume against a job description via OpenRouter (with legacy OpenAI/Gemini fallbacks)
- **One-click capture** — Chrome extension extracts job details from LinkedIn, Greenhouse, Workday, and more; falls back to GPT-4o mini parsing for unstructured pages
- **Pipeline dashboard** — Kanban board across custom stages with drag-and-drop and follow-up reminders
- **Interview calendar** — upcoming interviews with per-application prep checklists
- **Job board** — curated internship/new-grad listings synced daily from GitHub repos

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

# OpenRouter — canonical LLM provider for agent features (Morning Brief prep, Resume Insights, Autopilot, fit scoring, follow-up drafts)
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

> **Note:** The frontend test suite has ~113 pre-existing failures across 35 files from in-progress design system and component refactoring (CSS class renames, missing provider wrappers). The build passes cleanly — `npm run build` is the reliable health check.

---

## Project Structure

```
/backend     FastAPI — auth, applications, calendar, jobs, parsing, interview prep,
             ai/ (OpenRouter client), brief/, autopilot/, notifications/morning_brief
/frontend    React 18 + Vite — dashboard, /brief, /inbox/pending, detail panel, calendar, job board
/extension   Chrome MV3 — content scripts, service worker, popup
/shared      JSON schemas shared across layers
```
