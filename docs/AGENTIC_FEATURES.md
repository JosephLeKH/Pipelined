# Agentic Features Guide

Practical reference for Pipelined's AI-powered features (prd_98–123). All agent LLM calls route through **OpenRouter** unless noted.

## Product Policy

Pipelined **suggests and drafts** — it never takes irreversible actions on your behalf:

| Policy | What it means |
|--------|---------------|
| **No auto-send** | Follow-up drafts are generated on demand in the detail panel. You copy and send manually. Gmail sync is read-only — no `messages.send` paths. Co-pilot may suggest next steps but only emits `open_app` deep links, never send/apply actions. |
| **No resume/PDF edit** | Resume Insights, Autopilot resume tips, and Apply Pack are text suggestions only. Your uploaded resume file is never modified. |
| **No auto-apply** | Autopilot and Watchlist approve add a "To Apply" application with drafts. Apply Pack generates copy-paste materials. You apply on the company's site when ready. |

---

## OpenRouter Setup

OpenRouter is the canonical LLM provider for Today missions, Morning Brief, Resume Insights, Apply Pack, Mock Interview, Autopilot scoring/prep, fit scoring, follow-up drafts, Co-pilot chat, and email classification.

```bash
# backend/.env
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1          # default
OPENROUTER_DEFAULT_MODEL=google/gemini-2.0-flash-001      # default
```

**Key files:** `backend/ai/openrouter_client.py` (`complete_json()`, `stream_chat()`), `backend/parsing/ai_cache.py` (per-user daily quota + monthly budget).

**Fallbacks:** Interview Prep Agent still uses Exa + Gemini directly. Fit scoring and classifier fall back to legacy `GEMINI_API_KEY` when OpenRouter is unset. Extension parsing uses OpenAI.

**Without OpenRouter:** Resume Insights, Apply Pack, Mock Interview, and Co-pilot return 503; Autopilot scan skips LLM scoring; fit score and follow-up drafts degrade to Gemini fallback or 503.

---

## Today (`/today`)

The primary post-login landing page. Combines the Morning Brief with ranked **missions** — prioritized action cards with a human-readable "why" for each item.

### What it shows

- **Hero mission** — highest-priority item from today's brief
- **Mission cards** — follow-ups, ghost apps, interviews, high-fit matches, watchlist finds, autopilot pending
- **Weekly review strip** — pipeline stats when a review exists (see Weekly Review below)
- **End-of-day progress** — `cleared / total` missions completed today

### Mission priority

`backend/brief/mission_scorer.py` ranks brief sections:

| Section | Base priority | Typical reason |
|---------|---------------|----------------|
| Follow-ups | Highest | Overdue — respond today |
| Ghosts | Very high | Waiting longer than your median response time |
| Interviews | High | Upcoming — prep ready or review details |
| OA deadlines | High | OA/take-home due within 7 days |
| High matches | Medium | Fit score ≥ 80 |
| Watchlist finds | Medium | New roles from tracked companies |
| Pending approvals | Lower | Overnight Autopilot matches |

Mission IDs are **stable** — derived from `entity_id` or the application ID in the action URL so snooze/done state persists across brief regenerations.

### Mission actions

| Method | Route | Action |
|--------|-------|--------|
| POST | `/api/brief/missions/{id}/snooze` | Hide until end of next local day (optional custom `until`) |
| POST | `/api/brief/missions/{id}/done` | Mark cleared for today |

State stored in `brief_mission_state` collection. Snoozed and done missions are filtered from the next brief payload.

### Brief API

| Method | Route | Purpose |
|--------|-------|---------|
| GET | `/api/brief/today` | Today's brief + missions (3/hour on-demand generation limit) |
| GET | `/api/brief/history` | Past N days of stored briefs |

**Scheduler:** job `morning_brief` runs hourly at `:15` UTC. `send_due_morning_briefs()` generates one brief per user per local date when local hour matches `morning_brief_hour` (default 8).

**Frontend:** `/today` (`TodayPage.jsx`). Legacy `/brief` redirects to `/today`. NavBar "Today" link; `morning_brief_ready` notifications link to `/today`.

**Auth:** All brief endpoints require `get_verified_user` (email-verified accounts only).

---

## Co-pilot

Slide-over chat assistant grounded in your pipeline data (profile, applications, calendar). Opens from the NavBar Agent (Bot) icon.

### API

```
POST /api/copilot/chat   (SSE stream)
GET  /api/copilot/session
POST /api/copilot/session
Rate limit: 20/hour (chat only)
```

**Session persistence:** Last 20 messages stored in `copilot_sessions` (7-day TTL). Frontend hydrates on panel open and saves after each completed turn.

**Request:** `{ message, history[] }` — prior turns for multi-turn context.

**Response:** Server-Sent Events — `token` chunks, then `done` with optional `open_app` action block.

