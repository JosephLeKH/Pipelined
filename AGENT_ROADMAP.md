# Pipelined — Agentic System Roadmap

The CRUD app is the world model. Agents read from it, act on it, and write back to it.
Email integration is the nervous system — the event stream that drives most autonomous behavior.

---

## Architecture Overview

```
Gmail (OAuth, user opt-in)
        │
        ▼
  Email Ingestion Worker (Cloudflare Worker)
        │
        ▼
  Email Classifier Agent  ──────────────────────────────────────┐
  (Gemini 2.0 Flash)                                            │
        │                                                        │
        ├── Application confirmation  ──► Create/update record  │
        ├── OA / assessment invite    ──► Status update         │
        ├── Interview invite          ──► Interview Prep Agent ◄─┘
        ├── Rejection                 ──► Status update
        ├── Offer letter              ──► Offer Intelligence Agent
        └── No-reply / ghost          ──► Staleness Agent
                │
                ▼
        MongoDB (Applications, Contacts, Calendar)
                │
                ▼
        React Dashboard (user sees it all)
```

---

## Feature 1 — Email Integration Layer

**The nervous system. Everything else depends on this.**

### What it does
User opts in via Gmail OAuth. Pipelined subscribes to their inbox via Gmail push notifications (Pub/Sub webhook → Cloudflare Worker). Every incoming email is classified and routed.

### Classification targets
| Email type | Action |
|---|---|
| Application confirmation | Create application record if not exists; set status → Applied |
| OA / take-home invite | Update status → OA; extract deadline; add calendar event |
| Phone screen / interview invite | Update status → Interviewing; extract time/date; add calendar event |
| Rejection | Update status → Rejected |
| Offer letter | Update status → Offer; extract comp details if present |
| Recruiter outreach (unsolicited) | Create lead record in job board |
| Silence past N days | Flag for Staleness Agent |

### Implementation
- **Gmail API + OAuth 2.0** — user grants `gmail.readonly` scope
- **Cloudflare Worker** — receives Gmail push notification webhook, enqueues email ID
- **Cloudflare Queue** — decouples ingestion from processing; handles bursts
- **Classification Worker** — pulls from queue, fetches email body, calls Gemini to classify + extract structured fields (company, role, date, status, deadline)
- **MongoDB write** — updates application record with new status + raw email reference

### Key design decisions
- Store only structured extracts in MongoDB, never raw email bodies (privacy)
- Idempotency key = email message ID; prevents duplicate processing on retries
- Classification prompt returns a JSON envelope matching the application schema — no free-form text in the write path

---

## Feature 2 — Automated Application Tracking

**Eliminates the primary manual action users take today.**

### What it does
Most users never manually log applications — they forget. With email integration, every application confirmation email becomes a record automatically. Status updates (OA, interview, rejection) flow in without the user touching the dashboard.

### Flow
```
User applies on company site
        │
        ▼
Confirmation email arrives in Gmail
        │
        ▼
Email Classifier → "application_confirmation"
        │
        ▼
Check: does an application record exist for this company + role?
  Yes → update status, add email to timeline
  No  → create new application record (company, role, date_applied, source="email")
        │
        ▼
Dashboard updates in real time (existing React Query invalidation)
```

### Deduplication
Match incoming emails to existing records by:
1. Exact company name + role title (string normalized)
2. If no match: fuzzy match on company domain extracted from sender address
3. If still no match: create new record flagged for user review ("Did you apply here?")

### What stays manual
- Resume version submitted
- Notes / personal context
- Contacts at the company

Everything status-related becomes automatic.

---

## Feature 3 — Staleness & Follow-up Agent

**Knows when you've been ghosted. Acts on it.**

### What it does
Previously this agent had to infer staleness from "days since status update." With email integration it has ground truth: the actual last communication date. It knows the difference between "no update in the app" and "genuinely no email from this company in 3 weeks."

### Trigger conditions
| Condition | Action |
|---|---|
| Applied, no response in 7 days | Draft follow-up to recruiter |
| Post-OA, no response in 5 days | Draft check-in |
| Post-interview, no response in 7 days | Draft thank-you / status check |
| No contact in 21 days | Recommend marking withdrawn |

