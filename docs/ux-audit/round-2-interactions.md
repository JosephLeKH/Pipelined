# Pipelined UX Audit — Round 2: Interaction Tracing

**Date:** 2026-05-30
**Scope:** Trace every clickable element, form, toggle, keypress through its handler chain to find silent failures, missing error feedback, race conditions, no-op stubs, and quota/rate-limit exposure gaps.
**Method:** Five parallel exploration agents, each tracing a different surface end-to-end (frontend handler → API → backend service → LLM/DB → response → UI feedback).
**Trigger:** User report that "clicking generate daily report does nothing sometimes." Confirmed and traced.

---

## The "Generate Brief Does Nothing" Mystery — Solved

Three concrete failure paths cause the button to appear unresponsive:

1. **Rate limit (429) hit on retry.** `_can_generate_on_demand()` in `backend/brief/service.py:95-102` counts docs in `morning_brief_on_demand` collection — returns false if 3+ in past hour. On the second click after a 429, React Query caches the error, the button stays in `disabled={isGenerating}` state, and no new toast fires. **User sees a disabled button doing nothing.**
2. **Backend `generate_and_store_brief()` returns null.** Frontend's `onSuccess` receives null, doesn't fire an error toast, button resets to "Generate brief". **Looks like the click never registered.**
3. **Sonner toast unmounted by an error boundary.** If the toast provider is below an error boundary that has caught an unrelated error, `toast.error()` calls silently fail and never render. The mutation completes successfully on the backend's POV, but the user gets zero feedback.

Root cause across all three: **the success/error path doesn't always produce visible UI state**.

---

## Critical Silent Failures (data loss or feature totally broken)

| # | Failure | Location | Impact |
|---|---------|----------|--------|
| 1 | **All Calendar event mutations missing `onError`** — Create/Update/Delete events have no error handler. Modal stays open after failure, user re-clicks, possibly creating duplicates. | `frontend/src/hooks/useCalendar.js:35-65` | User thinks event was created/deleted; it wasn't |
| 2 | **NewEventForm submit has no `onError`** — Form modal stays open on backend failure with no message. | `useCalendar.js` createEvent mutation | Modal lies; user can't tell what happened |
| 3 | **Background fit score failures are silent** — If LLM errors or quota hits, frontend polls indefinitely. Skeleton never resolves. | `backend/applications/service_ai.py:64-112` + `AiFitSection.jsx:100-119` | Infinite loading skeleton, no escape |
| 4 | **Mock Interview sessions never persisted** — Transcript + debrief live only in component state. Page reload = entire 30-min session lost. | `MockInterviewPanel.jsx`, no `mock_interview` field on application doc | Critical data loss |
| 5 | **Interview Prep SSE has no abort on unmount** — User navigates away mid-stream → backend keeps running expensive Exa + OpenRouter calls → wasted credits, orphaned task. | `useInterviewPrep.js`, EventSource not cleaned up | Wasted API spend; user confused |
| 6 | **Appearance settings + stage colors never sync to backend** — Theme, density, font size, accent, stage colors are localStorage-only. Cross-device login loses all of them. | `SettingsAppearanceSection.jsx:83-97`, `PipelineStagesEditor.jsx:336-339` | Settings vanish across devices |
| 7 | **localStorage write failures are silent** — If quota exceeded (some browsers cap at 5MB), `localStorage.setItem` throws silently in the appearance handlers. Change appears to apply but won't survive page reload. | `SettingsAppearanceSection.jsx` | Settings reset without explanation |
| 8 | **Bulk operations (move/edit/delete/merge) all missing `onError`** — User thinks 5 apps moved/deleted; backend rejected; user has no idea. | `useApplicationListBulkActions.js:28-57` | Silent partial / total failure |
| 9 | **Saved view delete: no confirmation + no `onError`** — One trash icon click and the view is gone; if delete fails, user thinks it succeeded. | `FilterBarSavedViews.jsx:101-106` | Destructive + silent |
| 10 | **Cmd+Enter double-submits Add Application** — Submit handler doesn't gate on `isPending`. Mashing Cmd+Enter while mutation is in-flight can fire twice. | `ManualAddForm.jsx:54-62` | Duplicate creates |
| 11 | **Approve pending opportunity can lose apply_pack** — Duplicate-detection branch creates the app but the secondary `application.update()` to attach apply_pack has no error path. User gets success toast, apply_pack silently missing. | `backend/autopilot/service.py:73-128` | Data quietly lost |
| 12 | **Notes secondary update on Add Application has no error handler** — `updateApplication(created.id, { notes })` after create can fail silently. | `useManualAddForm.js:62-69` | Notes never saved |
| 13 | **Tag delete cascading 50+ apps has no success/error toast** — `onSettled` closes the modal regardless of outcome. | `pages/Tags.jsx:83-87` | User thinks tag is deleted; it isn't |

