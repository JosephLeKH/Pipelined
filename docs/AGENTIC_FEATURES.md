# Agentic Features Guide

Practical reference for Pipelined's AI-powered features built in prd_98–103. All agent LLM calls route through **OpenRouter** unless noted.

## Product Policy

Pipelined **suggests and drafts** — it never takes irreversible actions on your behalf:

| Policy | What it means |
|--------|---------------|
| **No auto-send** | Follow-up drafts are generated on demand in the detail panel. You copy and send manually. Gmail sync is read-only. |
| **No resume/PDF edit** | Resume Insights and Autopilot resume tips are text suggestions only. Your uploaded resume file is never modified. |
| **No auto-apply** | Autopilot approve adds a "To Apply" application with a cover-letter draft. You apply on the company's site when ready. |

---

## OpenRouter Setup

OpenRouter is the canonical LLM provider for Morning Brief prep, Resume Insights, Autopilot scoring/prep, fit scoring, follow-up drafts, and email classification.

```bash
# backend/.env
OPENROUTER_API_KEY=sk-or-...
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1          # default
OPENROUTER_DEFAULT_MODEL=google/gemini-2.0-flash-001      # default
```

**Key files:** `backend/ai/openrouter_client.py` (`complete_json()`), `backend/parsing/ai_cache.py` (per-user daily quota + monthly budget).

**Fallbacks:** Interview Prep Agent still uses Exa + Gemini directly. Fit scoring and classifier fall back to legacy `GEMINI_API_KEY` when OpenRouter is unset. Extension parsing uses OpenAI.

**Without OpenRouter:** Resume Insights returns 503; Autopilot scan skips LLM scoring; fit score and follow-up drafts degrade to Gemini fallback or 503.

---

## Morning Brief

Daily prioritized action list delivered at the user's local hour (default **8am**).

### What it includes

Sections assembled by `backend/notifications/morning_brief.py`:

1. **Follow-ups** — overdue applications; links to `/dashboard?selected={id}&action=follow-up`
2. **Interviews** — today/tomorrow calendar events with prep status
3. **High matches** — applications with fit score ≥ 80
4. **Pending approvals** — top 3 overnight Autopilot matches; links to `/inbox/pending`

Summary line example: *"I found 3 great matches overnight, 2 follow-ups, 1 interview"*

### Delivery

| Channel | Config | Route |
|---------|--------|-------|
| Email (SMTP) | `morning_brief_email` (default true) | Plain text via `notifications/morning_brief_email.py` |
| In-app | `morning_brief_in_app` (default true) | Notification type `morning_brief_ready` → `/brief` |
| On-demand | — | `GET /api/brief/today` (3/hour on-demand generation limit) |

**Scheduler:** job `morning_brief` runs hourly at `:15` UTC. `send_due_morning_briefs()` generates one brief per user per local date.

**User prefs** (Settings → Notifications, `PATCH /api/auth/me`):

- `timezone` (IANA, default `America/New_York`)
- `morning_brief_enabled`, `morning_brief_hour` (0–23)
- `morning_brief_email`, `morning_brief_in_app`
- `weekly_digest_enabled` (default false; legacy weekly digest gated separately)

**Frontend:** `/brief` (`MorningBriefPage.jsx`), nav link with Sun icon.

**SMTP env vars** (for email delivery): `SMTP_HOST`, `SMTP_PORT`, `SMTP_FROM_EMAIL`, `FRONTEND_URL`.

---

## Resume Insights

Compares your resume text to a job description and returns tailoring suggestions.

### Prerequisites

1. Resume uploaded (`/api/auth/resume`)
2. Job description on the application (`job_description` field, max 8000 chars) — paste in DetailPanel or capture via extension

### API

```
POST /api/applications/{app_id}/resume-insights
Rate limit: 5/hour
```

**Response fields:** `keyword_gaps`, `section_suggestions`, `bullet_rewrites` (original + suggested), `overall_summary`.

Cached on the application as `resume_insights` + `resume_insights_at`. Refresh re-runs the LLM call.

**Key files:** `backend/applications/resume_insights/`, `frontend/src/components/ResumeInsightsSection.jsx`.

