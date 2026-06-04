# Pipelined

A job application platform that does the work for you. Nine AI agents capture jobs, draft your materials, research companies, run mock interviews, and queue new listings overnight.

**Live site:** [pipelined.live](https://pipelined.live)

```
What       Agentic job application platform (FARM stack + Chrome extension)
Inference  DigitalOcean Gradient AI (OpenRouter-compatible, model-agnostic)
Tests      744 backend, 1206 frontend, 270 extension, all green in CI
Author     Joseph Le, Stanford CS
```

---

## What it does

Pipelined runs nine AI agents on top of a job tracker. The tracker holds the data, the agents do the work.

1. **One-click capture.** Chrome extension grabs the role, JD, and posting URL from any job page. Workday and other unstructured pages fall back to a GPT-4o-mini parser.
2. **Apply Pack.** Generates a tailored cover letter, three short-answer responses, a LinkedIn note, and talking points. Grounded in your resume and the JD.
3. **Interview Prep.** Tool-using agent. Live web search (Exa) + career page scrape + Gemini extractor. Returns a four-tab briefing: comp bands, interview process, what to highlight, what to brush up on.
4. **Mock Interview.** SSE-streamed live practice. Knows the role, the company, and your resume. Debrief at the end.
5. **Co-pilot.** Slide-over chat grounded in your pipeline. Suggest-only, never sends.
6. **Resume Insights.** Keyword gaps and bullet rewrites against a JD. Never edits the stored PDF.
7. **Application Autopilot.** Nightly scan at 5 AM. Scores fresh listings against your resume, drafts cover letters, queues matches for you to approve.
8. **Watchlist.** Daily scrape of up to 25 user-configured career pages.
9. **Morning Brief.** Ranks the day into 3 to 5 missions. Lands at your local 8 AM by email and in-app.

There is also a Weekly Review on Sundays with response rate, ghost rate, and stale apps.

---

## Why I built it

Every CS student I know runs the same broken setup. A spreadsheet with eighty rows half of which are blank. Six "cover_letter_final_FINAL_v3.docx" floating in Drive. An inbox of "thanks for applying" replies nobody reads. The bottleneck is not the engineering. It is the repetitive admin that eats the hours you would rather spend on a side project or Leetcode.

Existing trackers like Huntr, Teal, and Simplify are filing cabinets. They store. They do not help. They were built before LLMs could draft a cover letter, research a company, or run a realistic mock interview.

I wanted something that actually does the work, not just records it. So I built Pipelined around the agents and used a tracker to feed them context.

I am a first-generation college student. I have watched friends without recruiter networks grind twice as hard for half the offers. The difference is coaching, and Pipelined gives that to anyone who signs up.

---

## How it works

### Architecture

```
Chrome Extension MV3
React 18 + Vite SPA
        |
        | REST + SSE
        v
FastAPI (Python 3.12, Motor async)
    |       |          |              |
    v       v          v              v
MongoDB   APScheduler  Gmail OAuth   DO Gradient AI
Atlas     (9 jobs)     (read-only)   (inference)
                                     + Exa (search)
                                     + Gemini (extractor)
```

Backend is FastAPI with Motor for async Mongo and APScheduler for nightly jobs. Frontend is React 18 with Vite, TailwindCSS, and React Query. The Chrome extension is MV3 with a content script, service worker, and popup. Every agent call goes through `backend/ai/openrouter_client.py`, so swapping the model behind any agent is a one-line config change.

### Agent execution modes

| Mode | When it fires | Examples |
|---|---|---|
| On-demand | User clicks | Apply Pack, Mock Interview, Co-pilot, Resume Insights |
| Triggered | Event fires automatically | Gmail sync sees an interview invite, Interview Prep runs before you open the email |
| Scheduled | APScheduler cron | Autopilot 5 AM, Watchlist 6 AM, Morning Brief at your local 8 AM |

### Scheduled jobs

| Job | Cadence | What it does |
|---|---|---|
| `github_sync` | Daily 03:00 UTC | Pulls SimplifyJobs/Summer2026-Internships into the job board and Autopilot input |
| `autopilot_scan` | Daily 05:00 UTC | Scores fresh listings, drafts cover letters, queues matches |
| `watchlist_scan` | Daily 06:00 UTC | Scrapes user-configured career pages |
| `morning_brief` | Hourly :15 UTC | Generates one brief per user per local date when local hour matches their preference |
| `weekly_review` | Hourly :30 UTC | One review per ISO week per user |
| `gmail_sync` | Every 4h | Read-only classifier writes metadata to email_events |
| `generate_notifications` | Hourly :00 UTC | Surfaces ghost, follow-up, and interview-soon missions |
| `weekly_digest` | Mon 08:00 UTC | Optional email digest |
| `purge_deleted` | Daily 04:00 UTC | Soft-delete TTL |

### Product policy

The product never auto-sends emails. Gmail integration is read-only. The stored resume PDF is never modified. Autopilot creates "To Apply" entries with cover letter drafts and the user applies externally. The reason is simple: an agent that can send emails for you will eventually send a bad one.

### What gets trained

Nothing. The work is in the agent system design, the grounded context, and per-agent model routing, not in training new models. Where ML shows up: GPT-4o-mini for resume parsing on upload and Workday-style fallback parsing, a deterministic-first classifier with LLM tie-breakers on email threads, and an LLM-graded rubric for fit scoring.

---

## Use cases and impact

Who this is for:

- Every CS student during recruiting season. Less time on apps, more time building.
- First-gen and non-networked students. Students with five referrals and a parent in tech already get this coaching over dinner. Pipelined gives everyone else the same thing.
- Career switchers who have not interviewed in a decade and need a structured prep flow.
- International students racing visa clocks who cannot afford to bomb a round on lack of prep.

From my own use over the last few months:

- Cover letter time: 40 minutes down to about 12 seconds.
- Company research before an interview: 90 minutes down to about 3 minutes.
- Apps lost to forgetting a follow-up: roughly 40 percent down to 5 percent. Ghost missions surface stale apps automatically.
- "What should I work on today" is answered by the Morning Brief before I wake up.

These are my own numbers, not a controlled study.

---

## What is next

Right now the agents help when you click. The next step is full autonomy:

1. **Agent-to-agent handoffs.** Watchlist finds a fit, Autopilot scores it, Apply Pack drafts materials, Morning Brief surfaces it. Today the agents share data through Mongo. Soon they will negotiate.
2. **Voice mock interviews.** Streaming TTS and STT, because typing through a mock interview does not feel like the real thing.
3. **Career-arc memory.** Agents that remember your trajectory over months. "You said no to FinTech last spring, still a hard no?"
4. **Mobile capture.** Save roles from job-alert emails and LinkedIn push notifications without opening a laptop.
5. **Open the Stanford-email gate.** It exists only to keep the LLM bill survivable during development. The product is ready for anyone.

Longer term: a negotiation co-pilot for offers, multi-modal capture (photo of a flyer becomes a pipeline entry), and open-sourcing the orchestration layer so the same pattern can apply outside job hunting.

---

## Tests and evaluation

| Layer | Count | Result |
|---|---|---|
| Backend | 744 tests | All passing in CI |
| Frontend | 1206 tests | All passing in CI |
| Extension | 270 tests | All passing in CI |
| Commits | ~1,440 | Over several months of development |

Backend tests run against a real MongoDB instance. The project policy is to never mock the database, since mocks have historically masked migration bugs. Frontend uses Vitest with React Testing Library and MSW for API mocking. Extension uses JSDOM fixtures and jest-chrome.

### How claims were validated

- **Fit scoring rubric.** Hand-evaluated on about 30 resume and JD pairs. I iterated until the numeric output matched my gut call about 85 percent of the time. A hand-tuned heuristic, not a trained model.
- **Resume parsing.** Parsed my own resume and 6 friends' (with permission), then diff-checked extracted fields against the source. About 93 percent field-level accuracy on first pass. Failures cluster around non-standard section names.
- **Agent output quality.** Hard to grade rigorously since there is no public benchmark for "is this a good cover letter for this JD." For now, validation comes from my own use and feedback from a small group of friends.

### Known limitations

- No formal user study.
- Single-region deployment.
- LLM cost is the main reason the beta is gated. Apply Pack runs about $0.02 per generation. At 1,000 users running 5 a week, that is $400 a month on this one agent alone, which is why I cap signups to Stanford emails for now.

---

## AI usage disclosure

**Development.** I used Claude Code throughout. It drafted first-pass implementations of agent loops, scheduler jobs, React components, most of the tests, refactors to fit the 300-line file and 40-line function limits, Pydantic schemas, and the OpenRouter client wrapper. I reviewed, restructured, and integrated everything by hand. Architectural decisions, the product policy (no auto-send, no auto-apply, no PDF edit), the agent taxonomy, the deployment topology, and all final code review were mine.

**Inference at runtime.** DigitalOcean Gradient AI is the inference provider for all nine agents. It is OpenRouter-compatible and abstracted behind a single client in `backend/ai/`, so the model behind any agent is a config setting. OpenAI GPT-4o-mini handles two narrow jobs: resume parsing on upload and Workday-style fallback parsing. Google Gemini is the extractor inside the Interview Prep agent.

---

## Sources and acknowledgments

- **Job board data:** [SimplifyJobs/Summer2026-Internships](https://github.com/SimplifyJobs/Summer2026-Internships), synced daily.
- **Exa** for live web search inside Interview Prep.
- **OpenRouter / DigitalOcean Gradient AI** for inference routing.
- **shadcn/ui** patterns referenced for component composition. No direct fork.
- **Linear** and **Stanford** brand systems for visual inspiration (Cardinal Red `#8C1515` on white).
- No code was forked from another job-tracker repo. Pipelined is built from scratch on the FARM stack. Libraries are listed in `backend/requirements.txt`, `frontend/package.json`, and `extension/package.json`.

---

## Project structure

```
/backend     FastAPI. Auth, applications, brief, copilot, review, watchlist,
             autopilot, agent, email_integration, ai/, notifications
/frontend    React 18 + Vite. /today, /dashboard, /inbox/pending,
             CoPilotPanel, application detail panel
/extension   Chrome MV3. Content scripts, service worker, popup
/shared      JSON schemas shared across boundaries
/docs        AGENTIC_FEATURES.md, plans, redesign notes, UX audit
```

`CLAUDE.md` documents the architectural rules. `STYLE_GUIDE.md` and the per-stack style files (`backend/python.md`, `backend/mongodb.md`, `frontend/react.md`, `extension/extension.md`) are the source of truth for coding standards.

---

## Contact

- Live site: [pipelined.live](https://pipelined.live)
- Author: Joseph Le, Stanford CS