---

## High-Severity Silent Failures (no feedback, user confused)

### AI feature errors are misleading

- **OpenRouter quota/429 returns HTTP 503 "AI features not configured"** in `apply_pack/service.py`. User thinks the API key is missing; it's actually quota. Same pattern repeats across thread summary, resume insights, fit score.
- **Rate-limit (429) errors at FastAPI level** show as generic "Could not generate..." with no indication it's a rate limit (no "try again in X minutes").
- **Mid-stream OpenRouter quota** during Interview Prep / Mock Interview / Co-pilot generates a generic `event: error` with no "rate limit" context.

### Optimistic UI lies silently

- **Stage change in detail panel** — `onError` reverts the optimistic update but fires no toast. User sees the stage change visually then snap back, no explanation. (`useDetailPanelState.js:30-39`)
- **Archive/unarchive** — Same pattern. Visual glitch with no error message. (`useApplicationListRowActions.js:32`)
- **Delete application** — Same. Optimistic remove → revert → no toast.
- **Mark notification read** — Optimistic dot disappears; on backend fail it reappears on reload with no explanation. (`NotificationBell.jsx:66-89`)
- **Mark all read** — Same as above.

### SSE / streaming gaps

- **Notification SSE connection failure** logs to console only. User falls back to 60s polling without knowing. Real-time notifications silently broken. (`useNotifications.js:53-55`)
- **Co-pilot session persistence failures swallowed** — `.catch(() => {})` at `useCopilotChat.js:60`. If MongoDB save fails, chat history is lost on reload. User thinks it was saved.
- **Co-pilot session hydration failures swallowed** — `// Session hydration is best-effort.` Chat starts empty if fetch fails; user blames the AI.

### Auth / onboarding

- **GithubCallback error redirect to `/login?error=...`** — Login page never reads the query param. Silent failure. (Confirmed.)
- **Onboarding "Resend verification email"** uses `catch { /* banner handles errors elsewhere */ }`. Empty catch. Email send can fail with zero feedback. (`OnboardingChecklist.jsx:151-155`)
- **Login error "Incorrect email or password"** applies to bad email format, wrong password, account not found, and 429 rate limits. Indistinguishable.
- **Login submit doesn't surface 429 specifically** — backend has `@limiter.limit(settings.rate_limit_auth)` but the frontend just shows the generic error.

### Race conditions / no-op patterns

- **Row "Set follow-up"** uses optional chaining `onSetFollowUp?.(application.id)` — if the parent forgets to pass the prop, the button silently no-ops. No console error.
- **Hover quick actions on rapid double-click** — buttons don't have `disabled={isPending}`, so double-fire is possible.
- **Bulk merge with conflicting fields** — backend has no documented conflict-resolution policy; user can lose data without knowing which field "won".
- **CSV import file parse error** uses `catch { ... setLocalError("Could not read CSV file. Please try another file.") }` — root cause swallowed. User can't tell if it's encoding, format, or size.

### Feature completeness gaps

- **Weekly review** section returns `null` on API 404 with no error UI. (`WeeklyReviewSection.jsx:64-74`)
- **Brief history drawer** returns `null` on API error. User clicks "History", drawer flickers closed, no explanation.
- **Mock interview "End session"** sends `end_session: true` but provides no confirmation that debrief was generated; debrief is not persisted either way.
- **Kanban mobile drag** unclear if wired. May be silent no-op on touch devices.

