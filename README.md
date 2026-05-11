# Pipelined

Job application tracker with an AI layer on top. The **Interview Prep Agent** autonomously researches salary bands, interview rounds, and company culture across Levels.fyi, Reddit, and Glassdoor — then tailors the briefing to your resume. **Resume fit scoring** uses GPT-4o to rate how well your background matches a role before you apply. A Chrome extension captures job postings from any major job board in one click, so nothing falls through the cracks.

**Stack:** FastAPI · React 18 + Vite · MongoDB Atlas · Chrome Extension MV3 · TailwindCSS

---

## Features

- **Interview Prep Agent** — agentic AI loop (Claude Haiku) that pulls salary data from Levels.fyi, interview Q&A from Reddit and Glassdoor, and company intel, then generates a personalized briefing streamed live to the UI
- **Resume fit scoring** — GPT-4o scores your resume against a job description and explains the gaps
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

# OpenAI — enables resume parsing fallback and resume fit scoring
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini

# Anthropic — enables the Interview Prep Agent
ANTHROPIC_API_KEY=sk-ant-...

# Exa — required for Interview Prep Agent web search
EXA_API_KEY=...

# GitHub — enables daily job board sync
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
/backend     FastAPI — auth, applications, calendar, jobs, parsing, interview prep
/frontend    React 18 + Vite — dashboard, detail panel, calendar, job board
/extension   Chrome MV3 — content scripts, service worker, popup
/shared      JSON schemas shared across layers
```
