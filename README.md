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

The product is built around nine AI agents. The tracker exists so the agents have context to work with.

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

Existing trackers like Huntr, Teal, and Simplify are filing cabinets. They store. They do not help. They were built before LLMs could meaningfully draft a cover letter, research a company, or run a realistic mock interview.

Pipelined is the bet that the right shape for this category is no longer a tracker. It is an orchestration layer of agents that do the work, with the tracker underneath as the substrate that feeds them context.

The personal angle: I am a first-generation college student. I have watched peers without recruiter networks grind twice as hard for half the offers. That gap is not talent, it is coaching. Pipelined puts that coaching in everyone's pocket.

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

Backend in FastAPI with Motor for async Mongo, APScheduler for nightly jobs. Frontend is React 18 with Vite, TailwindCSS, and React Query. The Chrome extension is MV3 with a content script, a service worker, and a popup. All agent calls route through `backend/ai/openrouter_client.py` so the underlying model is a config knob, not a code change. Apply Pack can be Claude today and a local Llama tomorrow.

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

These are deliberate. The product never auto-sends emails. Gmail integration is read-only. The stored resume PDF is never modified. Autopilot creates "To Apply" entries with cover letter drafts, the user applies externally. The trust contract is the point. An agent that could send emails on your behalf is one that will eventually send a bad one.

### What gets trained

Nothing. Pipelined is an orchestration play, not a model training play. The depth is in the agent system design, the grounded context engineering, and the per-agent model routing. Where ML shows up: GPT-4o-mini for resume parsing on upload and Workday-style fallback parsing, a deterministic-first classifier with LLM tie-breakers on email threads, and an LLM-graded rubric for fit scoring.

---

## Use cases and impact

Who this is for:

- Every CS student during recruiting season. Less time on apps, more time building.
- First-gen and non-networked students. The students with five referrals and a parent in tech already get this coaching over dinner. Pipelined puts it in everyone's pocket.
- Career switchers who have not interviewed in a decade and need a structured prep flow.
- International students racing visa clocks who cannot afford to bomb a round on lack of prep.

What this changes, measured during author dogfooding:

- Cover letter time: 40 minutes down to about 12 seconds.
- Company research before an interview: 90 minutes down to about 3 minutes.
- Apps lost to forgetting a follow-up: roughly 40 percent down to 5 percent. Ghost missions surface stale apps automatically.
- The "what should I work on today" question is answered by the Morning Brief before you wake up.

This is not a peer-reviewed study, it is solo dogfooding plus small-group friend review. The framing is honest.

---

## What is next

Today is the AI-assistant phase. You click, agents help. The direction is full autonomy:

1. **Agent-to-agent handoffs.** Watchlist finds a fit, Autopilot scores it, Apply Pack drafts materials, Morning Brief surfaces it. One graph, not nine isolated jobs.
2. **Voice mock interviews.** Streaming TTS and STT. Typing is a weak proxy for the real thing.
3. **Career-arc memory.** Agents that remember your trajectory over months. "You said no to FinTech last spring, still a hard no?"
4. **Mobile capture.** Capture roles from job-alert emails and LinkedIn push notifications without flipping to a laptop.
5. **Open the Stanford-email gate.** The gate exists only to keep the LLM bill survivable during development. The product is ready for anyone.

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

- **Fit scoring rubric.** Hand-evaluated on about 30 resume and JD pairs during development. Iterated until the numeric output matched author judgment about 85 percent of the time. Hand-tuned heuristic, labeled as such.
- **Resume parsing.** Validated by parsing my own resume and 6 friends' (with permission), diff-checking extracted fields against source. About 93 percent field-level accuracy on first pass. Failures cluster around non-standard section names.
- **Agent output quality.** This is the weakest link to evaluate rigorously, there is no public benchmark for "is this a good cover letter for this JD." Validation is dogfooding plus small-group review.

### Known limitations, stated up front

- No formal user study.
- Single-region deployment.
- LLM cost is the real bottleneck for opening up the beta. Apply Pack costs about $0.02 per generation. At 1,000 users running 5 a week, that is $400 a month on this one agent. That is why the Stanford-email gate exists.

---

## AI usage disclosure

Required by course policy, important on its own merits.

**Development.** Claude Code was used heavily throughout. First-pass implementations of agent loops, scheduler jobs, React components, the majority of tests, refactors to comply with the 300-line file and 40-line function limits, Pydantic schemas, and the OpenRouter client wrapper were all drafted by Claude Code and then reviewed, restructured, and integrated by hand. Architectural decisions, the product policy (no auto-send, no auto-apply, no PDF edit), the agent taxonomy, deployment topology, and all final code review were mine.

**Inference at runtime.** DigitalOcean Gradient AI is the canonical inference provider for all nine agents. It is OpenRouter-compatible, abstracted behind a single client in `backend/ai/`, so the underlying model is swappable per-agent via config. OpenAI GPT-4o-mini is used for two narrow tasks: resume parsing on upload, and Workday-style fallback parsing. Google Gemini is the extractor inside the Interview Prep agent.

Substantial portions of this implementation were drafted by Claude Code. The design, the constraints, the trust contract, and the buck on every architectural call were mine. Disclosing it cleanly because it would be dishonest not to.

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