**Policy enforcement:**
- System prompt mandates suggest-only behavior
- Only `open_app` actions are parsed and executed (`frontend/lib/copilotActions.js`)
- Blocked actions: `send_email`, `apply`, `auto_send`, `auto_apply`, `submit`

**Context:** `backend/ai/copilot_context.py` builds scoped context capped at 8k tokens with `user_id` filters on all queries.

**Audit logging:** structlog event `copilot_chat_request` logs `user_id`, `message_length`, `history_length` — never raw message content.

**Key files:** `backend/copilot/`, `frontend/src/components/CoPilotPanel.jsx`.

---

## Apply Pack

One-click application prep bundle for a specific job — cover letter, form answers, LinkedIn note, and talking points.

### Prerequisites

1. Resume uploaded (`/api/auth/resume`)
2. Job description on the application (`job_description` field)

### API

```
POST /api/applications/{app_id}/apply-pack
Rate limit: 5/hour
```

**Response fields:** `cover_letter`, `short_answers[]` (question + answer), `linkedin_note`, `talking_points[]`.

Cached on the application as `apply_pack`. Autopilot approve seeds `apply_pack` on the new application. Chrome extension popup shows talking points from recent saves (read-only hint — no auto-fill).

**Key files:** `backend/applications/apply_pack/`, `frontend/src/components/ApplyPackSection.jsx`.

**UI disclaimer:** Materials are for copy-paste — Pipelined never submits forms.

---

## Mock Interview

Streaming mock interview session with an AI interviewer, plus end-of-session debrief.

### API

```
POST /api/applications/{app_id}/mock-interview   (SSE stream)
Rate limit: 120/hour (turns); 3 new sessions/day per user
```

**Request:** `{ message, history[], end_session?, interview_round? }`

