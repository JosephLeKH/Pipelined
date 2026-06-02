# PRD-13 — Scout: AI-Forward Redesign

**Status:** Ready
**Depends on:** PRD-00 (design system), PRD-01 (app shell), PRD-04 (pipeline), PRD-05 (today), PRD-09 (AI workflows — components reused, IA superseded)
**Supersedes:** the AI placement / IA portions of PRD-09. PRD-09's component-level designs (Apply Pack, Mock Interview, etc.) still stand; this PRD changes where they live and how they're framed.
**Estimated effort:** 1 large drop (single ship per brainstorm decision)
**Brainstorm session:** 2026-06-01

---

## 0. Why this redesign

Pipelined is an AI-rich product but reads as a tracker with a chat sidebar. The Co-pilot dock has all the visibility; the deeper agentic features (Fit Score, Apply Pack, Mock Interview, Resume Insights, Interview Prep, Thread Summary) live inside the application detail panel grouped under a single "AI" header. Users have to click into an app, scroll past metadata, and scan a vertical stack of long cards to discover them. From a marketing standpoint they're invisible — a new visitor or a screenshot of the dashboard shows none of the depth.

This redesign does two things at once:

1. **Surfaces the work** — the per-application AI features are promoted to first-class status at the top of the detail panel as a labeled card grid. Every tool is visible on first paint; no expand, no scroll.
2. **Wraps the work** — every AI feature is rebranded under a named agent persona, **Scout**, so the product reads as one coherent intelligence layer instead of six scattered features.

The detail-panel restructure is the load-bearing change. The Scout brand makes it sellable.

**Anchor marketing line:** *"Open any application. Scout already did the work."* Every design decision is judged against whether it makes that line honest.

---

## 1. Decisions (locked in brainstorm 2026-06-01)

| Question | Decision |
|---|---|
| Brand metaphor | Named agent persona |
| Agent name | **Scout** |
| IA approach | Layer-everywhere + one dedicated route ("Scout's Activity") |
| Auto-run on app creation | Fit Score only (conservative cost) |
| Marketing tagline | *"Open any application. Scout already did the work."* |
| Shipping cadence | Single drop (one big redesign release) |

---

## 2. Scope

### In scope
- Detail-panel restructure (Scout's Take + Scout's Toolkit grid)
- Pipeline list Scout-signal column
- Sidebar rename pass (Today → "Scout's briefing", Inbox → "Scout's Drafts", Activity → "Scout's Activity")
- Right dock rename (Co-pilot → Scout)
- New top-bar Scout avatar with pulse + status menu
- Today page header reframe ("Scout's briefing for {date}")
- Auto-run Fit Score on application creation
- Onboarding empty-state copy (first Today, first app, day-2 return)
- Marketing landing-page hero + three feature sections that mirror the in-app surfaces

### Out of scope
- New per-tool functionality (Apply Pack content unchanged; Mock Interview content unchanged; etc.) — this is a placement/framing PRD, not a feature PRD
- Auto-running Apply Pack or Interview Prep (cost-deferred; decision is Fit Score only)
- Mobile-only redesigns of the detail panel (responsive will be addressed but mobile-first variants are a separate PRD)
- Scout voice/audio
- Scout taking actions beyond suggest-only (see hard constraints below)

### Hard constraints (preserved from product policy)
- **No auto-send.** Scout drafts; user copies and sends.
- **No auto-apply.** Scout's Drafts (formerly Pending Inbox) creates "To Apply" pipeline entries only.
- **No PDF/resume edit.** Resume Insights stays suggest-only.
- Every backend query on `applications` / `calendar_events` / `pending_opportunities` filters by `user_id`.
- 300-line file limit, 40-line function limit.
- No barrel re-exports.

---

## 3. Scout — the persona

### Voice & tone
- **Casual, terse, owns its recommendations.** "Scout suggests…" not "It might be worth considering…"
- **First-person product voice** when Scout addresses the user: *"I scored this 78. Strong infra signal, weak frontend."*
- **Third-person UI labels** when system describes Scout: *"Scout scored this role."*
- **Never apologizes for being AI.** No "as an AI model" disclaimers. No "I'm not perfect, but…" hedging.
- **Honest about scope.** When asked something out of bounds: *"That's outside what I do — I can't send the email for you, but here's a draft."*