### Implementation
- **Cloudflare Durable Object** per application — maintains its own timer and last-communication timestamp
- On every email event for that application, the DO resets its clock
- On timer expiry, DO enqueues a `follow_up_needed` job
- **Follow-up Worker** — pulls job, fetches application context + email thread history, calls Gemini to draft a contextually appropriate follow-up
- Draft surfaces in the UI as a "Suggested Action" card; user approves, edits, or dismisses
- If approved: sends via Gmail API on user's behalf

---

## Feature 4 — Interview Prep Auto-Trigger

**The existing agent, now fired automatically at the right moment.**

### What it does
The Interview Prep Agent already exists and works. Right now the user has to navigate to it manually. With email integration, an interview invite email is the trigger — the agent fires immediately, without any user action.

### Flow
```
Email Classifier → "interview_invite"
        │
        ├── Extract: company, role, interview type (phone/onsite/HM), date/time
        ├── Update application status → Interviewing
        ├── Create calendar event
        │
        └── Enqueue interview_prep_job(app_id)
                │
                ▼
        Interview Prep Worker
                │
                ▼
        Existing agent loop (Gemini 2.0 Flash + tools)
        Researches comp, process, company intel, personalized notes
                │
                ▼
        Briefing stored in application record
                │
                ▼
        Push notification to user: "Your briefing for {company} is ready"
```

### Delta from current implementation
- **Trigger changes** — from user-initiated to event-driven
- **Delivery changes** — result is pre-computed and waiting in the detail panel, not streamed on demand
- SSE streaming UX is still available for manual refreshes
- Briefing regenerates automatically if a second interview round invite arrives

---

## Feature 5 — Live Job Scraping Agent

**Supplements the GitHub crowd-sourced job board with live, personalized postings.**

### Context
The existing GitHub repo job boards (e.g., SimplifyJobs/New-Grad-Positions) are genuinely valuable — CS students watch them closely and they're crowd-sourced with high signal. This agent doesn't replace them. It adds a second source: direct scraping of company career pages and ATS portals, personalized to the user's profile.

### What it does
On a schedule (and when triggered by recruiter outreach emails), the agent scrapes configured targets, deduplicates against the existing job board, scores listings against the user's profile via Vectorize, and surfaces ranked matches.

### Sources
- Company career pages for a user-configured watchlist
- Greenhouse / Lever / Workday job feeds (structured JSON available on most)
- Recruiter outreach emails → extract company + role → scrape that company's current openings

### Implementation
- **Cloudflare Browser Rendering** — for ATS portals that require JS rendering
- **Cloudflare Queue** — batch of scrape jobs, rate-limited per domain
- **Vectorize** — user's resume + saved/applied job embeddings define their taste profile
- New job listings are embedded and scored against profile before surfacing
- **Deduplication** — hash on (company, role, url) against existing job board records
- **Freshness TTL** — listings older than 30 days are marked stale automatically

### Interaction with email layer
When a recruiter cold-emails the user, the email classifier extracts the company and role. The scraping agent immediately fetches that company's current openings and surfaces them — turning cold outreach into a research trigger.

---

## How the Features Interact

```
Recruiter email
    └──► Email Classifier ──► Scraping Agent fires for that company
                          └──► Lead record created in job board

User applies (via extension or email confirmation)
    └──► Application record created/updated
              │
              ├──► Durable Object timer starts (Staleness Agent)
              │
              └──► (if interview invite) Interview Prep Agent fires
                            │
                            └──► Briefing stored, notification sent

Email silence past threshold
    └──► Staleness Agent ──► Follow-up draft surfaced in UI
                         └──► User approves ──► Gmail API sends
```

Every agent reads from and writes back to the same MongoDB application records. The dashboard is the read layer. Email is the write trigger. Agents are the compute in between.

---

## Implementation Phases

### Phase 1 — Email Layer Foundation
- Gmail OAuth + push notification webhook
- Email ingestion Worker + Queue
- Classification agent (Gemini) with structured output
- Automated application create/update

### Phase 2 — Reactive Agents
- Staleness Agent (Durable Objects + follow-up drafting)
- Interview Prep auto-trigger (wire existing agent to email events)

### Phase 3 — Proactive Agents
- Live job scraping (Browser Rendering + Vectorize scoring)
- Recruiter outreach → scrape trigger integration