**Behavior:**
- Up to **10 user turns** per session
- **3 new sessions/day** enforced via atomic `find_one_and_update` on `mock_interview_quotas` (user's local date from timezone)
- `end_session: true` triggers a structured debrief (strengths, improvements, action items)
- Round focus adapts to `phone`, `technical`, `hm`, `onsite`, `final`

**Key files:** `backend/applications/interview_prep/mock_interview.py`, `frontend/src/components/MockInterviewPanel.jsx`.

---

## Watchlist

Track specific companies' career pages. Daily scan fetches new listings and queues high-fit matches for review alongside Autopilot finds.

### Setup

Settings → Autopilot tab → Watchlist section. Up to **25 companies** per user.

| Field | Description |
|-------|-------------|
| `name` | Company display name |
| `careers_url` | Public HTTP(S) careers page URL |

Saved via `PATCH /api/auth/me` as `watchlist_companies[]`.

### How it works

1. **Daily scan** — scheduler job `watchlist_scan` at **06:00 UTC**
2. Fetches each careers page via httpx (`follow_redirects=False`)
3. Parses Greenhouse, Lever, or HTML listings; deduplicates by `url_hash`
4. `watchlist/matcher.py` queues matches into `pending_opportunities` with `source: "watchlist"`
5. User reviews at **`/inbox/pending`** (Watchlist badge on cards)
6. New finds appear in Morning Brief `watchlist_finds` section and Today missions

### Security (SSRF guard)

`auth/url_validation.py` validates `careers_url` on save:
- Blocks private, loopback, link-local, and reserved IP ranges
- Blocks `localhost`, `metadata.google.internal`
- Scan skips blocked URLs with `watchlist_blocked_url` log

**Key files:** `backend/watchlist/`, `frontend/src/components/SettingsWatchlistSection.jsx`.

---

## Weekly Review

Pipeline analytics delivered weekly — response rate, ghost rate, application velocity, and stale applications.

### Metrics

| Metric | Description |
|--------|-------------|
| `response_rate` | Fraction of apps that received at least one stage transition |
| `ghost_rate` | Fraction of active apps waiting longer than median response time |
| `velocity` | Applications submitted this week vs `weekly_goal` |
| `stale_applications` | Apps with no update in `STALE_DAYS` (inactive stages excluded) |

### API

```
GET /api/review/weekly
```

Returns 404 when `weekly_review_enabled` is false (Settings → Notifications).

**Scheduler:** job `weekly_review` runs hourly at `:30` UTC. `generate_due_weekly_reviews()` creates one review per user per ISO week.

**Frontend:** `WeeklyReviewSection` on `/today` below mission progress.

**Key files:** `backend/review/`, `frontend/src/components/WeeklyReviewSection.jsx`.

---

## Ghost Missions

Applications that have gone silent longer than your personal median response time surface as **ghost** missions on Today.

### Detection

`backend/review/ghost_detection.py`:
- Computes median days-to-first-response across your pipeline
- Flags active apps in non-terminal stages waiting ≥ 7 days with no stage change
- Compares wait time to median (fallback 14 days when insufficient history)

### In the brief

- Morning Brief includes a `ghosts` section with per-app wait times
- Mission scorer ranks ghosts at priority 950 (just below follow-ups)
- Reason text: e.g. *"14 days waiting — your median response is 7 days"*

Ghost rate also feeds the Weekly Review aggregate.

---

## Agent Activity

Audit trail of agent runs across all AI features.

### API

```
GET /api/agent/activity?limit=20&application_id={optional}
```

Returns recent entries from `agent_runs` collection: `agent_type`, `status`, `summary`, `created_at`.

**Agent types:** `prep`, `fit`, `autopilot`, `classify`, `brief`, `review`, `follow_up`.

**Frontend:** `AgentActivitySection` in application detail panel; `/activity` page for global feed.

**Isolation:** All queries scoped by `user_id`. Cross-user access blocked (see Security).

---

## Email Timeline

Chronological view of classified Gmail events linked to an application.

### How events are created

Gmail sync (read-only) classifies incoming messages. Each classification writes to `email_events` — metadata only (subject snippet, classification label, timestamp). No email body stored.

### API

```
GET /api/applications/{app_id}/email-events
```

Returns user-scoped timeline for the application. Offer-stage emails trigger `offer_parser.py` extraction (comp, start date) via OpenRouter.

**Frontend:** `EmailTimelineSection` in detail panel timeline tab.

**Key files:** `backend/email_integration/email_events.py`, `frontend/src/components/EmailTimelineSection.jsx`.

---

## OA Deadline Missions

When Gmail sync classifies an email as **Assessment** (OA stage), `deadline_parser.py` extracts the completion deadline via OpenRouter and sets `application.deadline`.

### In the brief

- Morning Brief includes an `oa_deadlines` section for OA-stage apps due within **7 days** (including overdue)
- Mission scorer ranks OA deadlines above high matches (base score 850)
- Today mission cards show a deadline badge: *Due in X days*, *Due today*, or *Overdue*
- Stable mission IDs use the application ID (`entity_id`)

**Key files:** `backend/email_integration/deadline_parser.py`, `backend/notifications/brief_oa_deadlines.py`, `frontend/src/components/MissionCard.jsx`.

---

## Morning Brief (legacy reference)

The brief payload powers Today missions. Sections assembled by `backend/notifications/morning_brief.py`:

1. **Follow-ups** — overdue applications
2. **Ghosts** — silent apps exceeding median wait
3. **Interviews** — today/tomorrow calendar events with prep status
4. **OA deadlines** — OA/take-home applications due within 7 days (from `application.deadline`)
5. **High matches** — applications with fit score ≥ 80
6. **Watchlist finds** — new roles from tracked companies
7. **Pending approvals** — top overnight Autopilot matches

### Delivery

| Channel | Config | Route |
|---------|--------|-------|
| Email (SMTP) | `morning_brief_email` (default true) | Plain text via `notifications/morning_brief_email.py` |
| In-app | `morning_brief_in_app` (default true) | Notification type `morning_brief_ready` → `/today` |

**User prefs** (Settings → Notifications, `PATCH /api/auth/me`):

- `timezone` (IANA, default `America/New_York`)
- `morning_brief_enabled`, `morning_brief_hour` (0–23)
- `morning_brief_email`, `morning_brief_in_app`
- `weekly_review_enabled` (default true)
- `weekly_digest_enabled` (default false; legacy weekly digest gated separately)

---

## Resume Insights

Compares your resume text to a job description and returns tailoring suggestions.

### Prerequisites

1. Resume uploaded (`/api/auth/resume`)
2. Job description on the application (`job_description` field, max 8000 chars)

### API

```
POST /api/applications/{app_id}/resume-insights
Rate limit: 5/hour
```

**Response fields:** `keyword_gaps`, `section_suggestions`, `bullet_rewrites` (original + suggested), `overall_summary`.

Cached on the application as `resume_insights` + `resume_insights_at`.

**Key files:** `backend/applications/resume_insights/`, `frontend/src/components/ResumeInsightsSection.jsx`.

---

## Application Autopilot

Background agent that finds high-fit jobs from the curated job board and prepares drafts for your review.

### How it works

1. **Nightly scan** — scheduler job `autopilot_scan` at **05:00 UTC**
2. Prefilters via `get_recommended_listings`, then LLM scores each listing
3. For matches above threshold, generates cover letter + resume tips + talking points
4. Inserts into `pending_opportunities` (status `pending`, `source: "autopilot"`)
5. User reviews at **`/inbox/pending`**

### User prefs (Settings → Autopilot)

| Field | Default | Range |
|-------|---------|-------|
| `autopilot_enabled` | false | — |
| `autopilot_min_match_score` | 80 | 70–95 |
| `autopilot_max_daily` | 5 | — |

### API

| Method | Route | Action |
|--------|-------|--------|
| GET | `/api/autopilot/pending` | List pending opportunities |
| GET | `/api/autopilot/pending/{id}` | Single opportunity detail |
| POST | `/api/autopilot/pending/{id}/approve` | Creates application at **"To Apply"**, persists drafts |
| POST | `/api/autopilot/pending/{id}/dismiss` | Marks dismissed |

---

## Follow-up Drafts

Integrated into Today missions and the application detail panel.

- Brief lists overdue follow-ups with link to detail panel (`action=follow-up`)
- Draft generated on demand via OpenRouter when user clicks Generate
- User copies text and sends through their own email client

**Policy comment** in `backend/notifications/morning_brief.py`: *"NEVER send email via Gmail API — drafts are user-initiated only."*

Guardrail test: `backend/tests/test_follow_up_policy.py`.

---

## Security & Isolation

Cross-cutting security measures from prd_118–122:

| Control | Implementation |
|---------|----------------|
| **User isolation** | Every query on `applications`, `calendar_events`, `email_events`, `agent_runs`, and mission state includes `user_id`. Tested in `backend/tests/test_agent_isolation.py`. |
| **Verified-user gate** | Brief, Co-pilot, Apply Pack, Mock Interview, and agent endpoints require `get_verified_user`. |
| **Watchlist SSRF** | `auth/url_validation.py` blocks private/internal URLs; scan uses `follow_redirects=False`. |
| **Stable mission IDs** | Derived from `entity_id` or app ID — prevents snooze/done state loss on brief refresh. |
| **Mock interview quota** | Atomic daily session limit (3/day) via `find_one_and_update` on user's local date. |
| **Co-pilot audit** | Logs metadata only (`message_length`, `history_length`) — no raw chat content. |
| **Co-pilot actions** | Server prompt + client parser whitelist only `open_app`; blocked send/apply actions ignored. |
| **Error surfaces** | Agent Activity and Email Timeline show destructive error alerts on fetch failure (no silent empty states). |

---

## Scheduler Reference

All jobs registered in `backend/jobs/sync.py`:

| Job ID | Schedule | Purpose |
|--------|----------|---------|
| `github_sync` | Daily, `GITHUB_SYNC_HOUR_UTC` (default 3) | Job board ingestion (feeds Autopilot) |
| `morning_brief` | Hourly at `:15` UTC | Timezone-aware brief generation |
| `weekly_review` | Hourly at `:30` UTC | Weekly pipeline review generation |
| `autopilot_scan` | Daily 05:00 UTC | Match + prep generation |
| `watchlist_scan` | Daily 06:00 UTC | Watchlist career page fetch + match queue |
| `gmail_sync` | Every 4h (configurable) | Read-only email ingestion + classification |
| `weekly_digest` | Mon 08:00 UTC | Legacy digest (gated by `weekly_digest_enabled`) |
| `generate_notifications` | Hourly at `:00` UTC | Stale-app and deadline notifications |
| `purge_deleted` | Daily 04:00 UTC | Purge soft-deleted applications |

---

## Frontend Routes

| Route | Page | Feature |
|-------|------|---------|
| `/today` | TodayPage | Missions, brief, weekly review, progress strip |
| `/inbox/pending` | PendingInboxPage | Autopilot + Watchlist review inbox |
| `/dashboard?selected={id}&action=follow-up` | Dashboard + DetailPanel | Follow-up draft, Apply Pack, Mock Interview, Resume Insights, Email Timeline, Agent Activity |
| `/activity` | ActivityPage | Global agent activity feed |
| `/settings` | Settings | Agent profile, Notifications, Autopilot, Watchlist |
| `/brief` | — | Redirects to `/today` |

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Resume Insights / Apply Pack / Co-pilot 503 | `OPENROUTER_API_KEY` set in `backend/.env` |
| Resume Insights / Apply Pack 422 | Job description pasted and resume uploaded |
| Mock interview 429 | Daily session limit (3/day); wait until tomorrow (user timezone) |
| No morning brief / empty Today | Timezone correct; scheduler running; `morning_brief_enabled` |
| No Autopilot matches | `autopilot_enabled`; resume uploaded; job board has listings |
| No Watchlist matches | Companies configured; careers URLs public and reachable |
| Watchlist URL rejected | Must be public HTTP(S); no localhost or private IPs |
| Brief generation 429 | On-demand limit (3/hour); wait for scheduled delivery |
| Co-pilot 429 | 20 messages/hour limit |
| Weekly review 404 | `weekly_review_enabled` disabled in Settings |
| Email timeline empty | Gmail connected; sync job running; emails classified for this app |

For deeper architecture context see `CLAUDE.md` and `AGENT_ROADMAP.md`.