### Visual identity
- **Avatar:** simple geometric mark, not a face. A compass-needle glyph or a stylized "S" inside a circle. Brand color `#8C1515` (Stanford Cardinal red, the brand's primary). Avatar size 20px in top bar, 16px inline in cards, 32px in chat header.
- **Pulse state:** when Scout has new output to show (autopilot match, fresh fit score, ghost detection, morning brief ready), the avatar's outer ring pulses at ~1Hz. Respects `prefers-reduced-motion`.
- **Active state:** when Scout is mid-generation, ring shows a subtle progress sweep.

### Tagline & marketing voice
- **Primary tagline:** *"Open any application. Scout already did the work."*
- **Supporting lines used across landing/marketing:**
  - *"Scout finds. Scout drafts. You apply."*
  - *"Wake up to Scout's briefing."*
  - *"Every application, scored and packed before you click."*

---

## 4. Application detail panel (the centerpiece)

### Problem
Current `DetailPanelBody` order (verified in `frontend/src/components/DetailPanelBody.jsx`):

1. Stage selector
2. Metadata row (applied, updated, source)
3. Job posting link
4. Location / Remote / Compensation / Company Type (2-col)
5. Notes
6. `<AiPanelGroup>` (defaultOpen=true, but still a single "AI ▾" wrapper):
   - AiFitSection
   - ResumeInsightsSection
   - ApplyPackSection
   - InterviewPrepAgent
   - FollowUpDraftSection
   - ThreadSummarySection
7. Tags / Follow-up date / Offer / Prep checklist / Agent activity / Timeline / Contacts

Even with `defaultOpen=true`, the AI section reads as one wrapped accordion of long vertical cards. New users see "AI ▾" with a sparkles icon and don't know there are six distinct tools inside until they scroll the whole list. Tools that haven't been run show no visible affordance at all.

### New structure
```
┌─ DETAIL PANEL ──────────────────────────────────────────────────┐
│ HEADER                                                           │
│  Stripe · SWE Intern · Onsite scheduled · Fit 78                │
├──────────────────────────────────────────────────────────────────┤
│ SCOUT'S TAKE                              [Scout avatar] ●●● new │
│  78/100 — "Strong infra match, weak frontend signal."           │
│  Next step: send follow-up (recruiter quiet 4 days)              │
│  [Draft follow-up]   [Ask Scout about this role →]               │
├──────────────────────────────────────────────────────────────────┤
│ SCOUT'S TOOLKIT                                                  │
│                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Apply Pack   │ │ Mock         │ │ Resume       │             │
│  │ ✓ Ready      │ │ Interview    │ │ Insights     │             │
│  │ Cover + 3    │ │ Run it       │ │ 3 tips →     │             │
│  │ talking pts  │ │ 5 qs · 12min │ │              │             │
│  │ [View →]     │ │ [Start →]    │ │ [View →]     │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐             │
│  │ Email Recap  │ │ Interview    │ │ Follow-up    │             │
│  │ 4 threads    │ │ Prep         │ │ Draft        │             │
│  │ summarized → │ │ Company +    │ │ Run it       │             │
│  │              │ │ process →    │ │ when ready   │             │
│  │ [View →]     │ │ [View →]     │ │ [Draft →]    │             │
│  └──────────────┘ └──────────────┘ └──────────────┘             │
├──────────────────────────────────────────────────────────────────┤
│ NOTES                                                            │
│ TIMELINE                                                         │
│ TAGS / FOLLOW-UP DATE                                            │
│ METADATA (Location, Remote, Comp, Company Type, Applied, Source) │
│ PREP CHECKLIST · CONTACTS · OFFER (when Offer stage)             │
└──────────────────────────────────────────────────────────────────┘
```

### Scout's Take (top banner)
- **Always-rendered** even when empty. Pre-content state: skeleton with "Scout is scoring this role…" copy. This is critical — it advertises that Scout is at work.
- **Filled state shows:**
  - Score (large numeric, `78/100` style, color-coded against brand-50/100/600 scale)
  - One-sentence rationale (~80–120 chars), generated from existing fit-score reasoning
  - One suggested next action (computed: overdue follow-up beats stale-app beats default "draft pack")
  - Two CTAs: primary action button + "Ask Scout about this role" (opens dock chat preloaded with app context)
- **Error/refused state:** "Scout couldn't score this — missing resume" with `[Upload resume]` link, OR "Score unavailable for this stage" (e.g., post-Rejected apps).
- **Component:** `<ScoutTake application={app} onAskScout={openDockWithContext} />` in `frontend/src/components/scout/ScoutTake.jsx`.

### Scout's Toolkit (card grid)
- **3-column responsive grid** at default panel widths; 2-column under ~640px; 1-column on mobile.
- **Six cards always rendered, in fixed order:**
  1. Apply Pack
  2. Mock Interview
  3. Resume Insights
  4. Email Recap (Thread Summary)
  5. Interview Prep
  6. Follow-up Draft
- **Three card states:**

  | State | Visual | Copy pattern |
  |---|---|---|
  | **Ready** | filled background, check glyph, subtle border | `✓ Ready · {summary} · [View →]` |
  | **Run it** | outlined, ghost background, play glyph | `Run it · {description} · [Start →]` |
  | **Working** | shimmer/skeleton, spinner glyph | `Generating… · ~{seconds}s` |

- **Error state per card:** small inline error with retry, never blocks adjacent cards.
- **Click behavior:** opens the existing per-tool modal/expanded view from PRD-09 — this PRD does not change the tool internals.
- **Tooltip on hover:** explains what the tool does, even on Ready cards (helps new users learn what each tool is *for*).
- **Component:** `<ScoutToolkit application={app} />` in `frontend/src/components/scout/ScoutToolkit.jsx`, composing six `<ScoutToolCard variant=... />` children.

### Demoted: metadata, timeline, notes
- **Notes** stays mid-panel (between Toolkit and Timeline) — still important, but no longer above the AI fold.
- **Timeline** keeps its position right after Notes.
- **Tags + Follow-up date** stay where useful (mid-panel).
- **Metadata grid** (Location / Remote / Compensation / Company Type / Applied / Source) sinks to the bottom of the panel. These are reference values consulted on demand, not the first thing users need.

### Empty states & loading
- **Brand-new app (just created via extension or manual):** Scout's Take shows skeleton + "Scout is scoring this…" within 200ms of panel open. All six Toolkit cards start in "Run it" state — only Fit Score auto-runs this release, and Fit Score lives in Scout's Take, not the Toolkit.
- **Auto-run completes:** Scout's Take fills in via React Query refetch (score + rationale + next-step appear). Toast: *"Scout scored this 78/100."* (single toast, debounced — no spam).
- **App with all tools used:** all six cards show "Ready" with last-generated timestamp on hover.

### Components to retire / refactor
- **Retire:** `AiPanelGroup.jsx` (single collapsible wrapper) — no longer needed.
- **Refactor:** `DetailPanelBody.jsx` to render `<ScoutTake>` + `<ScoutToolkit>` near the top, demote metadata grid to bottom. New file count: existing 300-line limit respected by extracting Toolkit/Take to new files.
- **Reuse:** all six per-tool components (`AiFitSection`, `ApplyPackSection`, `ResumeInsightsSection`, `InterviewPrepAgent`, `FollowUpDraftSection`, `ThreadSummarySection`) — their internals remain unchanged. They're invoked by Toolkit cards on click.

---

## 5. Pipeline list — Scout signals column

Add a single "Scout" column between **Score** and **Updated** in the application list (`ApplicationRow`).

### Five signal types (in priority order — first match wins per row)

| Priority | Icon | Label / tooltip | Trigger |
|---|---|---|---|
| 1 | 🔥 | Reply needed ({N}d) | Follow-up overdue OR email-events show inbound thread with no reply >2 days |
| 2 | 👻 | Ghost risk ({N}d) | Ghost detection flagged (no movement >10 days, not in terminal stage) |
| 3 | ✨ | Scout found this | Source = `autopilot` or `watchlist` AND user hasn't opened it yet |
| 4 | 🎯 | High fit ({score}) | Fit score ≥ 85 AND user hasn't opened the panel yet |
| 5 | ✓ | Tools ready | Apply Pack or Interview Prep cached AND not viewed |

- Only one icon per row. Resolver picks highest-priority match.
- Empty when no signal applies.
- **Click on icon:** opens detail panel scrolled to the relevant section (e.g., 🔥 → Scout's Take with Draft follow-up CTA focused).
- **Visual:** icon with `text-text-2` color; `tabular-nums` for any inline number. Hover surfaces a `<Tooltip>` with full label.

### Logic location
- Pure function `computeScoutSignal(application, emailEvents)` in `frontend/src/lib/scoutSignals.js`. Returns `{ type, label, tooltip, action } | null`. Tested with full coverage in `scoutSignals.test.js`.
- Consumed by `ApplicationRow` via a memoized hook `useScoutSignal(application)`.

---

## 6. Information architecture

### Sidebar (top to bottom)

| Slot | Old label | New label | Route |
|---|---|---|---|
| 1 | Today | **Today** *(header inside reframes to "Scout's briefing")* | `/today` |
| 2 | Pipeline | Pipeline | `/applications` |
| 3 | Calendar | Calendar | `/calendar` |
| 4 | Inbox | **Scout's Drafts** | `/inbox/pending` |
| 5 | Activity | **Scout's Activity** | `/activity` |
| — | Settings | Settings (bottom anchor) | `/settings` |

Route paths unchanged — labels only. No new routes are added.

### Top bar — Scout avatar (new)
- **Position:** right side of TopBar, left of user menu, right of search.
- **Visual:** 24px circle with Scout glyph. Always present on authenticated pages.
- **States:**
  - **Idle** — static, ghost background
  - **Has news** — outer ring pulses (Scout has unseen output: morning brief ready, autopilot match, ghost flag, fresh fit)
  - **Working** — subtle progress sweep around ring (Scout is actively generating)
- **Click behavior:** opens the right dock (Scout chat) if closed, OR jumps to the most recent unseen Scout output if pulsing.
- **Right-click / `⋯` menu:**
  - *Ask Scout…* (opens dock)
  - *What's Scout doing?* (opens Scout's Activity)
  - *Mute Scout pulses for 1 hour*

### Right dock — Scout chat (renamed)
- **Rename:** "Co-pilot" → "Scout" in all UI strings, hotkey help, command palette, settings labels.
- **Hotkey unchanged:** `o` still toggles the dock (memorable; users already trained).
- **Header label:** "Scout" with avatar. Subtitle: "Grounded in your pipeline."
- **Behavior unchanged:** SSE chat, suggest-only, no `send_email`-style actions.
- **Empty state copy** (first time opening): *"Hey Joseph, I'm Scout. Ask me anything about your applications — I can see your pipeline, your emails, and the roles I've scored for you."*

### Naming rename map (complete)

| Surface | Old | New |
|---|---|---|
| Sidebar item | Inbox | Scout's Drafts |
| Sidebar item | Activity | Scout's Activity |
| Today page H1 | "Today" / "Good morning" | "Scout's briefing for {date}" |
| Today missions caption | "Today's missions" | "Scout ranked these for you" |
| Right dock header | Co-pilot | Scout |
| Hotkey help label | "Open Co-pilot" | "Open Scout" |
| Command palette | "Open Co-pilot" | "Open Scout" |
| Settings section | "Co-pilot" / "AI" | "Scout" |
| Detail panel section | "AI ▾" | (removed; replaced by Scout's Take + Scout's Toolkit) |
| Detail panel banner | (none) | "Scout's Take" |
| Detail panel grid | (none) | "Scout's Toolkit" |
| Pipeline column | (none) | "Scout" |
| Toast on Scout action | "AI updated …" | "Scout {scored/drafted/found} …" |

---

## 7. Today → Scout's Briefing

Today page (`/today`) keeps its structure but its language and visual emphasis shift to Scout-as-narrator.

- **Page H1:** `Scout's briefing for {Month D}` — replaces "Today" / generic morning-brief header.
- **Subhead:** `{N} priorities · {M} ghosting risks · {K} new roles I found`
- **Missions list section** reframes from "Today's missions" to "Scout ranked these for you" — same `TodayMissionsList` component, copy only.
- **Morning Brief card** keeps its content but gets a subtle Scout avatar in the upper-left corner and a "by Scout" footer.
- **Empty state** (no missions, no brief generated yet): *"Scout's still scanning. Check back at 8am, or [generate now]."*

No data model changes. Pure presentation.

---

## 8. Pending Inbox → Scout's Drafts

`/inbox/pending` (PendingInboxPage) is rebranded to "Scout's Drafts."

- **Page H1:** "Scout's Drafts"
- **Subhead:** "Roles Scout found and cover letters Scout drafted. Approve to add them to your pipeline."
- **Item card label** changes from generic "Pending opportunity" to "Scout found: {Company} · {Role}"
- **Action button:** "Approve" remains; tooltip becomes "Add to pipeline as 'To Apply' (Scout drafts the cover letter)."
- **Empty state:** "Scout hasn't queued anything yet. Configure Autopilot in [Settings → Scout → Autopilot]."

Behavioral change: none. Suggest-only policy preserved.

---

## 9. Activity → Scout's Activity

`/activity` becomes Scout's receipt log — the marketing-friendly "look at what AI did" surface.

- **Page H1:** "Scout's Activity"
- **Subhead:** "Everything Scout has done for you, newest first."
- **Filter chips** (new): `All` · `Scored` · `Drafted` · `Found` · `Flagged` — filters the existing `AgentActivityFeed` by event type.
- **Marketing role:** this is the page screenshot we put on the landing page. It must look impressive at a glance — dense, time-stamped, varied event types, links into the relevant application.

---

## 10. Auto-run on application creation

Per brainstorm decision: **Fit Score only auto-runs.** Apply Pack, Interview Prep, and other tools stay on-demand.

### Trigger points
Fit Score auto-run fires when an application is *created* through any path:

| Path | Service entrypoint |
|---|---|
| Manual create | `applications.service.create_application()` |
| Chrome extension save | `applications.service.create_application()` (same path) |
| Autopilot approve | `autopilot.service.approve_pending_opportunity()` |
| CSV import | `applications.service_bulk.bulk_create_applications()` |

### Implementation
- **Background task** via FastAPI `BackgroundTasks` (in-process, no new infra). For batch creates (CSV), enqueue per-application tasks but cap concurrency at 5 using an asyncio semaphore to avoid OpenRouter throttling.
- **Function:** `applications.service_ai.auto_score_fit(user_id, application_id)` — wraps existing fit-score generation. Skips if `application.fit_score` already present (e.g., Autopilot pre-scored it).
- **Failure handling:** swallow + log via `structlog`. Do NOT block the create response on the score. The detail panel's Scout's Take handles missing-score gracefully ("Scout couldn't score this — {reason}").
- **Prereqs:** user must have a resume on file. If not, skip silently and Scout's Take shows the "Upload resume" CTA.

### Cost ceiling
- Fit Score uses a short OpenRouter call (~$0.002–0.005 per app at current model pricing).
- Daily user-level quota already exists (`user.ai_scores_remaining_today`). Auto-run consumes from the same quota; if exhausted, skip + log.
- No quota change required for this release.

### Telemetry
- Emit `agent_log` entry: `{ event: "fit_score_auto", actor: "scout", app_id, score, duration_ms }` so it shows in Scout's Activity.

---

## 11. Onboarding & first-run

### First sign-in, zero applications (Today page)
```
"Welcome, {first_name}. I'm Scout."

I'll find roles, score them, draft cover letters,
and tell you when something needs your attention.

Add your first application and watch.

  [Install extension]  [Add manually]  [Connect Gmail]
```
- Scout avatar shown prominently above the copy.
- No modal; this *is* the Today page when empty.

### First application created
- Background Fit Score fires immediately.
- Toast on completion: *"Scout scored {Company} {Role} {N}/100."* (clickable → opens detail panel)
- Top-bar Scout avatar pulses for 60s after first score.

### Day-2 return
- User returns next morning. Morning brief has generated overnight.
- Today shows: *"Scout's briefing for {date}"* with mission ranking.
- If Autopilot enabled and found anything: Scout's Drafts sidebar item shows a numeric badge.
- Avatar pulses if any unseen events.

### Optional one-time tooltip pass (deferred from this PRD)
A guided tour ("This is Scout. Click here to see what Scout found.") is *not* in this PRD. We rely on the in-context surfacing to do the discovery work. If usage data shows it's needed, ship as a separate PRD.

---

## 12. Marketing-page mirror

The landing page must reflect the in-app surfaces 1:1 so a visitor's mental model matches what they see after sign-up.

### Hero
```
H1:  Open any application.
     Scout already did the work.

Sub: Pipelined's AI agent scores every role, drafts your cover letter,
     summarizes recruiter threads, and flags ghosting risks — all
     before you click into a job.

CTA: [Try Pipelined free]   [Watch 60s demo]
```
Hero visual: animated screenshot of a detail panel filling in — Scout's Take banner populates the score, Toolkit cards flip from "Run it" to "Ready" one by one.

### Three feature sections (matching app surfaces)

| Section | App surface mirrored | Animation / screenshot |
|---|---|---|
| **"Every application, instantly scored and packed."** | Detail panel: Scout's Take + Toolkit | Auto-advancing carousel through the 6 tool cards |
| **"Wake up to Scout's briefing."** | Today page header + missions list | Static screenshot of Scout's briefing |
| **"Scout finds. You apply."** | Scout's Drafts (formerly Pending Inbox) | Animated card flip: empty → "Scout found 3 roles overnight" |

### Tagline placement
- Hero (above)
- Footer: *"Scout finds. Scout drafts. You apply."*
- Browser tab title prefix: *"Scout · Pipelined"*
- Product Hunt / social meta: hero tagline used verbatim in `<meta name="description">`.

---

## 13. Technical scope

### Frontend changes (new files / refactors)
| Action | Path |
|---|---|
| New | `frontend/src/components/scout/ScoutTake.jsx` |
| New | `frontend/src/components/scout/ScoutToolkit.jsx` |
| New | `frontend/src/components/scout/ScoutToolCard.jsx` |
| New | `frontend/src/components/scout/ScoutAvatar.jsx` |
| New | `frontend/src/components/shell/TopBarScoutMenu.jsx` |
| New | `frontend/src/lib/scoutSignals.js` + `scoutSignals.test.js` |
| New | `frontend/src/hooks/useScoutSignal.js` |
| Refactor | `frontend/src/components/DetailPanelBody.jsx` — replace `<AiPanelGroup>` with Scout's Take + Toolkit; demote metadata grid |
| Refactor | `frontend/src/components/shell/TopBar.jsx` — add Scout avatar slot |
| Refactor | `frontend/src/components/shell/Sidebar.jsx` — rename labels (Inbox→Scout's Drafts, Activity→Scout's Activity) |
| Refactor | `frontend/src/components/CoPilotPanel.jsx` — rename strings to "Scout" (file name stays `CoPilotPanel.jsx` to keep git diff minimal; export rename is optional) |
| Refactor | `frontend/src/components/ApplicationRow.jsx` — add Scout signal column |
| Refactor | `frontend/src/pages/TodayPage.jsx` — H1/subhead copy |
| Refactor | `frontend/src/pages/PendingInboxPage.jsx` — H1/subhead/empty-state copy |
| Refactor | `frontend/src/components/AgentActivitySection.jsx` (and Activity page wrapper) — H1 + filter chips |
| Refactor | `frontend/src/components/CommandPalette.jsx` — rename "Open Co-pilot" |
| Refactor | `frontend/src/components/ShortcutHelp.jsx` — rename hotkey label |
| Retire | `frontend/src/components/AiPanelGroup.jsx` (with its test file) |

### Backend changes
| Action | Path |
|---|---|
| New | `backend/applications/service_ai.py::auto_score_fit()` helper (wraps existing fit-score logic) |
| Refactor | `backend/applications/service.py::create_application()` — kick off background task |
| Refactor | `backend/applications/service_bulk.py::bulk_create_applications()` — enqueue per-app fit-score tasks with semaphore |
| Refactor | `backend/autopilot/service.py::approve_pending_opportunity()` — skip auto-run if pre-scored |
| Refactor | `backend/agent/service.py` — accept new event type `fit_score_auto` |

### Data model
- **No new collections.** No schema migrations.
- `applications.fit_score` and related fields already exist.
- No new user preferences (cost stays inside existing daily quota).

### Migrations / backfills
- **None required.** Existing apps without fit scores stay scoreless until the user opens the detail panel and clicks Re-score, or until a future backfill PRD.
- A one-time backfill of fit scores for the most-recent N apps per user could be a follow-up, not part of this drop.

### A11y
- Scout avatar: `aria-label="Scout — {N} new"` when pulsing, `aria-label="Scout"` when idle.
- Toolkit cards: each card is a `<button>` with `aria-label="{tool name} — {state}"` (e.g., `"Apply Pack — Ready, click to view"`).
- Pulse animation respects `prefers-reduced-motion: reduce` — replaced with a static dot.
- Scout's Take rationale text uses semantic heading + paragraph; not announced as live region on initial render but as `aria-live="polite"` when auto-score completes.
- All renamed labels keep semantic meaning (Inbox→Scout's Drafts maintains "drafts" semantics).

### Tests
- **Frontend:** Vitest snapshot + RTL for ScoutTake, ScoutToolkit, ScoutToolCard, ScoutAvatar. Full coverage of `scoutSignals.js` with all five signal priorities + tie-breaks. RTL test for DetailPanelBody verifying Toolkit renders all six cards.
- **Backend:** pytest for `auto_score_fit` — happy path, no-resume skip, quota-exhausted skip, duplicate (already-scored) skip. Mock OpenRouter; real MongoDB.

---

## 14. Risks & mitigations

| Risk | Mitigation |
|---|---|
| Auto-run blows daily quota for power users with many CSV imports | Cap concurrency at 5; respect existing per-user daily quota; skip + log when exhausted |
| Scout's Take fills slowly on slow networks, making the "magic moment" miss | Render skeleton within 200ms; auto-score backend call has a 15s timeout; if exceeded, show "Scout is still scoring — check back" rather than blocking |
| Rename pass breaks command-palette / hotkey / test queries | Coordinated rename in single PR series; grep for "Co-pilot" / "co-pilot" across `frontend/src/` and update tests in the same diff |
| Pipeline list density issue with new Scout column on narrow screens | Hide Scout column under 768px (already responsive); icon-only at 768–1024px; full tooltip at >1024px |
| Users miss the rename and think Scout is a different product | Single-shot in-app changelog modal on next sign-in after release: *"We named our AI. Meet Scout."* |
| Auto-scoring spam toast for batch creates | Debounce toast notifications to one per batch ("Scout scored 12 new applications") rather than one per app |
| Persona feels forced or cringe to power users | Voice guidelines are terse and confident, not cutesy. No emoji in Scout's voice. No mascot face. |

---

## 15. Open questions (resolve during implementation)

1. **Scout avatar glyph** — compass needle vs. stylized "S" vs. concentric arcs. Designer call; mockup three options and pick.
2. **Toolkit card minimum width** — currently planned 3-col responsive; final breakpoints depend on PRD-00 grid tokens.
3. **Activity filter chip taxonomy** — `Scored / Drafted / Found / Flagged` is the proposal; verify against actual `agent_log` event types and adjust.
4. **Scout's Drafts vs. Scout's Finds** — picked "Drafts" for verb consistency with "drafted cover letters." If user testing favors "Finds," swap (label-only change).
5. **Rename of `CoPilotPanel.jsx` file** — keep filename for diff hygiene? Or rename to `ScoutPanel.jsx`? Recommend: keep filename, rename export + all strings. Reduces blast radius of rename PR.

---

## Appendix A — Component responsibility map (new files)

```
scout/
  ScoutAvatar.jsx           — Reusable avatar component (sizes: sm/md/lg, states: idle/pulse/working)
  ScoutTake.jsx             — Top banner: score + rationale + next-step + 2 CTAs
  ScoutToolkit.jsx          — Grid wrapper; renders 6 ScoutToolCards
  ScoutToolCard.jsx         — Single card with three state variants (Ready/RunIt/Working)

shell/
  TopBarScoutMenu.jsx       — Avatar + dropdown menu (Ask Scout / What's Scout doing / Mute)

lib/
  scoutSignals.js           — Pure resolver: (application, emailEvents) → { signal } | null

hooks/
  useScoutSignal.js         — Memoized hook reading email events + computing signal
```

## Appendix B — Brainstorm decision log

| # | Question | Selected | Other options considered |
|---|---|---|---|
| 1 | Brand metaphor | Named agent persona | Co-pilot umbrella · Capability-first no persona |
| 2 | Agent name | Scout | Pip · Cardinal |
| 3 | IA approach | B + slice of A (layer + dedicated Activity) | Pure ambient · Dedicated /scout page · Scout as home |
| 4 | Auto-run | Fit Score only | All three (fit + pack + prep) · Pre-warm context only |
| 5 | Tagline | "Open any application. Scout already did the work." | "Scout finds the roles. You apply." · "The copilot that actually does the work." |
| 6 | Shipping | All at once | Phase 1+2 first · Detail panel only |