**UI disclaimer:** *"Suggestions only — we never edit your resume file."*

---

## Application Autopilot

Background agent that finds high-fit jobs from the curated job board and prepares drafts for your review.

### How it works

1. **Nightly scan** — scheduler job `autopilot_scan` at **05:00 UTC**
2. Prefilters via `get_recommended_listings`, then LLM scores each listing (`backend/autopilot/match_scorer.py`)
3. For matches above threshold, generates cover letter + resume tips (`backend/autopilot/prep_generator.py`)
4. Inserts into `pending_opportunities` collection (status `pending`)
5. User reviews at **`/inbox/pending`**

### User prefs (Settings → Autopilot)

| Field | Default | Range |
|-------|---------|-------|
| `autopilot_enabled` | false | — |
| `autopilot_min_match_score` | 80 | 70–95 |
| `autopilot_max_daily` | 5 | — |

Requires a uploaded resume. Dashboard shows `AutopilotResumeBanner` when Autopilot is enabled but no resume exists.

### API

| Method | Route | Action |
|--------|-------|--------|
| GET | `/api/autopilot/pending` | List pending opportunities |
| GET | `/api/autopilot/pending/{id}` | Single opportunity detail |
| POST | `/api/autopilot/pending/{id}/approve` | Creates application at stage **"To Apply"**, persists `cover_letter_draft`, marks approved |
| POST | `/api/autopilot/pending/{id}/dismiss` | Marks dismissed |

Approve redirects to `/dashboard?selected={appId}` with toast: *"Added to pipeline — apply when ready"*.

**Settings copy:** *"We never submit for you."*

---

## Follow-up Drafts

Not a separate page — integrated into Morning Brief and the application detail panel.

- Brief lists overdue follow-ups with link to detail panel (`action=follow-up` auto-expands `FollowUpDraftSection`)
- Draft generated on demand via OpenRouter when user clicks Generate (not pre-generated in the brief job)
- User copies text and sends through their own email client

**Policy comment** in `backend/notifications/morning_brief.py`: *"NEVER send email via Gmail API — drafts are user-initiated only."*

Guardrail test: `backend/tests/test_follow_up_policy.py`.

---

## Scheduler Reference

All jobs registered in `backend/jobs/sync.py`:

| Job ID | Schedule | Purpose |
|--------|----------|---------|
| `github_sync` | Daily, `GITHUB_SYNC_HOUR_UTC` (default 3) | Job board ingestion (feeds Autopilot) |
| `morning_brief` | Hourly at `:15` UTC | Timezone-aware brief generation |
| `autopilot_scan` | Daily 05:00 UTC | Match + prep generation |
| `gmail_sync` | Every 4h (configurable) | Read-only email ingestion |
| `weekly_digest` | Mon 08:00 UTC | Legacy digest (gated by `weekly_digest_enabled`) |
| `generate_notifications` | Hourly at `:00` UTC | Stale-app and deadline notifications |
| `purge_deleted` | Daily 04:00 UTC | Purge soft-deleted applications |

---

## Frontend Routes

| Route | Page | Feature |
|-------|------|---------|
| `/brief` | MorningBriefPage | Daily action list |
| `/inbox/pending` | PendingInboxPage | Autopilot review inbox |
| `/dashboard?selected={id}&action=follow-up` | Dashboard + DetailPanel | Follow-up draft |
| `/settings` | Settings | Notifications + Autopilot prefs |

---

## Troubleshooting

| Symptom | Check |
|---------|-------|
| Resume Insights 503 | `OPENROUTER_API_KEY` set in `backend/.env` |
| Resume Insights 422 | Job description pasted and resume uploaded |
| No morning brief email | SMTP configured; user has email; `morning_brief_email` enabled |
| Empty brief at 8am | Timezone correct; scheduler running (backend must be up) |
| No Autopilot matches | `autopilot_enabled`; resume uploaded; job board has listings; score threshold |
| Brief generation 429 | On-demand limit (3/hour); wait for scheduled delivery |

For deeper architecture context see `CLAUDE.md` and `AGENT_ROADMAP.md`.