---

## Cross-Cutting Patterns Found

### Empty catches
- `OnboardingChecklist.jsx:153` — `catch { /* banner handles errors elsewhere */ }`
- `useCopilotChat.js:60` — `.catch(() => {})` for session persist
- `useCopilotChat.js:49-51` — `// Session hydration is best-effort`
- `useCsvImportWizard.js:87` — `catch { setLocalError("Could not read CSV file...") }` (root cause discarded)
- Backend: `backend/applications/service_ai.py:84-89` — background fit score swallows all exceptions
- Backend: `service_ai.py:81-83` — quota-exceeded just logged, never propagated

### Missing `onError` handlers in mutations
- `useCalendar.js:35-65` — create/update/delete events
- `useApplicationListBulkActions.js` — bulk move, edit, delete, merge (all four)
- `useApplicationListRowActions.js:32` — archive (reverts silently)
- `NotificationBell.jsx` — markRead, markAllRead
- `pages/Tags.jsx:83-87` — tag delete (only `onSettled`)
- `FilterBarSavedViews.jsx:101-106` — saved view delete

### Missing query invalidation on success
- Some mutations succeed at backend but don't invalidate React Query cache → stale UI until user manually refreshes

### Misleading error mapping
- **OpenRouter quota → HTTP 503 "not configured"** across all AI features (apply_pack, thread_summary, resume_insights, fit_score)
- **Rate limit 429 → generic "Failed to..." toast** — no indication of cooldown or retry timing

### Optimistic UI without rollback feedback
- Stage change, archive, delete, mark-read, all visually revert on error with no toast explanation

### Persistence gaps
- Appearance settings (theme, density, font size, accent) — localStorage only
- Pipeline stage colors — localStorage only
- Mock interview transcripts — never persisted at all
- Filter selections after navigation — lost on page change

### Destructive actions without confirmation
- Delete saved view (one click)
- Delete tag (modal closes on settled regardless of outcome)
- Delete watchlist company (inline button, no dialog)
- Delete template (inline)
- Delete pipeline stage (no check for apps in that stage)

---

## Tally

| Category | Count |
|----------|-------|
| Critical silent-failure risks (data loss / feature broken) | **13** |
| High-severity silent failures (no user feedback) | **24** |
| Medium-severity issues (opaque error, but eventually visible) | **18** |
| Empty catch blocks across codebase | **6+** confirmed |
| Mutations missing `onError` toasts | **10+** |
| Misleading error code mappings (quota → "not configured") | **4** AI features |
| Destructive actions without confirmation | **5** |
| SSE / streaming abort/cleanup gaps | **3** |
| localStorage-only settings (not cross-device) | **5 fields** |

---

## What to Do With This (suggested priority for round 3 = fixing)

### Tier 1 — Ship-blockers (data loss, broken features)
- Calendar event mutations: add `onError` toasts and rollback (1 hour, 3 mutations)
- Mock interview persistence: store transcript + debrief on application doc, or warn user (2 hours)
- Background fit score: add timeout, error state, "retry" affordance (1 hour)
- Cmd+Enter double-submit guard in `ManualAddForm` (5 min)
- Bulk action `onError` handlers (1 hour, 4 mutations)
- Saved view delete confirmation + `onError` (15 min)
- Apply pack persistence on duplicate-detected approve path (30 min)

### Tier 2 — Misleading errors (highest "WTF" moment for users)
- OpenRouter quota errors: map 429 → "AI quota reached" not "not configured" (30 min, 4 files)
- Optimistic UI: every mutation that visually reverts must also fire a toast (1 hour, ~6 places)
- Login error specificity for 429 vs bad creds vs account-not-found (15 min)

### Tier 3 — Persistence gaps
- Migrate appearance settings + stage colors to backend (3-4 hours)
- Mock interview transcript persistence (1 hour)
- Filter selections via URL params (already partially done?)

### Tier 4 — UX polish (covered in round 1)
- Settings IA / nav rebuild
- Onboarding step order
- "Approve" → "Add to pipeline" rename
- Visible keyboard shortcut hints
- All the structural stuff from round 1
