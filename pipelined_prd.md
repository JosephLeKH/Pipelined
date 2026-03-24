# PIPELINED — Technical Design Document

**v1.0 — March 2026**

Job Application Tracking Platform
FARM Stack · Chrome Extension MV3 · AWS ECS · MongoDB Atlas

---

## Table of Contents

1. [Goal & Problem Statement](#1-goal--problem-statement)
2. [Definitions & Terminology](#2-definitions--terminology)
3. [Architecture](#3-architecture)
4. [Data Models](#4-data-models)
5. [API Design](#5-api-design)
6. [Chrome Extension Design](#6-chrome-extension-design)
7. [Frontend Design](#7-frontend-design)
8. [Design Decisions & Trade-offs](#8-design-decisions--trade-offs)
9. [Implementation Plan](#9-implementation-plan)
10. [Source Files](#10-source-files)
11. [Testing Strategy](#11-testing-strategy)
12. [Edge Cases](#12-edge-cases)
13. [Security Considerations](#13-security-considerations)
14. [Observability & Monitoring](#14-observability--monitoring)
15. [Performance & Scalability](#15-performance--scalability)
16. [Out of Scope](#16-out-of-scope)
17. [Extensions (v2)](#17-extensions-v2-roadmap)
18. [Dependencies](#18-dependencies)
19. [Rollout Strategy](#19-rollout-strategy)

---

## 1. Goal & Problem Statement

### 1.1 Problem

Job seekers applying to dozens or hundreds of positions have no centralized, lightweight system to track where they stand. They cobble together spreadsheets, Notion boards, and browser bookmarks. Applications slip through cracks, interview dates get missed, and there is zero visibility into pipeline health. Existing tools are either too heavyweight (full ATS platforms aimed at recruiters) or too generic (Trello, spreadsheets) to provide the tight, purpose-built experience applicants need.

### 1.2 Solution

Pipelined is a lightweight job application operating system. It captures applications via a Chrome extension or manual entry, organizes them in a clean pipeline view, visualizes upcoming events on a calendar, and surfaces new opportunities via a curated job board. The emphasis is on speed, simplicity, and a polished UI that makes the tedious process of job hunting feel manageable.

### 1.3 Success Criteria

The v1 launch is successful when:

- A user can install the extension, save a job application from a supported board in one click, and see it appear in their dashboard within 2 seconds.
- The pipeline view provides clear, sortable, filterable visibility across all applications with zero manual data wrangling.
- Calendar events linked to applications give the user a single view of upcoming interviews and deadlines.
- The job board surfaces fresh, relevant listings that funnel seamlessly into the application pipeline via the extension.
- The system handles up to 10,000 concurrent users on the initial ECS deployment without degradation.

---

## 2. Definitions & Terminology

| Term | Definition |
|------|-----------|
| **Application** | A single job application tracked by the user. Contains company, role, stage, metadata, notes, and linked calendar events. |
| **Pipeline** | The ordered list of all applications for a user, displayed as the home screen. Single-list layout, not Kanban. |
| **Stage** | The current status of an application (e.g. Applied, Phone Screen, Onsite, Offer, Rejected). Default template ships globally; each application can diverge independently. |
| **Stage History** | An append-only log of every stage transition for an application, with timestamps. |
| **Detail Panel** | A slide-in panel from the right side of the dashboard that shows all fields, notes, stage editor, calendar events, and the original posting link for a single application. |
| **Silent Save** | The extension's core UX pattern: user clicks once on the banner, application saves in the background, user stays on the job page. No redirect, no new tab. |
| **DOM Scraping** | Primary parse method. Content script extracts structured data (role, company, location, etc.) directly from the page DOM on supported boards. |
| **Fallback Parse** | Secondary parse using OpenAI GPT-4o mini. Activated only for Workday and unstructured pages. Sends ~800 tokens, returns 6-field JSON. |
| **Job Listing** | An entry in the job board, sourced from curated GitHub repos. Distinct from an Application — a listing becomes an application only when the user explicitly saves it. |
| **Nudge** | A visual indicator (amber dot) on applications with no update in 14 days. In-app only, no email in v1. |
| **FARM Stack** | FastAPI + React + MongoDB. The core technology stack for the application. |
| **MV3** | Chrome Manifest V3, the current Chrome extension platform. Uses service workers instead of background pages. |
| **ECS Fargate** | AWS container orchestration service. Runs Docker containers without managing EC2 instances. |

---

## 3. Architecture

### 3.1 System Overview

Pipelined is a four-component system: a React single-page application (the dashboard), a FastAPI backend, a Chrome MV3 extension, and a MongoDB Atlas database. All user-facing traffic flows through the FastAPI REST API. The extension communicates directly with the same API. There are no inter-service message queues, no event buses, and no microservice decomposition in v1 — the backend is a single deployable unit.

### 3.2 Component Topology

| Component | Technology | Hosting | Responsibility |
|-----------|-----------|---------|---------------|
| Frontend SPA | React 18 + Vite + TailwindCSS | Vercel | Dashboard, calendar, job board, landing page, auth flows |
| Backend API | FastAPI (Python 3.12, async) | AWS ECS Fargate | REST API, auth, CRUD, OpenAI fallback, GitHub polling, JWT management |
| Database | MongoDB Atlas (M10+) | AWS us-east-1 | All persistent data: users, applications, calendar events, job listings |
| Chrome Extension | Manifest V3 (content scripts + service worker) | Chrome Web Store | Job page detection, DOM scraping, banner UI, API calls via service worker |
| AI Parsing | OpenAI GPT-4o mini | OpenAI API (external) | Fallback-only: 6-field JSON extraction for unstructured pages |
| Job Sync | APScheduler (in-process) | Runs inside FastAPI container | Daily GitHub repo polling, listing ingestion, deduplication |

### 3.3 Data Flow

#### 3.3.1 Extension Save Flow

This is the critical path — the interaction that must feel instant.

1. User navigates to a supported job board listing (LinkedIn, Greenhouse, Lever, Ashby, Workday).
2. Content script fires on page load, scans DOM, determines if this is a job posting. If not, nothing happens.
3. If a job posting is detected, the content script extracts structured fields via DOM selectors (primary parse).
4. A non-intrusive toast banner appears at the bottom of the page: "Applied for [Role] at [Company]? Save to Pipelined →". Auto-dismisses after 8 seconds.
5. User clicks the banner. Content script sends extracted data to the service worker.
6. Service worker calls `POST /api/applications` with the extracted payload + auth token from storage.
7. FastAPI validates, checks for duplicates (company + role match against user's existing applications), and writes to MongoDB.
8. If primary parse returned incomplete data AND the page is Workday or unstructured, FastAPI calls OpenAI GPT-4o mini with trimmed page text (~800 tokens). Parses 6-field JSON response and merges into the application document.
9. API returns 201 with the created application. Service worker relays success to the content script.
10. Content script shows a checkmark on the banner, then fades it after 1.5 seconds. User never leaves the job page.

#### 3.3.2 Job Board Apply Flow

1. User browses the Pipelined job board (sourced from GitHub repos, refreshed daily).
2. User clicks "Apply" on a listing. This opens the external posting URL in a new tab.
3. The Chrome extension's content script fires naturally on that new tab (if it's a supported board).
4. Normal extension save flow continues from step 2 above.

#### 3.3.3 Job Sync Flow

1. APScheduler triggers daily at 03:00 UTC (configurable).
2. Scheduler fetches README or JSON files from 2–3 curated GitHub repos via GitHub API (with pagination).
3. Parser extracts structured listing data from README tables or JSON arrays.
4. Each listing is hashed by apply URL (SHA-256 of the normalized URL).
5. Listings are upserted into the `job_listings` collection. Duplicates (matching `url_hash`) are skipped.
6. Listings older than 60 days are flagged as stale (not removed) via an `is_stale` boolean.

#### 3.3.4 Authentication Flow

**Google OAuth:** User clicks "Sign in with Google" on the landing page or extension popup. Frontend redirects to Google's consent screen via Google Identity Services. On callback, the frontend receives an ID token and sends it to `POST /api/auth/google`. The backend verifies the token with Google, creates or retrieves the user document, generates a JWT pair (access + refresh), and sets both as httpOnly cookies. The access token has a 15-minute TTL; the refresh token has a 7-day TTL.

**Email + Password:** User fills out a registration form. `POST /api/auth/register` accepts email and password, hashes the password with bcrypt (work factor 12), sends a verification email (v2 — in v1 we skip email verification and activate immediately), and returns the JWT pair. Login via `POST /api/auth/login` validates credentials and issues a fresh JWT pair.

**Extension Auth:** After the user authenticates on the web dashboard, the extension reads the access token from the httpOnly cookie shared across the same domain. If the extension is used on a different domain, the service worker fetches a token from the dashboard's `/api/auth/extension-token` endpoint (requires an active session). Stored in `chrome.storage.session` (cleared when Chrome closes).

---

## 4. Data Models

All data lives in MongoDB Atlas. The document model is a natural fit for per-application stage customization and flexible schema evolution. Below are the four collections with field-level specifications.

### 4.1 `users`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB primary key |
| `email` | string | Yes | Unique, indexed. Validated format on write. |
| `password_hash` | string | No | bcrypt hash (work factor 12). Null for Google-only users. |
| `google_id` | string | No | Google sub claim. Null for email-only users. Indexed. |
| `display_name` | string | Yes | From Google profile or set at registration. |
| `default_stages` | string[] | Yes | Default pipeline template. Ships as `["Applied", "Phone Screen", "Onsite", "Offer", "Rejected"]`. |
| `created_at` | datetime | Auto | UTC. Set on insert. |
| `updated_at` | datetime | Auto | UTC. Updated on any mutation. |

**Indexes:** `{ email: 1 }` unique; `{ google_id: 1 }` sparse unique.

### 4.2 `applications`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB primary key |
| `user_id` | ObjectId | Yes | References `users._id`. Indexed. |
| `role_title` | string | Yes | Parsed or manually entered. |
| `company` | string | Yes | Parsed or manually entered. |
| `compensation` | string | No | Free text. Parsed from listing if available. |
| `company_type` | string | No | Enum-like: startup, mid, enterprise, gov, nonprofit, other. |
| `location` | string | No | Free text. City, state, or "Remote". |
| `remote_status` | string | No | Enum: remote, hybrid, onsite, unknown. |
| `source_url` | string | No | Original posting URL. Nullable for manual entries. |
| `source` | string | Yes | Enum: extension, board, manual. |
| `date_applied` | datetime | Yes | User-editable. Defaults to now. |
| `current_stage` | string | Yes | Current stage name. Defaults to "Applied". |
| `stages` | string[] | Yes | This application's stage template. Initialized from `user.default_stages`, then diverges independently. |
| `stage_history` | object[] | Yes | Append-only log: `[{ stage, transitioned_at, notes? }]`. First entry auto-created on insert. |
| `tags` | string[] | No | User-defined tags for filtering. |
| `notes` | string | No | Rich text notes (stored as markdown or plain text). |
| `created_at` | datetime | Auto | UTC. |
| `updated_at` | datetime | Auto | UTC. Updated on any mutation. Drives the 14-day nudge. |

**Indexes:** `{ user_id: 1, date_applied: -1 }` compound (primary query); `{ user_id: 1, company: 1, role_title: 1 }` compound unique (duplicate guard); `{ user_id: 1, updated_at: 1 }` for nudge queries.

### 4.3 `calendar_events`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB primary key |
| `user_id` | ObjectId | Yes | References `users._id`. Indexed. |
| `application_id` | ObjectId | Yes | References `applications._id`. Indexed. |
| `event_type` | string | Yes | Enum: recruiter_call, phone_screen, technical_interview, behavioral_interview, coffee_chat, oa_deadline, offer_deadline, custom. |
| `title` | string | No | Optional override. If null, UI composes from company + event_type. |
| `date` | date | Yes | Calendar date of the event. |
| `time` | string | No | Time of day (HH:MM in 24h). Null if all-day. |
| `notes` | string | No | Free text. |
| `created_at` | datetime | Auto | UTC. |

**Indexes:** `{ user_id: 1, date: 1 }` compound (calendar view query); `{ application_id: 1 }` for detail panel lookups.

### 4.4 `job_listings`

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `_id` | ObjectId | Auto | MongoDB primary key |
| `source_repo` | string | Yes | GitHub repo identifier (e.g. `SimplifyJobs/Summer2026-Internships`). |
| `company` | string | Yes | Company name as parsed from the repo. |
| `role` | string | Yes | Role title. |
| `location` | string | No | Location string. |
| `remote_status` | string | No | Enum: remote, hybrid, onsite, unknown. |
| `company_type` | string | No | Enum-like: startup, mid, enterprise, etc. |
| `experience_level` | string | No | Enum: intern, new_grad, mid, senior, unknown. |
| `salary_range` | string | No | Free text if available. |
| `apply_url` | string | Yes | External posting URL. The user clicks this to apply. |
| `url_hash` | string | Yes | SHA-256 of normalized `apply_url`. Unique index. Dedup key. |
| `date_posted` | datetime | No | Parsed from source if available. |
| `is_stale` | boolean | Yes | True if older than 60 days. Defaults false. |
| `ingested_at` | datetime | Auto | UTC. When this listing was first ingested. |

**Indexes:** `{ url_hash: 1 }` unique (dedup); `{ is_stale: 1, date_posted: -1 }` compound (board queries); `{ experience_level: 1, remote_status: 1 }` compound (filter acceleration).

---

## 5. API Design

The FastAPI backend exposes a REST API organized around four resource groups: auth, applications, calendar events, and job listings. All endpoints return JSON. All mutating endpoints require a valid JWT access token in an httpOnly cookie. Below is the complete v1 route inventory.

### 5.1 Auth Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/register` | None | Email + password registration. Returns JWT pair in httpOnly cookies. |
| POST | `/api/auth/login` | None | Email + password login. Returns JWT pair. |
| POST | `/api/auth/google` | None | Google OAuth callback. Accepts Google ID token, creates or retrieves user, returns JWT pair. |
| POST | `/api/auth/refresh` | Refresh token | Issues a new access token using the refresh token. |
| POST | `/api/auth/logout` | Access token | Clears both cookies. |
| GET | `/api/auth/me` | Access token | Returns the current user's profile (id, email, display_name, default_stages). |
| GET | `/api/auth/extension-token` | Access token | Returns a short-lived token for the Chrome extension to store in `chrome.storage.session`. |

### 5.2 Application Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/applications` | Access token | List all applications for the current user. Supports query params: `sort_by` (date_applied, current_stage, company, updated_at), `sort_order` (asc/desc), `stage`, `company_type`, `remote_status`, `tags`, `date_from`, `date_to`. Returns paginated results (default 50, max 200). |
| POST | `/api/applications` | Access token | Create a new application. Accepts role_title, company, source_url, source, compensation, company_type, location, remote_status, date_applied, tags. Runs duplicate guard. If source is extension and data is incomplete, triggers OpenAI fallback. |
| GET | `/api/applications/:id` | Access token | Get a single application with full detail (includes stage_history, linked calendar_events). |
| PATCH | `/api/applications/:id` | Access token | Partial update. Any field can be patched. If current_stage changes, a new stage_history entry is appended automatically. `updated_at` is refreshed. |
| DELETE | `/api/applications/:id` | Access token | Soft delete (sets `deleted_at`) or hard delete. Cascades to linked calendar_events. |
| GET | `/api/applications/stats` | Access token | Returns aggregate stats: total_applied, active_count, response_rate, avg_days_to_first_response. |
| POST | `/api/applications/:id/stages` | Access token | Add a custom stage to this application's stage template. Accepts stage_name and position (index in the stages array). |
| DELETE | `/api/applications/:id/stages/:name` | Access token | Remove a custom stage from this application's template. Cannot remove the stage that is currently active. |

### 5.3 Calendar Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/calendar/events` | Access token | List events for the current user. Supports `date_from` and `date_to` (defaults to current month). Returns events with populated application summary (company, role). |
| POST | `/api/calendar/events` | Access token | Create an event linked to an application. Accepts application_id, event_type, date, time, notes, title. |
| PATCH | `/api/calendar/events/:id` | Access token | Update event fields. |
| DELETE | `/api/calendar/events/:id` | Access token | Hard delete. |

### 5.4 Job Board Routes

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/jobs` | Optional | List job listings. Supports filters: role_type, experience_level, company_type, remote_status, date_from, salary_min, hide_applied (requires auth). Paginated (default 30, max 100). Stale listings (`is_stale=true`) are included but marked. |
| GET | `/api/jobs/:id` | None | Get a single listing. |

### 5.5 API Conventions

**Response format:** All responses follow `{ data: T | T[], meta?: { total, page, per_page } }` for success, and `{ error: { code: string, message: string, details?: object } }` for errors.

**Status codes:** 200 OK, 201 Created, 204 No Content (deletes), 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 409 Conflict (duplicate), 422 Unprocessable Entity (validation), 429 Too Many Requests, 500 Internal Server Error.

**Pagination:** Cursor-based for applications (using `_id` as cursor) to avoid skip/limit performance issues at scale. Offset-based for job listings (lower cardinality, simpler queries).

**Rate limiting:** Implemented via slowapi (FastAPI middleware). 60 requests/minute per user for standard endpoints, 10/minute for OpenAI-triggering endpoints, 5/minute for auth endpoints.

---

## 6. Chrome Extension Design

### 6.1 Manifest V3 Architecture

The extension has three layers: content scripts that run on job board pages, a service worker that handles background tasks and API communication, and a popup UI that shows a mini dashboard.

| Layer | File(s) | Runs On | Responsibility |
|-------|---------|---------|---------------|
| Content Script | `content.js`, `content.css` | Matching job board URLs | DOM detection, field extraction, banner UI injection, message passing to service worker. |
| Service Worker | `background.js` | Extension context (MV3) | API calls to FastAPI, token management (`chrome.storage.session`), message routing between content scripts and popup. |
| Popup | `popup.html`, `popup.js` | Extension icon click | Mini dashboard: last 5 saved applications, quick link to full dashboard, login status. |

### 6.2 Supported Boards & Detection

Content scripts are injected only on matching URL patterns, declared in the manifest:

| Board | URL Pattern | Parse Method | Selector Strategy |
|-------|-------------|-------------|-------------------|
| LinkedIn | `*://www.linkedin.com/jobs/*` | DOM | Structured selectors on `.job-details-jobs-unified-top-card` container. High reliability. |
| Greenhouse | `*://boards.greenhouse.io/*` | DOM | Selectors on `.app-title`, `.company-name`, `.location`. Consistent across clients. |
| Lever | `*://jobs.lever.co/*` | DOM | Selectors on `.posting-headline h2`, `.posting-categories .sort-by-time`. Clean structure. |
| Ashby | `*://jobs.ashbyhq.com/*` | DOM | Selectors on `[data-testid]` attributes. Newer board, well-structured DOM. |
| Workday | `*://*.myworkday.com/*` | GPT-4o mini fallback | Shadow DOM and dynamic rendering make DOM parsing unreliable. Trimmed page text sent to OpenAI. |

### 6.3 Banner UX Specification

The banner is the primary interaction surface. It must be non-intrusive, fast, and reliable.

- **Position:** Fixed to the bottom of the viewport, 16px from the bottom edge, centered horizontally. Max width 480px.
- **Appearance:** Rounded card with subtle shadow. White background, 14px text. Pipelined logo mark on the left. CTA button on the right.
- **Content:** "Applied for [Role] at [Company]? Save to Pipelined →" where Role and Company are extracted from the page.
- **Auto-dismiss:** Fades out after 8 seconds if not interacted with. Uses CSS opacity transition (300ms).
- **Save state:** On click, the CTA text changes to a checkmark icon. Stays visible for 1.5 seconds, then fades.
- **Error state:** If the save fails, the banner shows "Couldn't save. Try again" with a retry button. Does not auto-dismiss.
- **Duplicate state:** If the duplicate guard triggers, shows "You've already tracked this role at [Company]" with a link to the existing application. Dismisses on click.
- **Z-index:** 2147483647 (max) to ensure visibility above all page content. Shadow DOM isolation to prevent style conflicts.
- **Accessibility:** Focus-trappable, keyboard navigable (Enter to save, Escape to dismiss). ARIA `role=alert` on appearance.

### 6.4 Field Extraction

The content script extracts six fields from supported pages:

| Field | Type | Fallback |
|-------|------|----------|
| `role_title` | string | Page `<title>` or first `<h1>` |
| `company_name` | string | Domain name extraction |
| `compensation` | string \| null | null if not found |
| `company_type` | string \| null | null (not reliably parseable) |
| `location` | string \| null | null if not found |
| `remote_status` | string \| null | Keyword scan: "remote", "hybrid", "onsite" in listing text |

### 6.5 OpenAI Fallback Protocol

The fallback is triggered only when the content script cannot extract at least `role_title` AND `company_name` via DOM selectors. This happens primarily on Workday pages.

- Content script sends the full page `innerText` to the service worker (not HTML — text only).
- Service worker trims to ~800 tokens (first 3,200 characters, approximately). Sends to the backend.
- Backend calls OpenAI GPT-4o mini with a strict system prompt: "Extract exactly these 6 fields from the job posting text. Return JSON only, no explanation: `{ role_title, company_name, compensation, company_type, location, remote_status }`. If a field is not found, set it to null."
- Temperature: 0.0. Max tokens: 200. Model: `gpt-4o-mini`.
- Response is parsed, validated (all six fields must be present as keys, values can be null), and merged into the application document.
- If OpenAI returns an error or the response fails validation, the application is still saved with whatever data the content script extracted. The user can edit fields manually in the detail panel.
- Cost estimate: ~$0.0001 per call (800 input tokens + ~100 output tokens at GPT-4o mini pricing). Budget cap: $50/month initially, with monitoring.

---

## 7. Frontend Design

### 7.1 Page Structure

| Route | Component | Auth | Description |
|-------|-----------|------|-------------|
| `/` | LandingPage | No | Marketing page for logged-out users. Explains the product, screenshot, CTAs for login/signup and extension install. |
| `/dashboard` | Dashboard | Yes | Pipeline view (home screen). Stats bar at top, filter bar below, application list below that. Default sort: date_applied desc. |
| `/calendar` | Calendar | Yes | Monthly grid view. Events colored by application. Click event to open detail panel. |
| `/jobs` | JobBoard | Optional | Curated listings. Card grid or compact list (toggle). All 7 filters. Apply opens external URL. |
| `/login` | AuthLogin | No | Login form: Google OAuth button + email/password fields. |
| `/register` | AuthRegister | No | Registration form: Google OAuth button + email/password/name fields. |

### 7.2 State Management

The frontend uses a minimal state management approach suitable for the application's complexity level:

- **React Context** for auth state (user object, login/logout actions, loading flag). Single `AuthProvider` wrapping the app.
- **React Query (TanStack Query)** for all server state: applications list, single application, calendar events, job listings, stats. Provides caching, background refetching, optimistic updates, and stale-while-revalidate behavior.
- **Local component state** for UI-only concerns: filter selections, sort order, detail panel open/close, view toggle (card/list).
- **No Redux, no Zustand, no global store.** The app is read-heavy with well-defined server-state boundaries. React Query covers 95% of the state management need.

### 7.3 Key UI Components

**StatsBar:** Renders four metric cards at the top of the dashboard: total applied, active applications (non-rejected, non-offer), response rate (applications with at least one stage change / total), and average days to first response. Fetches from `GET /api/applications/stats`. Refreshes on application mutations via React Query invalidation.

**ApplicationList:** Virtualized list (`react-window`) for performance with large application counts. Each row: company name, role title, stage pill (colored by stage), date applied, source icon. Click opens DetailPanel. Column headers are sortable. Rows with `updated_at` older than 14 days from now show an amber dot indicator.

**FilterBar:** Horizontal bar below StatsBar. Multi-select dropdowns for stage, company type, remote status. Tag filter with autocomplete. Date range picker. Filters persist in URL query params (shareable/bookmarkable) and in sessionStorage.

**DetailPanel:** Slides in from the right (`transform: translateX`, 250ms ease). Fixed width 480px on desktop, full-width on mobile. Contains: all parsed/editable fields, markdown-capable notes editor, stage selector (dropdown with current highlighted), stage history timeline (vertical, chronological), linked calendar events list, "View Original" link. Close on Escape or click outside.

**CalendarGrid:** Monthly grid. Days as cells, events as colored chips inside cells. Each chip shows company name + event type icon. Clicking a chip opens the linked application's DetailPanel. Clicking an empty day opens the "New Event" form pre-filled with that date. Navigation: month forward/back arrows + "Today" button.

**JobCard / JobRow:** Dual-view components for the job board. JobCard: company logo (via Clearbit Logo API or fallback initial), role title, location, tags, "Apply" button. JobRow: compact single-line version. Toggle between views is a persistent user preference (localStorage).

### 7.4 Responsive Breakpoints

| Breakpoint | Width | Layout Changes |
|------------|-------|---------------|
| Desktop | ≥1024px | Full sidebar nav, detail panel slides over content, calendar shows full month grid. |
| Tablet | 768–1023px | Collapsed nav (icons only), detail panel overlays full width, calendar shows abbreviated day names. |
| Mobile | <768px | Bottom tab navigation, detail panel is full-screen modal, calendar shows week-at-a-time strip. |

---

## 8. Design Decisions & Trade-offs

### 8.1 Single List vs. Kanban Board

**Decision:** Single list layout for the pipeline view.

**Rationale:** A Kanban board looks appealing in demos but becomes unwieldy when users have 50+ applications. Columns get unbalanced (80% in "Applied", 2 in "Offer"). Horizontal scrolling on mobile is painful. A single list with stage pills and column sorting gives the same information density with better scannability. Stage filtering achieves the same "focus on one column" effect without the layout cost.

**Trade-off:** Less visual "drag and drop" appeal. Users who are used to Trello-style boards may initially feel the UI is less interactive. Mitigated by the stage selector in the detail panel and potential v2 Kanban toggle.

### 8.2 Per-Application Stage Customization vs. Global Stages

**Decision:** Stages are customizable per application, not just globally.

**Rationale:** Different companies have wildly different interview processes. Google has a bar raiser round; startups might skip straight to an offer call. Forcing a global stage template means either (a) the template is too generic to be useful, or (b) users constantly edit the global template and break their older applications. Per-application stages let each tracking record match reality.

**Trade-off:** Slightly more complex data model (`stages[]` on each application document). Filtering by stage becomes a text match rather than an enum lookup. Mitigated by also maintaining `current_stage` as a top-level field, and by initializing each application's stages from `user.default_stages` so the common case is zero-config.

### 8.3 MongoDB vs. PostgreSQL

**Decision:** MongoDB Atlas as the sole database.

**Rationale:** The data model has three characteristics that favor documents over relations: (1) Per-application stage arrays and stage history are natural embedded documents, avoiding join-heavy queries. (2) Parsed field schemas vary by source (extension scrape vs. OpenAI fallback vs. manual entry); MongoDB handles heterogeneous documents without migrations. (3) The `job_listings` collection is a write-heavy ingest target with simple read patterns that benefit from MongoDB's write performance. Additionally, MongoDB Atlas provides a fully managed, auto-scaling deployment with built-in monitoring, eliminating the need for RDS management.

**Trade-off:** No ACID transactions across collections (though single-document atomicity in MongoDB covers 99% of our write patterns). No relational joins (but our read patterns are document-centric, not relational). Less mature tooling for complex aggregations compared to SQL. If we later need analytics-grade querying, we may add a read replica or warehouse sync.

### 8.4 FastAPI vs. Express/Node

**Decision:** FastAPI (Python) for the backend.

**Rationale:** (1) Async-native: FastAPI's async/await integrates cleanly with Motor (async MongoDB driver) and httpx (async HTTP for OpenAI calls), giving high concurrency without threads. (2) Pydantic models provide runtime validation and automatic OpenAPI docs, reducing boilerplate. (3) Python is the natural language for the OpenAI SDK and any future ML features. (4) APScheduler integrates directly as an in-process scheduler, no separate service needed for the job sync cron.

**Trade-off:** Python is slower than Node for CPU-bound work (not a factor — our workload is I/O-bound). The ecosystem for real-time features (WebSockets) is slightly less mature than Node's, but we don't need real-time in v1.

### 8.5 ECS Fargate vs. Lambda vs. EC2

**Decision:** AWS ECS Fargate for the backend container.

**Rationale:** (1) Fargate runs long-lived containers, which FastAPI + APScheduler require (the scheduler needs to be running continuously, not invoked per-request). (2) No server management — we define task definitions and Fargate handles capacity. (3) Docker-native: same container runs locally and in production. (4) Scales to zero is not available, but scales horizontally by adding tasks, which matches our traffic pattern (steady, not spiky).

**Trade-off:** Fargate has a minimum cost even at low traffic (~$30–50/month for a single 0.5 vCPU / 1GB task). Lambda would be cheaper at very low request volumes, but Lambda's cold starts and 15-minute execution limit conflict with the APScheduler requirement. EC2 gives more control but adds operational burden.

### 8.6 Vercel vs. S3+CloudFront for Frontend

**Decision:** Vercel for the React SPA.

**Rationale:** (1) Zero-config deployment from Git. Push to main deploys to production. (2) Automatic preview deployments for PRs. (3) Edge CDN included. (4) Free tier covers our initial scale. (5) Clean integration with Vite builds.

**Trade-off:** Vendor lock-in for hosting (easy to migrate since it's a static SPA). No server-side rendering (not needed for our SPA architecture). If we outgrow the free tier, pricing can ramp — at that point, migrating to S3+CloudFront is straightforward.

### 8.7 JWT in httpOnly Cookies vs. localStorage

**Decision:** JWTs stored in httpOnly, Secure, SameSite=Lax cookies.

**Rationale:** httpOnly cookies cannot be accessed by JavaScript, eliminating XSS-based token theft — the most common attack vector for SPAs. SameSite=Lax prevents CSRF for non-GET requests. The access token's 15-minute TTL limits the blast radius of any compromise. The refresh token's 7-day TTL balances UX (users don't re-login daily) with security.

**Trade-off:** Cookies are automatically sent on every request to the domain, adding slight overhead. Cross-origin requests (if frontend and backend are on different domains) require explicit CORS configuration with `credentials: true`. The extension needs a separate token flow (extension-token endpoint) since it operates outside the cookie's domain scope.

### 8.8 OpenAI Fallback vs. Universal AI Parsing

**Decision:** Use OpenAI only as a fallback for Workday and unstructured pages. DOM scraping is the primary parser.

**Rationale:** DOM scraping is free, fast (~5ms), deterministic, and works reliably on well-structured boards (LinkedIn, Greenhouse, Lever, Ashby). Sending every page through GPT-4o mini would add ~500ms latency, ~$0.0001/request cost, and nondeterministic parsing. The "silent save" UX promise requires speed; adding an AI round-trip to every save would break that promise for 80% of pages that don't need it.

**Trade-off:** DOM selectors are fragile. When LinkedIn or Greenhouse change their markup, the content script breaks until selectors are updated. Mitigated by (1) selector versioning with a fallback chain per board, (2) a `/health/selectors` endpoint that tests known-good page structures nightly, and (3) the OpenAI fallback as a safety net — if DOM extraction fails completely, the fallback can still capture the basics.

### 8.9 Cursor-Based vs. Offset Pagination

**Decision:** Cursor-based pagination for the applications list; offset-based for job listings.

**Rationale:** Applications are the primary CRUD resource. Users can have hundreds. MongoDB's `skip()` is O(n) — it still scans skipped documents internally. Cursor-based pagination (using `_id` or a composite key as the cursor) gives O(1) page loads regardless of position. Job listings are a read-only, moderately sized collection (~5,000–20,000 entries) with simpler access patterns, where offset pagination's simplicity outweighs the performance cost.

---

## 9. Implementation Plan

The build is organized into 6 phases, each producing a deployable (if incomplete) artifact. Phases are sequential but tasks within a phase can be parallelized across agents/developers. Estimated total: 8–10 weeks for a solo developer, 4–5 weeks with 2 parallel agents.

### 9.1 Phase 1: Foundation (Week 1–2)

**Goal:** Skeleton deployable. Auth works. Database connected. CI/CD pipeline live.

1. Initialize monorepo structure: `/frontend` (React + Vite), `/backend` (FastAPI), `/extension` (Chrome MV3), `/shared` (types/constants).
2. Set up FastAPI project: `pyproject.toml`, uvicorn config, CORS middleware, health endpoint.
3. Configure MongoDB Atlas cluster (M10, us-east-1). Create database and all four collections with indexes.
4. Implement Motor async client with connection pooling and retry logic.
5. Build auth module: user registration (email + password + bcrypt), login, JWT generation (PyJWT), cookie setting, refresh flow, middleware guard.
6. Build Google OAuth flow: Google Identity Services integration, ID token verification, user create-or-fetch.
7. Build `GET /api/auth/me` endpoint.
8. Set up Docker: Dockerfile for FastAPI (multi-stage build, slim Python image), `docker-compose.yml` for local dev (app + MongoDB).
9. Set up frontend: Vite + React + TailwindCSS. Configure proxy for local API. AuthContext provider. Login and register pages.
10. Deploy backend to ECS Fargate (initial task definition, ALB, security groups). Deploy frontend to Vercel.
11. Set up CI: GitHub Actions for lint, type-check, test on PR.

### 9.2 Phase 2: Core CRUD + Pipeline (Week 2–3)

**Goal:** A user can create, view, edit, and delete applications from the web dashboard.

1. Build application CRUD endpoints: POST, GET (list with pagination and filters), GET (single), PATCH, DELETE.
2. Implement duplicate guard logic (compound unique index + explicit check on create).
3. Implement stage management: default stage initialization from user profile, per-application stage add/remove endpoints, stage transition with history append.
4. Build stats endpoint: aggregation pipeline for total, active, response rate, avg days.
5. Build Dashboard page: StatsBar component, ApplicationList (with `react-window` for virtualization), FilterBar.
6. Build DetailPanel: slide-in panel with all fields, notes editor, stage selector, stage history timeline.
7. Build ManualAddForm: modal form for creating applications without the extension.
8. Implement 14-day nudge: query `updated_at < now - 14 days`, render amber dot in ApplicationList.
9. Implement sort and filter persistence: URL query params + sessionStorage.

### 9.3 Phase 3: Chrome Extension (Week 3–4)

**Goal:** User can install the extension, browse a supported job board, and save an application in one click.

1. Scaffold extension: `manifest.json` (MV3), content script entry, service worker entry, popup HTML/JS.
2. Build content script: URL-pattern matching, DOM detection logic, per-board selector modules (LinkedIn, Greenhouse, Lever, Ashby).
3. Build banner UI: inject shadow DOM element, style isolation, auto-dismiss timer, save/error/duplicate states.
4. Build service worker: message listener for content script, API call to `POST /api/applications`, token management (`chrome.storage.session`).
5. Build extension auth flow: `GET /api/auth/extension-token` endpoint, token storage, auto-refresh.
6. Build OpenAI fallback path: Workday content script sends page text to service worker, service worker sends to backend, backend calls GPT-4o mini, response merged.
7. Build popup: last 5 saves (from `chrome.storage.local` cache, refreshed from API), link to dashboard, login status.
8. Package and test on Chrome Web Store (unlisted initially).

### 9.4 Phase 4: Calendar (Week 4–5)

**Goal:** Users can add, view, and manage interview events linked to their applications.

1. Build calendar CRUD endpoints: POST, GET (list with date range), PATCH, DELETE.
2. Build CalendarGrid component: monthly grid layout, event chips, day click to create, event click to open DetailPanel.
3. Integrate calendar events into DetailPanel: event list section, "Add Event" form inline.
4. Build NewEventForm: application selector (dropdown with search), event type selector, date picker, time picker, notes.
5. Wire 14-day nudge badge to also appear in the calendar (amber dot on the application's events).

### 9.5 Phase 5: Job Board (Week 5–6)

**Goal:** Curated listings are ingested, displayed, and filterable. Apply flow works with the extension.

1. Build GitHub polling scheduler: APScheduler job, GitHub API client (with rate limit handling), README/JSON parser for each repo format.
2. Build ingestion pipeline: normalize fields, compute `url_hash`, upsert to MongoDB, mark stale listings.
3. Build `GET /api/jobs` endpoint with all 7 filters + pagination.
4. Build JobBoard page: card grid view (JobCard) and compact list view (JobRow), toggle with localStorage persistence.
5. Build filter sidebar: role type, experience level, company type, remote status, date posted, salary range, hide already applied.
6. Implement "Apply" button: opens `apply_url` in new tab (`window.open`). Extension fires naturally.
7. Implement stale listing UI: dimmed card/row with "may be closed" label for `is_stale=true`.

### 9.6 Phase 6: Landing Page + Polish + Launch (Week 6–8)

**Goal:** Product is polished, landing page is live, extension is published, and the system is production-ready.

- Build landing page: hero section, product screenshot/demo GIF, feature highlights, login/signup CTAs, extension install CTA (Chrome Web Store link).
- Responsive polish pass: test all pages at desktop/tablet/mobile breakpoints. Fix layout issues.
- Performance optimization: bundle analysis, code splitting (`React.lazy`), image optimization, API response caching headers.
- Error handling sweep: ensure all API errors surface user-friendly messages. Add error boundary components.
- Accessibility audit: keyboard navigation, screen reader testing, color contrast checks.
- Security hardening: rate limiting tuning, input sanitization audit, CORS lockdown to production domains.
- Publish extension to Chrome Web Store (listed). Submit for review.
- Production deployment: final ECS task definition tuning (CPU/memory), MongoDB Atlas scaling review, Vercel production domain configuration.
- Monitoring setup: CloudWatch dashboards, application-level logging, error tracking (Sentry).

---

## 10. Source Files

Below is the complete file tree for the v1 codebase with annotations explaining each file's purpose. An implementing agent should create these files and only these files.

### 10.1 Backend (`/backend`)

| Path | Purpose |
|------|---------|
| `main.py` | FastAPI app factory. Mounts routers, configures CORS, lifespan events (DB connect/disconnect, scheduler start/stop). |
| `config.py` | Settings management via Pydantic BaseSettings. Reads from env vars: MONGO_URI, JWT_SECRET, OPENAI_API_KEY, GOOGLE_CLIENT_ID, GITHUB_TOKEN, etc. |
| `database.py` | Motor async client initialization, connection pool config, collection references. |
| `auth/router.py` | Auth route handlers: register, login, google, refresh, logout, me, extension-token. |
| `auth/service.py` | Auth business logic: password hashing, JWT encode/decode, Google token verification, user creation. |
| `auth/dependencies.py` | FastAPI dependencies: `get_current_user` (JWT validation from cookie), `require_auth`. |
| `auth/schemas.py` | Pydantic models for auth request/response: RegisterRequest, LoginRequest, UserResponse, TokenPayload. |
| `applications/router.py` | Application route handlers: list, create, get, update, delete, stats, add-stage, remove-stage. |
| `applications/service.py` | Application business logic: CRUD, duplicate guard, stage transition, stats aggregation, OpenAI fallback trigger. |
| `applications/schemas.py` | Pydantic models: ApplicationCreate, ApplicationUpdate, ApplicationResponse, ApplicationListQuery, StatsResponse. |
| `calendar/router.py` | Calendar event route handlers: list, create, update, delete. |
| `calendar/service.py` | Calendar event business logic: CRUD with application linkage, date range queries. |
| `calendar/schemas.py` | Pydantic models: EventCreate, EventUpdate, EventResponse. |
| `jobs/router.py` | Job listing route handlers: list, get. |
| `jobs/service.py` | Job listing business logic: filtered queries, stale flagging. |
| `jobs/schemas.py` | Pydantic models: JobListingResponse, JobListQuery. |
| `jobs/sync.py` | GitHub polling scheduler: APScheduler config, GitHub API client, README/JSON parsers, ingestion logic, deduplication. |
| `parsing/openai_client.py` | OpenAI GPT-4o mini integration: prompt construction, API call, response validation, 6-field JSON extraction. |
| `middleware/rate_limit.py` | slowapi rate limiter configuration: per-user limits for standard, AI, and auth endpoints. |
| `Dockerfile` | Multi-stage build: python:3.12-slim, pip install, uvicorn entrypoint. Non-root user. |
| `docker-compose.yml` | Local dev: FastAPI + MongoDB 7 containers. Volume mounts for hot reload. |
| `requirements.txt` | Python dependencies: fastapi, uvicorn, motor, pydantic, pyjwt, bcrypt, httpx, openai, apscheduler, slowapi. |
| `tests/` | Pytest tests organized by module: test_auth.py, test_applications.py, test_calendar.py, test_jobs.py, test_parsing.py. |

### 10.2 Frontend (`/frontend`)

| Path | Purpose |
|------|---------|
| `src/main.jsx` | App entry. React root, QueryClientProvider, AuthProvider, BrowserRouter. |
| `src/App.jsx` | Route definitions. Protected route wrapper. Layout shell (nav + content area). |
| `src/api/client.js` | Axios instance configured with base URL, `credentials: true` (for cookies), response interceptor for 401 → refresh flow. |
| `src/api/applications.js` | API functions: fetchApplications, createApplication, updateApplication, deleteApplication, fetchStats. |
| `src/api/calendar.js` | API functions: fetchEvents, createEvent, updateEvent, deleteEvent. |
| `src/api/jobs.js` | API functions: fetchListings. |
| `src/api/auth.js` | API functions: register, login, googleAuth, refreshToken, logout, getMe. |
| `src/context/AuthContext.jsx` | Auth context provider: user state, login/logout actions, token refresh logic. |
| `src/pages/LandingPage.jsx` | Marketing landing page for logged-out users. |
| `src/pages/Dashboard.jsx` | Pipeline view: StatsBar, FilterBar, ApplicationList composition. |
| `src/pages/Calendar.jsx` | Calendar page: CalendarGrid, event management. |
| `src/pages/JobBoard.jsx` | Job board page: view toggle, filter sidebar, listing grid/list. |
| `src/pages/Login.jsx` | Login page with Google OAuth and email/password form. |
| `src/pages/Register.jsx` | Registration page. |
| `src/components/StatsBar.jsx` | Four-metric stat cards. |
| `src/components/ApplicationList.jsx` | Virtualized application list with react-window. |
| `src/components/FilterBar.jsx` | Multi-select filter dropdowns + date range. |
| `src/components/DetailPanel.jsx` | Slide-in panel: fields, notes, stages, history, events. |
| `src/components/ManualAddForm.jsx` | Modal form for manual application creation. |
| `src/components/CalendarGrid.jsx` | Monthly calendar grid with event chips. |
| `src/components/JobCard.jsx` | Card view for a single job listing. |
| `src/components/JobRow.jsx` | Compact row view for a single job listing. |
| `src/components/NewEventForm.jsx` | Event creation form with application linker. |
| `src/hooks/useApplications.js` | React Query hooks for application data. |
| `src/hooks/useCalendar.js` | React Query hooks for calendar data. |
| `src/hooks/useJobs.js` | React Query hooks for job listing data. |
| `tailwind.config.js` | Tailwind configuration: custom colors (pipeline stage colors), breakpoints, fonts. |
| `vite.config.js` | Vite config: proxy for local dev, build optimizations, code splitting. |

### 10.3 Extension (`/extension`)

| Path | Purpose |
|------|---------|
| `manifest.json` | MV3 manifest: permissions, content script URL matches, service worker registration. |
| `content/content.js` | Content script: page detection, DOM scraping (per-board modules), banner injection, message passing. |
| `content/content.css` | Banner styles (injected into shadow DOM). |
| `content/boards/linkedin.js` | LinkedIn-specific DOM selectors and extraction logic. |
| `content/boards/greenhouse.js` | Greenhouse-specific selectors. |
| `content/boards/lever.js` | Lever-specific selectors. |
| `content/boards/ashby.js` | Ashby-specific selectors. |
| `content/boards/workday.js` | Workday handler: extracts page text for OpenAI fallback. |
| `background/background.js` | Service worker: API calls, token management, message router. |
| `popup/popup.html` | Popup HTML structure. |
| `popup/popup.js` | Popup logic: fetch last 5 saves, render list, link to dashboard. |
| `popup/popup.css` | Popup styles. |

---

## 11. Testing Strategy

### 11.1 Backend Unit Tests

All backend tests use pytest with pytest-asyncio. MongoDB interactions are tested against a dedicated test database (mongomock or a real Atlas test cluster). API tests use FastAPI's TestClient (httpx-based).

| Module | Test Cases | Mock Strategy |
|--------|-----------|---------------|
| Auth | Registration with valid/invalid data; duplicate email; login with correct/incorrect password; Google OAuth with valid/invalid token; JWT generation/validation/expiry; refresh token rotation; logout clears cookies. | Mock Google token verification (httpx mock). Real MongoDB test instance. |
| Applications | Create with all fields; create with missing optional fields; duplicate guard triggers 409; list with all filter combinations; sort ascending/descending; pagination (cursor-based); update single field; update stage triggers history append; delete cascades to calendar events; stats aggregation correctness. | Real MongoDB test instance. Mock OpenAI client for fallback tests. |
| Calendar | Create event linked to application; create with invalid application_id returns 404; list by date range; update event type; delete event. | Real MongoDB test instance. |
| Jobs | List with all filter combinations; pagination; stale flag filtering; hide_applied filter (requires auth + application existence). | Real MongoDB test instance. |
| Parsing | OpenAI fallback returns valid 6-field JSON; handles API timeout; handles malformed response; handles null fields; token count stays under budget. | Mock OpenAI API response (httpx mock). |
| Sync | GitHub API response parsing; README table extraction; JSON array extraction; URL hash deduplication; stale flagging on age threshold; handles GitHub rate limiting gracefully. | Mock GitHub API (httpx mock). Real MongoDB test instance. |

### 11.2 Frontend Tests

Frontend tests use Vitest + React Testing Library. API calls are mocked via MSW (Mock Service Worker).

| Component | Test Cases |
|-----------|-----------|
| AuthContext | Login sets user state; logout clears state; expired token triggers refresh; failed refresh redirects to login. |
| ApplicationList | Renders applications from API; sorts on column header click; shows amber dot for stale applications; click opens DetailPanel. |
| FilterBar | Selecting filters updates URL params; clearing filters resets list; multiple filters combine with AND logic. |
| DetailPanel | Displays all fields; editing a field and saving calls PATCH; stage change appends to history; close on Escape key. |
| CalendarGrid | Renders current month; events appear on correct dates; click event opens DetailPanel; click empty day opens NewEventForm; month navigation works. |
| JobBoard | Card/list toggle works and persists; filters update listing display; Apply button opens URL in new tab; stale listings are visually dimmed. |
| StatsBar | Renders four metrics; values update after application mutation. |

### 11.3 Extension Tests

Extension tests use Jest with jsdom for content script logic and Chrome extension mocks (jest-chrome) for service worker tests.

| Component | Test Cases |
|-----------|-----------|
| Content Script (detection) | Correctly identifies job pages on each supported board; does not fire on non-job pages; does not fire on unsupported domains. |
| Content Script (extraction) | Extracts all 6 fields from a known-good LinkedIn page snapshot; extracts from Greenhouse/Lever/Ashby snapshots; returns partial data when fields are missing. |
| Banner | Appears after detection; auto-dismisses after 8 seconds; shows checkmark on save success; shows error on save failure; shows duplicate warning. |
| Service Worker | Sends correct payload to API; stores and refreshes token; handles API errors; routes messages correctly between content and popup. |
| Popup | Displays last 5 saves; shows login prompt if unauthenticated; link to dashboard opens correct URL. |

### 11.4 Integration Tests

End-to-end flows tested with Playwright against a staging environment (real backend, test MongoDB database).

- Full registration flow: sign up with email, land on dashboard, create first application manually, see it in the list.
- Full extension flow: install extension, navigate to a test LinkedIn job page (using a cached/mocked page), click banner, verify application appears in dashboard.
- Full job board flow: browse listings, click Apply, verify new tab opens with correct URL.
- Full calendar flow: create application, add calendar event from detail panel, verify event appears on calendar grid.
- Auth persistence: login, close browser, reopen, verify session is maintained via refresh token.
- Cross-component: create application via extension, edit in detail panel, add calendar event, verify all three views (list, detail, calendar) are consistent.

### 11.5 Coverage Expectations

| Layer | Target | Rationale |
|-------|--------|-----------|
| Backend API handlers | 90%+ | These are the core business logic. High coverage prevents regressions. |
| Backend services/utils | 85%+ | Business logic and parsing code must be well tested. |
| Frontend components | 75%+ | Component rendering and key interactions. Lower threshold because visual regressions are better caught by eye. |
| Extension content scripts | 80%+ | DOM extraction logic is fragile and must be tested against page snapshots. |
| Integration (E2E) | Critical paths only | 5–6 flows covering the core user journeys. Not exhaustive. |

---

## 12. Edge Cases

These are specific scenarios that implementing agents must handle explicitly. Each should have a corresponding test case.

| ID | Scenario | Expected Behavior |
|----|----------|-------------------|
| EC-01 | User applies to the same role at the same company twice (e.g. re-application after rejection). | Duplicate guard fires. Banner shows warning with link to existing application. User can override and create a new application (force-save flag). |
| EC-02 | Extension fires on a LinkedIn search results page (not a specific job posting). | Content script's detection logic identifies this as a non-job page (no specific role title in expected DOM location). Banner does not appear. |
| EC-03 | OpenAI fallback times out (>5 second response). | Backend sets a 5-second timeout on the OpenAI call (httpx timeout). On timeout, application is saved with whatever the content script extracted. Error is logged. No user-facing error. |
| EC-04 | OpenAI returns malformed JSON. | Backend wraps JSON parse in try/except. On failure, application is saved with content script data only. Malformed response is logged for debugging. |
| EC-05 | User has 500+ applications. | ApplicationList uses react-window for virtualization (only renders visible rows). API uses cursor-based pagination (50 per page). No performance degradation. |
| EC-06 | GitHub repo changes README format. | Parser attempts multiple extraction strategies (table markdown, JSON, CSV). If all fail, logs the error and skips that repo for this sync cycle. Previously ingested listings remain unaffected. |
| EC-07 | User deletes an application that has linked calendar events. | `DELETE /api/applications/:id` cascades: deletes all calendar_events where application_id matches. This is handled in a single MongoDB transaction (multi-document, same session). |
| EC-08 | Extension is installed but user is not logged in. | Service worker detects missing token. Banner still appears but clicking it shows "Sign in to save" with a link to the login page. Application data is not lost — stored temporarily in `chrome.storage.local` and synced after login. |
| EC-09 | Multiple browser tabs have the extension active on different job pages. | Each tab's content script operates independently. Service worker serializes API calls (queue with 1 concurrency) to prevent race conditions on duplicate guard checks. |
| EC-10 | User's custom stage is longer than 50 characters. | Backend validates stage names: max 50 chars, alphanumeric + spaces + hyphens only. Returns 422 with descriptive error. |
| EC-11 | MongoDB Atlas is temporarily unreachable. | Motor client has retry logic (exponential backoff, 3 retries). If all retries fail, API returns 503 Service Unavailable. Frontend shows a retry-able error message. |
| EC-12 | User applies from the job board, then the extension fires, creating a potential double save. | The extension checks against the user's existing applications (duplicate guard) before saving. The 409 Conflict response triggers the "Already tracked" banner. |

---

## 13. Security Considerations

### 13.1 Authentication & Authorization

- All mutating endpoints require a valid JWT access token (15-min TTL) delivered via httpOnly, Secure, SameSite=Lax cookie.
- Refresh tokens (7-day TTL) are single-use: each refresh issues a new refresh token and invalidates the old one (rotation).
- Passwords are hashed with bcrypt, work factor 12. Plaintext passwords never leave the `auth/service.py` module.
- All application and calendar queries are scoped to `user_id` from the JWT. No user can access another user's data.
- The extension-token endpoint issues a short-lived token (5-minute TTL) that the extension stores in `chrome.storage.session` (cleared when Chrome closes).
- Rate limiting on auth endpoints: 5 requests/minute per IP to prevent brute force.

### 13.2 Input Validation

- All API inputs are validated by Pydantic models with strict types and length constraints.
- The notes field accepts markdown but is sanitized on render (frontend uses a sanitizing markdown renderer like DOMPurify + marked).
- URL fields (`source_url`, `apply_url`) are validated with Pydantic's `AnyHttpUrl` type.
- The OpenAI fallback sends only page `innerText` (no HTML) to prevent prompt injection via page markup. System prompt is hardcoded, not user-modifiable.

### 13.3 Infrastructure

- MongoDB Atlas: IP allowlist restricted to ECS Fargate's NAT Gateway IP. TLS enforced. Authentication required.
- ECS Fargate: runs in a private subnet. Only the ALB (in a public subnet) accepts inbound traffic. Container runs as non-root user.
- Environment variables (`JWT_SECRET`, `OPENAI_API_KEY`, `MONGO_URI`) stored in AWS Secrets Manager, injected into the container at runtime via ECS task definition secrets.
- CORS: production config allows only the Vercel frontend domain and the Chrome extension's origin.
- HTTPS enforced on all endpoints via ALB certificate (ACM).

---

## 14. Observability & Monitoring

### 14.1 Logging

All logs are structured JSON, emitted to stdout, and collected by CloudWatch Container Insights.

| Level | Usage | Examples |
|-------|-------|---------|
| ERROR | Unrecoverable failures that need immediate attention. | MongoDB connection failure; OpenAI API 500; unhandled exceptions. |
| WARN | Recoverable issues that may indicate degradation. | OpenAI timeout (fallback to partial data); GitHub API rate limit hit; slow query (>500ms). |
| INFO | Normal operations for audit and debugging. | Application created; user login; extension token issued; job sync completed (N new, M skipped). |
| DEBUG | Verbose detail for local development. | DOM selector matched; OpenAI prompt/response; query parameters. |

### 14.2 Metrics & Alerts

| Metric | Collection | Alert Threshold |
|--------|-----------|----------------|
| API response time (p50, p95, p99) | FastAPI middleware → CloudWatch | p95 > 500ms for 5 minutes |
| API error rate (5xx) | CloudWatch ALB metrics | > 1% of requests for 3 minutes |
| MongoDB operation latency | Atlas monitoring | p95 > 200ms for 5 minutes |
| OpenAI fallback call rate | Application-level counter → CloudWatch | > 50 calls/hour (unexpected spike) |
| OpenAI fallback error rate | Application-level counter → CloudWatch | > 10% failure rate |
| Job sync health | APScheduler log → CloudWatch | Sync hasn't run in 25 hours |
| ECS task health | CloudWatch ECS metrics | Running task count < 1 for 2 minutes |
| Active user count (DAU) | Application-level counter → CloudWatch | Informational only, no alert |

---

## 15. Performance & Scalability

### 15.1 Performance Targets

| Operation | Target Latency | Strategy |
|-----------|---------------|----------|
| Extension silent save (end-to-end) | < 800ms | Single POST, MongoDB insert. No AI call for supported boards. |
| Extension save with AI fallback | < 2.5s | 800ms base + ~1.5s for OpenAI round trip. GPT-4o mini is fast. |
| Dashboard initial load | < 1.5s | Code-split bundle. First 50 applications loaded. React Query caches. |
| Application list scroll (virtualized) | 60 FPS | react-window renders only visible rows. No DOM thrashing. |
| Calendar month load | < 500ms | Single query: events where date is in range. Indexed. |
| Job board page | < 800ms | 30 listings per page. Indexed filters. Offset pagination. |
| Stats bar computation | < 300ms | MongoDB aggregation pipeline. Indexed on user_id + date_applied. |

### 15.2 Scalability Plan

**10K concurrent users (v1 target):** Single ECS task (1 vCPU, 2GB RAM) running FastAPI with 4 uvicorn workers. MongoDB Atlas M10 (2GB RAM, 10GB storage). This handles ~200 requests/second with headroom.

**50K concurrent users (growth phase):** ECS auto-scaling with 2–4 tasks (triggered by CPU > 70%). MongoDB Atlas M30 (8GB RAM). Add Redis (ElastiCache) for session caching and rate limiter state.

**200K+ users (scale phase):** MongoDB Atlas M50+ with read replicas. CloudFront CDN in front of the ALB for static API responses (job listings). Consider separating the job sync scheduler into its own ECS service to isolate its workload. At this scale, evaluate a move from APScheduler to AWS Step Functions or EventBridge Scheduler.

---

## 16. Out of Scope

The following are explicitly NOT part of v1. Implementing agents must not build these features, design for them prematurely, or make architectural choices that optimize for them at the expense of v1 simplicity.

| Feature | Reason |
|---------|--------|
| Resume builder / auto-fill | Different product surface. Would add S3 dependency, PDF rendering, and form automation complexity. |
| Job recommendations (ML-based) | Requires a recommendation engine, user behavior tracking, and sufficient data volume. Premature. |
| Mobile app (iOS/Android) | The web app is responsive. A native app adds two deployment targets and a shared backend contract. Evaluate post-v1 based on user demand. |
| LinkedIn scraping (profile data) | Legal gray area (LinkedIn ToS). Extension only reads job posting pages, never user profiles. |
| Push notifications (browser/mobile) | Adds notification permission flow, service worker push subscription, and a notification service. In-app nudges suffice for v1. |
| Email notifications (SES) | No email infrastructure in v1. All nudges are in-app only. Email digest is a v2 feature. |
| Offline extension queue | If the user is offline when they click save, the extension does not queue the save for later. It shows an error. Offline support is v2. |
| S3 file storage | No resume uploads, no PDF exports in v1. Everything lives in MongoDB. |
| Google Calendar sync | Adds OAuth scope complexity and a bidirectional sync engine. v2 feature. |
| Weekly/daily view for calendar | Monthly view only in v1. Weekly view is a v2 toggle. |
| Analytics dashboard (funnel, heatmap) | Data is being collected (stage_history, timestamps). Analytics visualization is v2. |
| Team/shared pipelines | Single-user product in v1. Multi-tenancy adds authorization complexity. |
| Saved filter views | Filters persist per session but are not saved as named views. v2 feature. |

---

## 17. Extensions (v2 Roadmap)

These are planned for post-v1. The v1 architecture should not prevent any of these additions, but should not prematurely build infrastructure for them either. Where v1 design choices affect v2 feasibility, this is noted.

| Feature | v1 Foundation Required | v2 Work |
|---------|----------------------|---------|
| Weekly calendar view | CalendarGrid component must accept a view prop. Event queries must support arbitrary date ranges (already designed). | Add week calculation logic, day-of-week column layout, toggle button in UI. |
| Google Calendar sync | `calendar_events` model stores all necessary event data. Timestamps are UTC. | Add Google Calendar OAuth scope, build bidirectional sync engine, handle conflict resolution. |
| Analytics: funnel chart | `stage_history` on every application is the data source. | Build aggregation pipelines for funnel metrics. Add Recharts visualizations on a new `/analytics` page. |
| Analytics: activity heatmap | `created_at` and `updated_at` on all documents provide the time series. | Aggregate by day, render heatmap grid (Recharts or custom SVG). |
| Weekly digest email (SES) | User email is already stored. All stat queries exist. | Add AWS SES integration, email template rendering, weekly cron job. |
| Saved filter views | Filters are already parameterized and URL-encodable. | Add a `saved_filters` collection, UI for save/load/delete named filters. |
| Offline extension queue | Extension already stores data in `chrome.storage.local`. | Add a queue in `chrome.storage.local`, sync on reconnection, handle conflicts. |
| Deadline auto-detection | `source_url` is stored. Page text could be re-fetched. | Parse deadline dates from job posting text, auto-create calendar events. |
| Offer expiry countdown | `calendar_events` supports `offer_deadline` event type. | Add countdown UI in detail panel and calendar, visual urgency indicators. |

---

## 18. Dependencies

### 18.1 Backend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| fastapi | 0.111+ | Web framework. Async, Pydantic-native, auto-docs. |
| uvicorn[standard] | 0.30+ | ASGI server. Production-grade with uvloop. |
| motor | 3.4+ | Async MongoDB driver for Python. |
| pymongo | 4.7+ | Synchronous MongoDB driver (required by Motor). |
| pydantic | 2.7+ | Data validation and settings management. |
| pydantic-settings | 2.3+ | Environment variable parsing for config. |
| pyjwt[crypto] | 2.8+ | JWT encode/decode with RS256/HS256 support. |
| bcrypt | 4.1+ | Password hashing. |
| httpx | 0.27+ | Async HTTP client for Google OAuth verification and OpenAI. |
| openai | 1.30+ | OpenAI SDK for GPT-4o mini fallback. |
| apscheduler | 3.10+ | In-process scheduler for GitHub job sync. |
| slowapi | 0.1.9+ | Rate limiting middleware for FastAPI. |
| pytest | 8.2+ | Testing framework. |
| pytest-asyncio | 0.23+ | Async test support for pytest. |

### 18.2 Frontend Dependencies

| Package | Version | Purpose |
|---------|---------|---------|
| react | 18.3+ | UI framework. |
| react-dom | 18.3+ | React DOM renderer. |
| react-router-dom | 6.23+ | Client-side routing. |
| @tanstack/react-query | 5.40+ | Server state management (caching, refetching, optimistic updates). |
| axios | 1.7+ | HTTP client with interceptors for auth refresh. |
| tailwindcss | 3.4+ | Utility-first CSS framework. |
| react-window | 1.8+ | Virtualized list rendering for large application counts. |
| recharts | 2.12+ | Charting library for stats bar and future analytics. |
| date-fns | 3.6+ | Lightweight date utilities (calendar computations, formatting). |
| dompurify | 3.1+ | HTML sanitization for notes markdown rendering. |
| marked | 12.0+ | Markdown parser for notes. |
| vitest | 1.6+ | Test runner (Vite-native). |
| @testing-library/react | 16.0+ | Component testing utilities. |
| msw | 2.3+ | Mock Service Worker for API mocking in tests. |
| playwright | 1.44+ | End-to-end browser testing. |

---

## 19. Rollout Strategy

### 19.1 Environments

| Environment | Purpose | Infrastructure |
|-------------|---------|---------------|
| Local | Development and debugging | docker-compose (FastAPI + MongoDB). Vite dev server with API proxy. Extension loaded unpacked. |
| Staging | Integration testing, demo, QA | ECS Fargate (1 task). MongoDB Atlas test cluster (M0 free tier). Vercel preview deployment. Extension unlisted on Chrome Web Store. |
| Production | Live users | ECS Fargate (1–2 tasks, auto-scaling). MongoDB Atlas M10+. Vercel production. Extension published on Chrome Web Store. |

### 19.2 Deployment Pipeline

1. Developer pushes to a feature branch. GitHub Actions runs lint (ruff + eslint), type checks (pyright + tsc), and unit tests (pytest + vitest).
2. PR is opened. Vercel auto-deploys a preview. Backend is not auto-deployed for PRs (staging only).
3. PR is merged to main. GitHub Actions builds the Docker image, pushes to ECR, and updates the ECS staging service.
4. Staging is verified manually (or via Playwright E2E suite). If passing, a GitHub release tag triggers the production deployment.
5. Production deployment: ECS rolling update (min healthy 100%, max 200%). Zero-downtime via ALB health checks. Vercel auto-deploys from main.
6. Post-deployment: monitor CloudWatch dashboards for 30 minutes. Check error rates, response times, and MongoDB Atlas metrics. If anomalies detected, roll back via ECS task definition revision.

### 19.3 Launch Checklist

- All Phase 1–6 tasks complete and verified in staging.
- Extension approved on Chrome Web Store (review takes 1–3 business days).
- MongoDB Atlas production cluster provisioned with indexes, IP allowlist, and backup schedule.
- AWS Secrets Manager populated with production secrets (JWT_SECRET, OPENAI_API_KEY, MONGO_URI, GOOGLE_CLIENT_ID, GITHUB_TOKEN).
- DNS configured: root domain → Vercel, api.domain → ALB.
- HTTPS certificates provisioned via ACM and attached to ALB.
- CloudWatch dashboards and alerts configured per Section 14.
- Sentry project created and DSN injected into frontend and backend.
- Landing page live and tested across browsers (Chrome, Firefox, Safari, Edge).
- README and contributing guide published to the repo.

---

*End of Document*
