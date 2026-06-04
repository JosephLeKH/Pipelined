# Pipelined

**Live site:** [pipelined.live](https://pipelined.live)

> A job tracker with a nine-agent AI layer wired on top. The tracker is the plumbing. The agents are the product.

Pipelined turns the "cursed job-hunt spreadsheet" into an autonomous-ish system that captures jobs, drafts your materials, researches the company, runs mock interviews, scans for new listings overnight, and tells you what to do each morning. Built solo, in the open, over several months. Frontend, backend, Chrome extension, and a scheduler running nine distinct AI agents.

---

## TL;DR

| | |
|---|---|
| **What** | FARM-stack job application platform with an agentic layer over the top |
| **Stack** | FastAPI · React 18 + Vite · MongoDB Atlas · Chrome MV3 · TailwindCSS · APScheduler |
| **AI inference** | DigitalOcean Gradient AI (OpenRouter-compatible) — model-agnostic routing |
| **Live** | [pipelined.live](https://pipelined.live) |
| **Code volume** | ~1,400 commits · 89 backend test modules · 194 frontend test files · 15 extension test files |
| **Author** | Solo project — Joseph Le (Stanford CS) |

---

## Q1 — Why I built this

### The bottleneck

Every CS student I know runs the same broken workflow:

- A Google Sheet with 80+ rows, half of them blank, that nobody updates after week three.
- Six different "cover_letter_final_FINAL_v3.docx" floating in their Drive.
- An inbox full of "Thanks for applying" auto-replies they never read.
- A vague memory of which company is at what stage.
- And — the most expensive part — hours per week burned on the repetitive admin of applying, prepping, and following up. Hours that aren't going into Leetcode, side projects, research, or actually getting better at the engineering the job is supposedly for.

Existing tools — Huntr, Teal, Simplify — are filing cabinets. They store. They don't *help*. They're trackers built before LLMs could meaningfully draft a cover letter, research a company, or run a realistic mock interview.

### The insight

The tracker isn't the product anymore. The tracker is the substrate. With modern LLMs and tool use, the same data that powers a spreadsheet — your resume, the JD, your email threads — can power an agent that actively does the work for you.

So the bet behind Pipelined is: **stop building better filing cabinets. Wire a swarm of agents on top of the cabinet, and let the cabinet exist mostly to feed them context.**

### The personal angle

I'm a first-gen CS student. I've watched peers without recruiter networks or family in tech grind twice as hard for half the offers. That gap isn't talent — it's coaching. Networked students get prep help over dinner. Pipelined puts that coaching in everyone's pocket.

But the broader thesis is simpler: **less time applying, more time building.**

---

## Q2 — How it works

### [1] Research / model layer

Pipelined doesn't train custom models. It's an **orchestration** play, not a training play. The novelty is in the agent system design (below), the grounded context engineering, and the per-agent model routing — not in foundation-model R&D. This is disclosed openly so judges aren't evaluating it against the wrong axis.

Where ML *does* show up:

- **Resume parsing** uses OpenAI GPT-4o-mini for structured field extraction from PDF.
- **Job posting parsing** uses GPT-4o-mini as a fallback when structured selectors fail on pages like Workday.
- **Email classification** runs a deterministic-first classifier with LLM tie-breakers for ambiguous threads.
- **Fit scoring** uses an LLM-graded rubric (resume vs JD) with a numeric output, validated against held-out manual ratings during development.

### [2] Product / application architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Chrome Extension MV3   ──┐                                       │
│  React 18 + Vite SPA    ──┤── REST + SSE ──▶  FastAPI (Python 3.12) │
│                                                  │                 │
│                                                  ├─ Motor (async) ─▶ MongoDB Atlas
│                                                  ├─ APScheduler  (9 nightly/hourly jobs)
│                                                  ├─ Gmail OAuth  (read-only sync)
│                                                  ├─ Exa API      (live web search)
│                                                  └─ DO Gradient  (LLM inference)
└──────────────────────────────────────────────────────────────────┘
```

**Monorepo layout**

```
/backend     FastAPI · Motor · APScheduler · OpenRouter client
/frontend    React 18 · Vite · TailwindCSS · React Query · Vitest
/extension   Chrome MV3 · Shadow DOM content scripts · service worker
/shared      JSON schemas duplicated across boundaries
```

**Hard architectural rules** (enforced repo-wide):

- Every backend feature module is split into `router.py` / `service.py` / `schemas.py`. `HTTPException` is raised only in routers. Services raise domain exceptions.
- 300-line file limit, 40-line function limit. Split if exceeded.
- Every Mongo query against `applications` and `calendar_events` **must** include `user_id` in the filter — enforced by code review, not just convention.
- No barrel re-exports. Direct subpath imports for `lucide-react`, `recharts`, `date-fns`, etc., so the frontend bundle stays lean.
- Frontend server data always goes through React Query (`useQuery` / `useMutation`) — never `useState`.

**Deployment**

- Backend on AWS ECS Fargate behind an ALB.
- Frontend on Vercel.
- MongoDB Atlas (free tier, multi-region replica set).
- Chrome extension loaded unpacked for development; submission to the Chrome Web Store is pending review.
- Live at [pipelined.live](https://pipelined.live).

### [3] Automation / agent system *(this is the interesting part)*

Pipelined runs **nine distinct agents** through one orchestration layer. Every agent routes its inference through **DigitalOcean Gradient AI** (an OpenRouter-compatible endpoint), so the model behind any agent is a config knob, not a code change — Apply Pack could be Claude 4.7 today and a local Llama tomorrow.

Agents fire in three execution modes:

| Mode | When | Examples |
|---|---|---|
| **On-demand** | User clicks a button | Apply Pack, Mock Interview, Co-pilot chat, Resume Insights |
| **Triggered** | An event fires automatically | Gmail sync sees an interview invite → Interview Prep auto-fires |
| **Scheduled** | APScheduler cron | Autopilot 5 AM, Watchlist 6 AM, Morning Brief at user's local 8 AM, Weekly Review Sundays |

**The nine agents:**

| # | Agent | What it does | Tools / Grounding |
|---|---|---|---|
| 1 | **Today / Morning Brief** | Ranks the day's missions (follow-ups, ghosts, interviews, high-fit matches). Emails + in-app notification at 8 AM local. | Pipeline state, weekly review stats, mission scorer |
| 2 | **Co-pilot** | Slide-over SSE chat grounded in your full pipeline context. Suggest-only — `open_app` deep links, no auto-send. | Applications, contacts, emails, calendar |
| 3 | **Apply Pack** | Generates cover letter + 3 short-answer responses + LinkedIn note + talking points for a specific role. | Resume + JD + company facts |
| 4 | **Interview Prep** | Tool-using agent: live web search (Exa), career-page scrape, Gemini extractor. Outputs a 4-tab briefing (Comp, Process, Company, For You). | Exa, Gemini, resume, JD |
| 5 | **Mock Interview** | SSE-streamed live practice session. 10 turns, 3 sessions/day. Debrief at end. | Resume + JD + company |
| 6 | **Resume Insights** | Suggests keyword gaps + bullet rewrites against a JD. **Never modifies the stored PDF.** | Resume + JD |
| 7 | **Application Autopilot** | Nightly: scores fresh listings against your resume, drafts cover letters, queues matches at `/inbox/pending`. **Never auto-submits.** | Job board, resume, agent profile |
| 8 | **Watchlist** | Daily: scrapes up to 25 user-configured career pages, queues matches alongside Autopilot. | User-curated URLs |
| 9 | **Weekly Review** | Sunday: response rate, ghost rate, velocity vs goal, stale apps. Powers Today's ghost missions. | Application history |

**APScheduler jobs** (`backend/jobs/sync.py`):

| Job ID | Schedule | Handler |
|---|---|---|
| `github_sync` | Daily 03:00 UTC | Polls SimplifyJobs/Summer2026-Internships → job board + Autopilot input |
| `morning_brief` | Hourly :15 UTC | Generates one brief per user per local date when local hour == user's `morning_brief_hour` |
| `weekly_review` | Hourly :30 UTC | One review per ISO week per user |
| `generate_notifications` | Hourly :00 UTC | Surfaces ghost / follow-up / interview-soon missions |
| `gmail_sync` | Every 4h | Read-only classifier; writes metadata to `email_events` |
| `autopilot_scan` | Daily 05:00 UTC | Fit-scores fresh listings, drafts cover letters, queues to `pending_opportunities` |
| `watchlist_scan` | Daily 06:00 UTC | User-configured career page scrape |
| `weekly_digest` | Mon 08:00 UTC | Optional email digest |
| `purge_deleted` | Daily 04:00 UTC | Soft-delete TTL |

**Product policy** (deliberately constrained, not a limitation):

- **No auto-send.** Drafts are generated, never delivered. Gmail integration is read-only.
- **No PDF/resume edit.** All resume agents are suggest-only. Stored files are immutable.
- **No auto-apply.** Autopilot creates "To Apply" entries with drafts; the user applies externally.

The policy is the trust contract. An agent that *could* send emails on your behalf is one that *will* eventually send a bad one. Pipelined is built so that even a worst-case model failure can't damage your real-world job hunt.

---

## Q3 — Use cases & impact

**Who this is for:**

- **Every CS student during recruiting season.** The hours you spend rewriting cover letters and Googling "Stripe interview process" are hours you're not spending on a compiler, a model, or a side project.
- **First-gen / non-networked students.** The students with five referrals and a parent in tech get this kind of coaching for free over dinner. Pipelined puts it in everyone's pocket.
- **Career switchers** who haven't interviewed in a decade and need a structured prep workflow.
- **International students** racing visa clocks who can't afford to bomb a round on lack of prep.

**How people actually use it** (observed during dev + internal dogfooding):

1. Capture jobs via the extension while browsing LinkedIn / company sites.
2. Wake up to the Morning Brief — 3–5 ranked missions for the day.
3. Generate an Apply Pack for the role they're applying to right now.
4. Before an interview, hit Interview Prep + run two Mock Interview sessions.
5. Sunday: read the Weekly Review, fix the ghosted apps.

**Measured impact** (from author dogfooding — see Evaluation section below for honesty about scale):

- Time to produce a tailored cover letter: **~40 minutes → ~12 seconds.**
- Time to research a company before an interview: **~90 minutes → ~3 minutes.**
- Apps lost to forgetting to follow up: **~40% → ~5%** (ghost missions surface stale apps automatically).
- Cognitive load of "what should I work on today": **handled by Today's ranked list.**

The broader bet: this is the wedge for a category. Job hunting is painful, structured, and personal enough that nobody's built the right agentic thing for it. The same orchestration pattern applies to grad-school apps, internship outreach, freelancer client pipelines, and any repetitive knowledge-work funnel.

---

## Q4 — What I'd add next

**The autonomy curve.** Today's product sits at the *AI-assistant* stage — you click, agents help. The roadmap walks toward full autonomy:

```
  Manual tracker  ──▶  AI assistant  ──▶  Autonomous agent  ──▶  ???
                       ▲ you are here
```

**Next 3 months:**

1. **Agent-to-agent handoffs.** Today, agents share data through Mongo. Tomorrow, they negotiate — Watchlist finds a fit → Autopilot scores it → Apply Pack drafts materials → Morning Brief surfaces it. One graph, not nine isolated jobs.
2. **Voice mock interviews** via streaming TTS + STT. Typing is a weak proxy for the real thing.
3. **Career-arc memory.** Agents that remember your trajectory over months, not just the current application. "You said no to FinTech last spring — still a hard no?"
4. **Mobile app.** Capture roles from job-alert emails and LinkedIn push notifications without flipping to a laptop.
5. **Open the Stanford-email gate.** The gate exists only to keep LLM bills survivable during development. The product is ready for anyone.

**Longer-term:**

- **Negotiation co-pilot.** Offer in hand → market-rate context + counter script + email draft.
- **Multi-modal application capture.** Photo of a job board flier → full pipeline entry.
- **Open-sourcing the agent orchestration layer** as a stand-alone library, so the same pattern can be applied outside job hunting.

The endgame is the inversion: **you don't apply to jobs. You study. You build. You grind LC if that's your thing. And the agent handles the rest, only pinging you when it actually needs you.**

---

## Evaluation & evidence

I'm honest that this is a solo project, not a peer-reviewed study. But the following is the substrate of validation that exists:

### Testing

- **89 backend test modules** covering routers, services, scheduler jobs, and agent loops. Run with `pytest tests/` against a real MongoDB instance (the project policy: never mock the database — mocks have masked migration bugs in past projects).
- **194 frontend test files** using Vitest + React Testing Library + MSW for API mocking. Components tested by accessible role/text, not by implementation detail.
- **15 extension test files** using JSDOM fixtures for content scripts and `jest-chrome` for the service worker.
- A **known CI issue**: pytest-asyncio has had a pre-existing event-loop bug since 2026-05-31 that fails a large batch of backend tests on every commit, independent of changes. This is openly tracked and not papered over. Local runs against a clean Mongo instance pass.

### Validation against claims

- **Fit scoring rubric** was hand-evaluated on a small set (~30 resume/JD pairs) during development. Numeric outputs were compared against author judgment; the rubric was iterated until it matched gut calls ~85% of the time. This is not publishable rigor — it's a hand-tuned heuristic, openly labeled as such.
- **Resume parsing accuracy** was validated by parsing the author's own resume and 6 friends' resumes (with permission), then manually diff-checking the extracted fields against the source. ~93% field-level accuracy on first pass; failures cluster around non-standard section names.
- **Agent output quality** is the weakest link to evaluate rigorously. There is no public benchmark for "is this a good cover letter for this JD." This is an honest limitation — the validation today is dogfooding plus informal review from a small group of CS friends.

### Process artifacts

- **~1,436 commits** over several months of development.
- A `progress.txt`, `AGENT_ROADMAP.md`, and `pipelined_prd.md` in the repo capture early planning.
- `docs/AGENTIC_FEATURES.md` is the maintained API reference for the agentic surface.
- `STYLE_GUIDE.md` and the per-stack style files (`backend/python.md`, `backend/mongodb.md`, `frontend/react.md`, `extension/extension.md`) encode the architectural rules.
- A `CLAUDE.md` at the root encodes project-specific guidance for AI tooling (see disclosure below).

### Known limitations

- **No formal user study.** Validation is author dogfooding + small-group friend review.
- **Single-region deployment** — Atlas free tier and a single ECS Fargate region. Not production-grade for scale yet.
- **LLM cost is the real bottleneck for opening up the beta.** Apply Pack alone costs ~$0.02 per generation. At 1,000 users running 5/week, that's $400/mo just on this one agent. This is why the Stanford-email gate exists.
- **No SOC2, no formal security audit.** The product policy (no auto-send, no PDF edit, no auto-apply) is the trust contract today; a real audit is a roadmap item before opening up beyond Stanford.
- **Backend Tests CI is broken** as noted above. Fix is queued; it's not masking the actual test results, just visually noisy.

---

## AI usage disclosure

This project was built with substantial AI assistance, in keeping with the course AI policy. Here is what was used and where:

### Development-time AI tooling

- **Claude Code** (Anthropic) was used extensively throughout development as a pair-programming partner. This included:
  - Drafting first-pass implementations of agent loops, scheduler jobs, and React components.
  - Writing the majority of unit and integration tests.
  - Refactoring large modules to comply with the 300-line file / 40-line function limits.
  - Generating Pydantic schemas and the OpenRouter client wrapper.
  - Producing portions of this README and the in-repo style guides.
- Architectural decisions, the product policy ("no auto-send / no auto-apply / no PDF edit"), the agent taxonomy, the orchestration design, the deployment topology, the privacy model, and all final code review were **human decisions by the author.** AI was the implementation accelerant, not the architect.

### Runtime AI inference

- **DigitalOcean Gradient AI** (OpenRouter-compatible) is the canonical inference provider for all nine agents at runtime. The provider is abstracted behind a single client in `backend/ai/`, so the underlying model is swappable per-agent via config.
- **OpenAI GPT-4o-mini** is used specifically for two narrow tasks: resume parsing on upload, and fallback parsing for unstructured job pages (Workday-style).
- **Google Gemini** is used inside the Interview Prep agent as the extractor over Exa search results.

### Why this disclosure matters

The course encourages AI tool use. I lean into it. But it would be dishonest to present this as a from-scratch artifact — substantial portions of the implementation were drafted by Claude Code, then reviewed, restructured, and integrated by hand. The design, the constraints, the trust contract, the rubric for what gets included, and the buck on every architectural call were mine.

---

## Acknowledgments & sources

- **Job board data:** [SimplifyJobs/Summer2026-Internships](https://github.com/SimplifyJobs/Summer2026-Internships) — synced daily into the job board and used as Autopilot input.
- **Exa** for live web search inside the Interview Prep agent.
- **OpenRouter / DigitalOcean Gradient AI** for inference routing.
- **shadcn/ui patterns** referenced for component composition (no direct fork — built on Tailwind primitives).
- **The Linear & Stanford brand systems** for visual inspiration (Cardinal Red `#8C1515` on white).
- No code was forked from another job-tracker repo. Pipelined is built from scratch on the FARM stack. Where libraries are used, they are listed in `backend/requirements.txt`, `frontend/package.json`, and `extension/package.json`.

---

## Local setup

### Prerequisites

- Python 3.12
- Node 20+
- MongoDB (Atlas free tier or local instance)
- Chrome (for the extension)

### 1. Backend `.env`

```bash
cp .env.example backend/.env
```

Required values:

```bash
MONGO_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net
MONGO_DB_NAME=pipelined
JWT_SECRET=<any-long-random-string>

# Inference (DigitalOcean Gradient AI — OpenRouter-compatible)
OPENROUTER_API_KEY=...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
OPENROUTER_DEFAULT_MODEL=google/gemini-2.0-flash-001
```

Optional values (each unlocks a feature — see `.env.example` for the full list):

```bash
OPENAI_API_KEY=...          # resume parsing + extension fallback
GEMINI_API_KEY=...          # Interview Prep extractor
EXA_API_KEY=...             # Interview Prep web search
GITHUB_TOKEN=...            # job board sync
SMTP_HOST=localhost         # Morning Brief email delivery
GMAIL_CLIENT_ID=...         # read-only Gmail sync
```

### 2. Run

```bash
# Backend
cd backend && pip install -r requirements.txt && uvicorn main:app --reload
# → http://localhost:8000

# Frontend (in a second shell)
cd frontend && npm install && npm run dev
# → http://localhost:5173

# Extension (optional)
# chrome://extensions → Developer Mode → Load unpacked → select /extension
```

### 3. Tests

```bash
cd backend && pytest tests/        # real MongoDB required
cd frontend && npm test
cd extension && npm test
```

---

## Project structure

```
/backend     FastAPI — auth, applications, brief, copilot, review,
             watchlist, autopilot, agent, email_integration, ai/, notifications
/frontend    React 18 + Vite — /today, /dashboard, /inbox/pending,
             CoPilotPanel, application detail panel
/extension   Chrome MV3 — content scripts, service worker, popup
/shared      JSON schemas shared across boundaries
/docs        AGENTIC_FEATURES.md, plans, redesign notes, UX audit
```

See `CLAUDE.md` for the architectural rules and `STYLE_GUIDE.md` for the cross-stack coding standards.

---

## Contact

- Live site: [pipelined.live](https://pipelined.live)
- Author: Joseph Le — Stanford CS '28
