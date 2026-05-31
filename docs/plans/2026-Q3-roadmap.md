# Pipelined 2026-Q3 Roadmap — AI quality, redesign, stability

> Generated 2026-05-30 after UX audit rounds 1+2 (commit hash placeholder).
> Sequenced: AI agentic depth → visual redesign → stability hardening.

## Why this order

UX audits round 1 & 2 fixed the shallow layer: missing nav links, button labels that lied, silent failures. But they didn't touch the thing that makes Pipelined unique—the agentic features themselves. Co-pilot, Apply Pack, Fit Score, and Interview Prep are *fast* and *cached*, but they're opaque to users and don't cite their sources. Phase 1 fixes this depth: we add a per-user RAG layer, stream reasoning inline, embed source citations, and teach the Co-pilot to remember. This is the true differentiator.

Phase 2 executes the Linear-inspired redesign (`docs/redesign/PRD-*.md`). But visuals are secondary. We ship AI depth first so that the redesign surfaces actually matter — when Fit Score shows "Based on: your resume + JD" with a live citation, the visual polish amplifies it.

Phase 3 (Stability) is last because we have no production users yet and can harden while shipping 1+2. Playwright E2E, Sentry, and MongoDB CI are necessary before we go live, but they don't ship user-facing value, and they don't unlock 1+2. Run this phase in parallel with the final visual polish.

## Non-negotiable product policy (reinforced in every phase)

- **NO auto-send**: Follow-up drafts are user-copy-and-send only. Gmail sync is read-only; no `messages.send` paths. Applied Pack, Apply Pack, Thread Summary — all suggest-only.
- **NO PDF/resume edit**: Resume Insights and Autopilot resume tips are suggest-only. Stored resume files (`users.resume_text`) are never modified by agents.
- **NO auto-apply**: Autopilot approve creates a "To Apply" pipeline entry with a draft; the user applies externally on the job site.
- **Every applications/calendar_events/pending_opportunities MongoDB query MUST include `user_id`** in the filter. Missing `user_id` is a security bug (data-leak risk).

---

## Phase 1 — AI agentic depth (target: 3–4 weeks)

### 1.1 RAG foundation over user's pipeline

**Goal:** Every LLM call (Co-pilot, Apply Pack, Fit Score) retrieves relevant chunks from the user's own data (past applications, resumes, email events) and returns cited sources.

**Approach:** Embed the user's applications + email_events + resume into a per-user vector index. Before each LLM call (Co-pilot chat, Apply Pack, Fit Score), retrieve top-K relevant chunks by semantic search. Return the full chunks alongside the LLM response so the UI can cite them. Use a small embedding model (e.g., `openrouter/nomic-ai/nomic-embed-text-v1.5` at ~50 tokens per doc) to minimize cost. Store embeddings in a new `user_embeddings` collection with TTL.

**Concrete files to create / touch:**
- `backend/ai/embeddings.py` (new) — `embed_text()`, `chunk_application()`, `chunk_email_event()` functions
- `backend/ai/rag.py` (new) — `retrieve_chunks(user_id, query_text, top_k=5)` async function
- `backend/ai/copilot_context.py` — call RAG before building the system prompt; include retrieved chunks in the context
- `backend/applications/service.py` — on `create_application()` and `update_application()`, enqueue embedding refresh via APScheduler
- `backend/email_integration/service.py` — on email sync, enqueue embedding refresh
- `backend/jobs/sync.py` — add new scheduler job `embedding_refresh` (runs hourly, dequeues pending user_ids, re-embeds their docs)
- New MongoDB collection: `user_embeddings` { `user_id`, `source_type` ("application"|"email_event"|"resume"), `source_id`, `chunk_text`, `embedding` (vector), `updated_at` }
- New field on `applications` doc: `last_embedded_at` (timestamp)
- `backend/tests/test_rag.py` — test retrieval and chunk quality
- `frontend/src/components/CoPilotPanel.jsx` — render retrieved chunks as a "Sources" section below the message (collapsed by default, expandable)

**Schema changes:**
- Add `user_embeddings` collection with index on `(user_id, source_type)` and TTL index on `updated_at` (90-day expiry)
- Add `last_embedded_at` field to `applications` docs (type: datetime, nullable)

**Config / env:**
- `RAG_ENABLED` (bool, default True) — feature flag to disable RAG in case of cost/latency issues
- `EMBEDDING_MODEL` (string, default `"nomic-ai/nomic-embed-text-v1.5"`)
- `EMBEDDING_BATCH_SIZE` (int, default 100) — chunk refresh batch size
- `RAG_TOP_K` (int, default 5) — number of chunks to retrieve per query

**Risk / unknowns:**
- **Embedding cost on every update**: If users edit applications frequently, embedding refresh can become expensive. Mitigation: batch updates via APScheduler job (enqueue, not immediate); disable via `RAG_ENABLED` flag; add cost tracking to `ai_cache` quota.
- **Index size growth**: Large user libraries (1000+ applications) will grow `user_embeddings` collection. Mitigation: TTL index (auto-prune after 90 days), cap retrieved chunks to prevent spam.
- **Retrieval latency**: Adding a search step before every LLM call adds ~500ms. Mitigation: cache retrieved chunks in-memory for repeated queries in the same Co-pilot session; run retrieval in parallel with LLM call start.

**Acceptance criteria:**
1. Co-pilot answer cites at least 1 specific application by company name from the user's pipeline when relevant (e.g., user asks "What did I say about Acme?" → response references "Your Acme application from March 15")
2. Apply Pack uses RAG-retrieved notes/links from past applications in the same company when generating (if applicable)
3. Fit Score retrieval works (can see in backend logs that chunks are fetched)
4. Embedding refresh runs async, never blocks create/update path (user sees instant confirmation)
5. RAG can be disabled via env flag (`RAG_ENABLED=false`) for cost control

**Estimated time:** 1 week

---

### 1.2 Visible reasoning / "show your work" streaming

**Goal:** Users see the agent's reasoning steps unfold in real time, building trust and transparency.

**Approach:** Instrument LLM prompts to emit `<step>` tags (e.g., `<step>Fetching your applications...</step>`, `<step>Analyzing resume against JD...</step>`). Stream these tags inline to the UI before the final answer. If OpenRouter/model supports native thinking/reasoning mode, use that; otherwise use structured prompt tags. Extend Co-pilot, Apply Pack, and Fit Score (which currently doesn't stream—add SSE) to all support streaming reasoning.

**Concrete files to touch:**
- `backend/ai/openrouter_client.py` — add optional `reasoning_enabled` param to `stream_chat()`, instruction to emit `<step>` tags
- `backend/copilot/service.py` — update `stream_copilot_reply()` system prompt to emit step tags; parse and yield `{type: "step", content: "..."}` events separately from `{type: "token", ...}` events
- `backend/applications/apply_pack/router.py` — convert `POST /api/applications/{id}/apply-pack` from JSON response to SSE (like mock interview), stream steps + tokens
- `backend/applications/apply_pack/service.py` — async generator `stream_apply_pack_with_steps()` instead of single `generate_apply_pack()`
- `backend/applications/fit_score/service.py` — add `stream_fit_score_with_steps()` async generator (currently fit score is polled in the background, add SSE variant)
- `frontend/src/components/CoPilotPanel.jsx` — render steps as a collapsible "Reasoning" section above the final answer
- `frontend/src/components/ApplyPackModal.jsx` — show steps as they stream
- `frontend/src/components/AiFitSection.jsx` — add SSE variant for streaming fit score, render reasoning trail
- `frontend/src/hooks/useCopilotChat.js` — parse step events, accumulate reasoning, pass to UI

**Config:**
- `REASONING_ENABLED` (bool, default True)
- `REASONING_STREAMING` (bool, default True) — if False, just emit final reasoning summary after completion

**Risk / unknowns:**
- **Longer perceived latency**: If steps are slow to arrive, users see nothing for 2s, then text appears. Mitigation: mock a few immediate steps upfront (e.g., "Analyzing your pipeline...") to give immediate feedback.
- **Token usage**: Reasoning consumes more tokens (thinking is verbose). Mitigation: set a token budget cap per reasoning stream; fall back to non-reasoning mode on quota hit.

**Acceptance criteria:**
1. Co-pilot chat shows at least 2 visible steps (e.g., "Retrieving your recent applications", "Analyzing resume fit") before the final answer
2. Apply Pack SSE streams steps + final JSON (not blocking until complete)
3. Fit Score has an SSE variant with streaming steps (can opt-in via a "Show reasoning" button)
4. All steps collapse by default to not clutter the UI; expand on hover or explicit click
5. Reasoning can be disabled via `REASONING_ENABLED=false`

**Estimated time:** 5 days

---

### 1.3 Source citations wired to real data lineage

**Goal:** Every AI output links to the specific source data it used (resume bullets, JD sections, past application notes, email excerpts). Clicking a citation scrolls to that data in the UI.

**Approach:** Extend every AI response schema to include `sources: [{type, ref, snippet}]`. Type can be `"application"`, `"email"`, `"resume"`, `"jd"`. Ref is the entity ID or field path (e.g., `{type: "application", ref: "app_id:67f4c", snippet: "Acme Corp software engineer..."}` or `{type: "resume", ref: "bullet_3", snippet: "Led team of 5 engineers..."}`). On the frontend, render each source as a clickable chip; clicking scrolls the source data into view (e.g., opens the Detail Panel if it's an application, scrolls the Resume Insights section if it's a resume bullet).

**Concrete files to touch:**
- `backend/applications/apply_pack/schemas.py` — add `Source` schema and `sources: list[Source]` field to `ApplyPackResponse`
- `backend/applications/fit_score/schemas.py` — add `sources` field to fit score response
- `backend/copilot/service.py` — parse LLM output for `{sources: [...]}` JSON block; include in `{type: "done", ...}` event
- `backend/ai/rag.py` — ensure `retrieve_chunks()` returns both `chunk_text` and source metadata (source_id, source_type, byte_offset for highlighting)
- `frontend/src/components/CoPilotPanel.jsx` — render `message.sources` as clickable chips below the message; `onClick` opens the source (e.g., scrolls to application in list, opens detail panel)
- `frontend/src/components/ApplyPackModal.jsx` — render sources as inline citations in the cover letter and short answers
- `frontend/src/components/AiFitSection.jsx` — show source citations in the "Why?" reason text
- `frontend/src/lib/citationUtils.js` (new) — helper to parse and navigate to source data; `navigateToSource(source)` function that handles all source types

**Schema additions:**
- `Source` Pydantic model: `{type: str, ref: str, snippet: str, highlighted: bool}`
- Update all AI response schemas (ApplyPack, FitScore, Copilot, ...)

**Risk / unknowns:**
- **Cross-component navigation**: If a citation is in Co-pilot and the source is an application in a different view, navigation is complex. Mitigation: use URL state (deep link to `/dashboard/app-id?highlight=field`) so the cited data loads automatically.
- **Stale citations**: If a source is deleted after the AI ran, the citation breaks. Mitigation: soft-check on click; if source not found, show "This source was deleted" rather than 404.

**Acceptance criteria:**
1. Apply Pack cover letter includes inline citations (e.g., "[2] Your Acme experience") that link to past applications
2. Co-pilot answer includes at least 1 source chip per message (collapsible "Sources" section)
3. Clicking a source scrolls/opens the source data without full page reload
4. Source snippets are accurate (not hallucinated or off-by-one) — verified by manual spot check on 5 Co-pilot threads
5. Citations gracefully degrade if source is deleted

**Estimated time:** 4 days

---

### 1.4 Co-pilot memory + cross-session recall

**Goal:** Co-pilot remembers past conversations with the user and loads them into context, enabling multi-turn conversations that span weeks.

**Approach:** After each Co-pilot chat completes, summarize the conversation into a bullet-point "memory" document (e.g., "User asked about Acme interview tips; I suggested focus on X and Y. User mentioned they're also interested in Google."). Store this memory in a per-user `copilot_memories` collection. On each new Co-pilot request, fetch the last 3 memories and include them in the system prompt (after RAG context). UI shows a small hint badge ("Remembers: Your Acme interview chat") to signal memory is loaded.

**Concrete files to touch:**
- `backend/copilot/memory.py` (new) — `summarize_session(messages: list[dict]) -> str` async function (call LLM to create bullet summary); `load_recent_memories(user_id: str, limit=3) -> list[str]` async function
- `backend/copilot/service.py` — after `stream_copilot_reply()` completes, call `summarize_session()` and store memory; in `stream_copilot_reply()`, call `load_recent_memories()` and append to system prompt
- New MongoDB collection: `copilot_memories` { `user_id`, `session_id`, `summary`, `created_at`, `messages_count` }
- `backend/tests/test_copilot_memory.py` — test memory loading and summarization
- `frontend/src/components/CoPilotPanel.jsx` — display memory hint badge ("Remembers: ...") in the panel header
- `frontend/src/hooks/useCopilotChat.js` — pass memory metadata from backend (if included in response)

**Config:**
- `COPILOT_MEMORY_ENABLED` (bool, default True)
- `COPILOT_MEMORIES_TO_LOAD` (int, default 3)
- `COPILOT_MEMORY_TTL_DAYS` (int, default 90)

**Risk / unknowns:**
- **Token budget**: Including memories consumes tokens. Mitigation: summarize aggressively (max 200 tokens per memory); if memories exceed 1000 tokens total, load fewer.
- **False memories**: LLM might hallucinate details in summaries. Mitigation: include `(source: messages from session {session_id})` in each memory so users can verify by reviewing the actual chat.

**Acceptance criteria:**
1. Co-pilot loads past memories on new chat; at least 1 memory visible in the system context (logs)
2. Memory badge appears when memories are loaded (not just logged)
3. User can manually clear memories (button in Co-pilot settings)
4. Memories can be disabled via `COPILOT_MEMORY_ENABLED=false`

**Estimated time:** 3 days

---

### 1.5 "One clear action" pattern across all AI surfaces

**Goal:** Every AI output ends with ONE specific, unambiguous next step the user can take immediately.

**Approach:** Extend every AI response schema (Copilot, Apply Pack, Fit Score, Interview Prep, Resume Insights) to include `next_action: {label, intent, payload}`. Intent can be `"navigate"`, `"copy"`, `"apply"`, `"note"`, etc.; payload contains the data needed to execute (e.g., `{label: "Copy cover letter", intent: "copy", payload: {text: "..."}}`). On the frontend, every AI card renders this as a prominent primary button at the bottom. This replaces vague CTAs like "See more details" with specific ones like "Copy this draft to Gmail" or "Move to Phone Screen".

**Concrete files to touch:**
- `backend/applications/apply_pack/schemas.py` — add `NextAction` and `next_action` field to `ApplyPackResponse`
- `backend/applications/fit_score/schemas.py` — add `next_action` field
- `backend/copilot/schemas.py` — add `next_action` field to copilot message schema
- `backend/applications/interview_prep/schemas.py` — add `next_action` to interview prep response
- `backend/applications/resume_insights/schemas.py` — add `next_action`
- All AI service files — populate `next_action` in response building (e.g., Apply Pack: `{label: "Copy draft", intent: "copy", payload: {text: cover_letter}}`)
- `frontend/src/components/ApplyPackModal.jsx` — render next_action as primary button
- `frontend/src/components/AiFitSection.jsx` — render next_action
- `frontend/src/components/CoPilotPanel.jsx` — render next_action for assistant messages
- `frontend/src/components/InterviewPrepPanel.jsx` — render next_action
- `frontend/src/lib/actionHandlers.js` (new) — handlers for each intent type (navigate, copy, apply, note, schedule)

**Schema additions:**
- `NextAction` Pydantic: `{label: str, intent: str, payload: dict}`

**Risk / unknowns:**
- **Over-specifying**: Not every message has a clear action. Mitigation: make `next_action` optional (default None); show a generic "Learn more" fallback if None.
- **Intent explosion**: Intents can proliferate (copy, navigate, apply, note, schedule, ...). Mitigation: stick to the 5 most common, use `payload` to parameterize; add more only if 5+ AI surfaces need it.

**Acceptance criteria:**
1. Apply Pack shows "Copy draft" button with the cover letter in the payload
2. Fit Score shows "Add resume bullet" button when suggesting resume improvements
3. Co-pilot shows "Move to Phone Screen" button when suggesting a stage change
4. Every AI card has at most 1 primary action button; secondary actions (if any) are text links
5. Clicking an action button executes without leaving the current view (e.g., copy happens in-place, toast confirms)

**Estimated time:** 3 days

---

## Phase 2 — Cardinal + Linear visual redesign (target: 2–3 weeks)

### 2.0 Design system foundation

**Goal:** Establish tokens, typography scale, spacing, motion, and color palette as the source of truth for all UI surfaces.

**Approach:** Read the design specs from `docs/redesign/PRD-00-design-system.md`. Consolidate all design tokens into `frontend/tailwind.config.js` (Tailwind theme) and `frontend/src/index.css` (CSS variables). Map existing color names (clay orange, warm gray, etc.) to new tokens (Cardinal Red, neutral grays, Stanford accent). Update typography to Inter 13px body, -0.011em tracking, 1.45 line-height. Test the new tokens on light + dark modes. Update all shadcn/ui primitives (`Button`, `Input`, `Select`, etc.) to use the new theme tokens.

**Concrete files to touch:**
- `frontend/tailwind.config.js` — rewrite theme.colors, theme.spacing, theme.fontSize, theme.fontFamily, theme.borderRadius, theme.boxShadow, theme.transitionDuration
- `frontend/src/index.css` — define all CSS variables (--brand-600, --surface-0, --text-1, etc.) for both light and dark modes
- `frontend/src/components/ui/*.jsx` (8+ shadcn components) — update hard-coded colors/sizes to use new tokens (e.g., change `bg-orange-100` to `bg-brand-50`, `text-sm` to based on new typography scale)
- `frontend/src/lib/designTokens.js` — replace existing exports with new design tokens (for React components that can't use Tailwind directly)
- Test files — no changes; tests query by role/text/label, so visual reskin doesn't break them

**Schema changes:** None (purely frontend theme)

**Files verified to exist:**
- `frontend/tailwind.config.js` ✓
- `frontend/src/index.css` ✓
- `frontend/src/components/ui/` ✓
- `frontend/src/lib/designTokens.js` ✓

**Risk / unknowns:**
- **Dark mode contrast**: Cardinal Red (#8C1515) on dark backgrounds may fail 4.5:1 WCAG contrast. Mitigation: use lighter variant (--brand-500) on dark mode, verified with axe-core.
- **Existing hard-coded colors**: Some components may have `bg-red-500` or `text-orange-400` buried in JSX. Mitigation: grep for color names after updating tokens, fix any stragglers.

**Acceptance criteria:**
1. Light mode page screenshot shows Cardinal Red primary, neutral grays, Inter typography
2. Dark mode page screenshot shows same palette with dark surfaces, adjusted contrast
3. All 8 shadcn primitives render with new tokens (Button, Input, Select, Checkbox, etc.)
4. No hard-coded color hex values in JSX outside of shadcn overrides
5. `npm test` passes (no visual tests break)

**Estimated time:** 3 days

---

### 2.1 Dashboard (list, Kanban, detail panel)

**Goal:** Redesign the core pipeline view to match Linear's density and clarity: single-line rows, dot status indicators, a right-side detail drawer (not modal), and a clean filter bar.

**Approach:** Read `docs/redesign/PRD-04-pipeline.md`. Flatten `ApplicationRow` to 28px height with a single company|role|stage|last-update line; remove card backgrounds and shadows. Replace pill-style stage badges with a 6px dot + label. Move detail view from modal to a right-side drawer that slides in over the canvas. Clean up the filter bar to show active filters as dismissible chips. Update Kanban to use smaller card heights with the same dot-status indicators.

**Concrete files to touch:**
- `frontend/src/pages/Dashboard.jsx` — update layout structure (no major changes, mostly className swaps)
- `frontend/src/components/ApplicationRow.jsx` — reduce height to 28px, remove card styling, single-line content, dot indicator
- `frontend/src/components/ApplicationRowActions.jsx` — hover actions unchanged
- `frontend/src/components/DetailPanel.jsx` — convert from modal to side drawer (slide in from right, z-index above canvas)
- `frontend/src/components/DetailPanelHeader.jsx`, `DetailPanelBody.jsx`, `DetailPanelSections.jsx` — reskin typography, spacing, section headers
- `frontend/src/components/KanbanBoard.jsx`, `KanbanColumn.jsx`, `KanbanCard.jsx` — reduce card height, apply dot indicators
- `frontend/src/components/FilterBar.jsx` — show active filters as inline chips with dismiss buttons
- `frontend/src/components/StatsBar.jsx` — compact layout, left-align counts
- `frontend/src/lib/constants.js` — update STAGE_COLORS to use new tokens (from Phase 2.0)

**Files verified to exist:**
- `frontend/src/pages/Dashboard.jsx` ✓
- `frontend/src/components/ApplicationRow.jsx` ✓
- `frontend/src/components/DetailPanel.jsx` ✓
- `frontend/src/components/KanbanBoard.jsx` ✓
- `frontend/src/components/FilterBar.jsx` ✓
- `frontend/src/lib/constants.js` ✓

**Risk / unknowns:**
- **Detail drawer z-index conflicts**: If existing modals (Add Application, CSV import) are open, drawer may layer incorrectly. Mitigation: ensure drawer uses `z-50`, modals use `z-40`, test open + close sequence.
- **Mobile responsiveness**: Drawer on mobile takes full width, may not be obvious how to close. Mitigation: add visible close button (X), swipe-to-dismiss, show backdrop.

**Acceptance criteria:**
1. ApplicationRow renders in 28px height with dot status + single-line text (no wrapping)
2. Detail panel opens as a right drawer (not modal), closes on Escape or clicking backdrop
3. Detail panel content is readable and scrollable
4. Kanban cards are similarly compact and use dot indicators
5. Filter chips are dismissible and update the list on dismiss
6. `npm test` passes (row/card layout changes don't break queries)

**Estimated time:** 1.5 weeks (largest visual surface)

---

### 2.2 Today / Morning Brief redesign

**Goal:** Simplify the Today view to show missions, brief insights, and a daily focus area in a clean, scannable layout.

**Approach:** Read `docs/redesign/PRD-05-today-brief.md`. Remove clutter, use a single-column layout (no split panels). Show morning brief as a collapse-by-default summary card, missions as a simple checklist, and upcoming interviews/events in a narrow timeline strip. Apply Linear's typography scale and spacing.

**Concrete files to touch:**
- `frontend/src/pages/TodayPage.jsx` — rewrite layout structure
- `frontend/src/components/MorningBriefCard.jsx` — compact header, collapsed by default
- `frontend/src/components/MissionList.jsx` — checklist layout
- `frontend/src/components/TodayTimeline.jsx` (or similar) — narrow event strip

**Estimated time:** 5 days

---

### 2.3 Settings page rebuild

**Goal:** Fix the structural issues from UX audit round 1 (missing nav, duplicate Notifications, inconsistent save patterns) while applying Linear design tokens.

**Approach:** Read `docs/redesign/PRD-08-settings.md`. Add missing sections to the nav (`/settings/account`, `/settings/sharing`, `/settings/reports`). Consolidate Notifications (remove duplicate). Standardize save patterns: explicit Save/Cancel for profile, auto-save-with-toast for preferences. Use a left-side nav with clearer labels. Apply new tokens.

**Concrete files to touch:**
- `frontend/src/pages/SettingsPage.jsx` — rebuild nav and route structure
- All `SettingsXxxSection.jsx` files — reapply typography, spacing, form patterns

**Estimated time:** 1 week

---

### 2.4 Mobile responsiveness pass

**Goal:** Ensure the redesigned surfaces work on phones (375px+) without major usability gaps.

**Approach:** Test all main surfaces (Dashboard, Today, Detail drawer on mobile, Settings) on a real phone or DevTools emulation. Adjust breakpoints, font sizes, spacing for mobile. Ensure touch targets are 48px+. Test detail drawer behavior on mobile (takes full width, clear close button).

**Estimated time:** 3 days

---

### 2.5 Dark mode quality

**Goal:** Ensure dark mode is not an afterthought; contrast, readability, and accent color all meet WCAG 4.5:1 on dark surfaces.

**Approach:** Test all new surfaces in dark mode. Verify Cardinal Red hover state (--brand-500 or equivalent) has sufficient contrast on dark backgrounds. Adjust any surfaces that fail axe-core checks.

**Estimated time:** 2 days

---

### 2.6 Empty states + microinteractions

**Goal:** Polish edge cases: empty application lists, no search results, first-time onboarding state. Add subtle motion to reinforce feedback.

**Approach:** Redesign empty-state illustrations to match Linear's style (minimal, geometric). Update onboarding checklist UI. Add 150-220ms ease-out transitions to hover/focus states (per Phase 2.0 motion tokens).

**Estimated time:** 3 days

---

## Phase 3 — Stability + observability (target: 1–2 weeks)

### 3.1 Playwright E2E — 5 golden paths

**Goal:** Automated end-to-end tests covering the core user journeys, running in CI before every deploy.

**Approach:** Write Playwright tests for these critical paths:
1. **Add application** — user lands on extension, captures a job posting, application appears on dashboard
2. **Move stage** — user drags application across pipeline stages, stage persists
3. **Generate morning brief** — user triggers brief generation, missions appear, check off a mission
4. **Co-pilot chat** — user opens Co-pilot panel, sends a message, receives streaming response, clicks a suggested action (e.g., move to a stage)
5. **Mock interview** — user starts mock interview, completes a round, views debrief, closes (debrief persists)

Each test uses test data (seed a test user + test applications in a staging MongoDB instance). No UI jank detection, just happy-path functionality.

**Concrete files to create:**
- `frontend/e2e/playwright.config.ts` — configure dev server URL, headless mode, artifact upload
- `frontend/e2e/tests/add-application.spec.ts` — add via extension
- `frontend/e2e/tests/move-stage.spec.ts` — drag + verify persistence
- `frontend/e2e/tests/morning-brief.spec.ts` — generate, check mission
- `frontend/e2e/tests/copilot-chat.spec.ts` — chat, verify streaming, click action
- `frontend/e2e/tests/mock-interview.spec.ts` — interview, debrief, persist
- `.github/workflows/playwright.yml` — GitHub Actions job that runs tests on push to main
- `backend/tests/fixtures/e2e_seed_data.py` — pytest fixture to seed test user + data into MongoDB

**Config:**
- `PLAYWRIGHT_HEADLESS=true` in CI
- `BACKEND_URL=http://localhost:8000` (dev server)
- `TEST_USER_EMAIL=e2e-test-{run-id}@example.com`
- Screenshots on failure saved to `frontend/e2e/test-results/`

**Files verified to exist:**
- `frontend/src/` ✓ (app exists)
- `backend/tests/` ✓ (test structure exists)

**Risk / unknowns:**
- **Test flakiness**: Network timeouts, async waits. Mitigation: use Playwright's built-in retry + wait mechanisms; add explicit waits for SSE messages.
- **Test data cleanup**: Seed data may accumulate. Mitigation: use MongoDB TTL index on test data, or clean up in fixture teardown.

**Acceptance criteria:**
1. All 5 tests pass locally (`npx playwright test`)
2. All 5 tests pass in GitHub Actions CI
3. Tests run on every push to main (no blocking, just reporting)
4. Screenshots + videos on failure available in artifacts

**Estimated time:** 4 days

---

### 3.2 Sentry error monitoring

**Goal:** Capture runtime errors on frontend and backend, filter PII, send to Sentry for alerting.

**Approach:** Install `@sentry/react` and `@sentry/tracing` on frontend; configure to log frontend errors (not success logs). Install `sentry-sdk` on backend; configure to log backend 5xx errors and LLM failures. Add scrubbing rules to mask user emails, application company names (unless in development). Set up alerts for critical errors (500s, quota exceeded, etc.).

**Concrete files to touch:**
- `frontend/src/main.jsx` — initialize Sentry client
- `frontend/src/hooks/useErrorBoundary.jsx` — wire Sentry to error boundary
- `backend/main.py` — initialize Sentry client
- `.env` (or `.env.production`) — add `SENTRY_DSN_FRONTEND` and `SENTRY_DSN_BACKEND`
- Backend service files (e.g., `copilot/service.py`, `apply_pack/service.py`) — wrap try/catch around LLM calls, send errors to Sentry with context

**Risk / unknowns:**
- **PII leakage**: Error messages may include user emails or job descriptions. Mitigation: Sentry scrubbing rules (regex on PII patterns); test with a dummy error.
- **Noise from transient errors**: Network timeouts, 429s may trigger alerts. Mitigation: set alert thresholds (only alert on 3+ errors in 5 min), ignore expected errors (429, timeouts).

**Acceptance criteria:**
1. Frontend errors appear in Sentry dashboard (test with a thrown error)
2. Backend 500s appear in Sentry
3. Scrubbing rules are in place (no full user emails in error context)
4. Critical alerts configured (e.g., Slack notification on 5+ errors in 10 min)

**Estimated time:** 1 day

---

### 3.3 MongoDB CI for backend tests

**Goal:** Run backend tests in CI against a real MongoDB instance (not mocked), so that race conditions and connection issues are caught early.

**Approach:** GitHub Actions workflow starts a MongoDB service container, sets `MONGO_URI=mongodb://localhost:27017/pipelined-test`, runs `pytest tests/` against it. Each test wipes the database before running (existing `conftest.py` fixture should handle this). Archive coverage reports.

**Concrete files to touch:**
- `.github/workflows/backend-tests.yml` (new) — define MongoDB service, run pytest
- `backend/conftest.py` — ensure wipe-between-tests is idempotent
- Backend test files — no changes; they already expect real MongoDB

**Risk / unknowns:**
- **Service startup timing**: MongoDB may not be ready immediately. Mitigation: GitHub Actions' `services:` block waits for health checks; add a `healthcheck` to the MongoDB service.
- **Flaky timing tests**: Tests that rely on exact timestamps or timeouts may flake in CI. Mitigation: use `freezegun` or similar to mock time; allow 1-2s leeway in timeout assertions.

**Acceptance criteria:**
1. Workflow runs on every push to backend/ or main
2. All tests pass in CI (same as local `pytest tests/`)
3. Coverage report generated and archived

**Estimated time:** 1 day

---

### 3.4 Bundle size + lazy-load audit

**Goal:** Ensure frontend bundle is not bloated; lazy-load heavy features so first paint is fast.

**Approach:** Run `npm run build` locally and inspect the Vite build report. Identify large chunks (e.g., Mock Interview, Co-pilot panel, charts). Lazy-load these with React.lazy() + Suspense. Measure impact with DevTools Lighthouse.

**Concrete files to touch:**
- `frontend/src/pages/*.jsx` — wrap heavy components with React.lazy()
- `frontend/src/components/CoPilotPanel.jsx` — already in a drawer, can be lazy-loaded
- `frontend/src/components/MockInterviewPanel.jsx` — lazy-load
- `frontend/src/components/AnalyticsCharts.jsx` (or similar) — lazy-load

**Acceptance criteria:**
1. Initial bundle < 300 KB (gzipped)
2. Lazy chunks for CoPilot, MockInterview, Charts each < 100 KB
3. Lighthouse Performance score > 75 on Vite build

**Estimated time:** 1 day

---

### 3.5 Accessibility audit

**Goal:** Ensure the redesigned surfaces meet WCAG 2.1 AA, with focus management, keyboard navigation, and screen reader support.

**Approach:** Use axe-core in test suite; manually test keyboard nav (Tab, Escape, arrow keys in lists). Test with a screen reader (NVDA on Windows or VoiceOver on Mac). Verify focus rings are visible, labels are proper (no placeholder-only inputs), modals trap focus.

**Concrete files to touch:**
- `frontend/src/components/CoPilotPanel.jsx` — ensure focus management on open/close
- `frontend/src/components/DetailPanel.jsx` — same
- All form components — ensure labels are `<label htmlFor>`, not just attributes
- `frontend/src/index.css` — add focus ring styles (per Phase 2.0: `2px Cardinal Red, 2px offset on light`)

**Risk / unknowns:**
- **Slide-in drawer focus**: When detail panel slides in, focus should move to the close button or first focusable element. Mitigation: use `useEffect` + `useRef` to manage focus on mount/unmount.
- **Dark mode contrast**: Cardinal Red on dark may fail. Mitigation: test with axe-core in both light + dark modes.

**Acceptance criteria:**
1. axe-core scan on Dashboard, Today, Settings, Detail panel: 0 violations (can tolerate "needs review" warnings)
2. All form inputs have associated `<label>` elements
3. Modals + drawers trap focus (Tab cycles within, Escape closes)
4. Focus rings visible and meet 3:1 contrast
5. `prefers-reduced-motion: reduce` respected (all 150-220ms transitions reduce to instant)

**Estimated time:** 2 days

---

## Sequencing rationale

**1.1 RAG** must complete before **1.3 source citations** because citations need real retrieved chunks to link to. Without RAG, citations are fake (hard-coded examples).

**1.2 Visible reasoning** can run in parallel with 1.1 (independent feature).

**1.3 Source citations** depends on 1.1 RAG. Can partially start once RAG is merged (e.g., build the citation UI while RAG indexing is finishing).

**1.4 Memory** and **1.5 "one action"** are independent and can run in parallel with each other and 1.1-1.3.

**Phase 2.0 Design System** must land before all of Phase 2.1-2.6 (visual surfaces).

**2.1 Dashboard** is the largest surface and should be attacked early (blocks 2.4 mobile responsiveness).

**2.2-2.5** can run in parallel once design tokens land.

**Phase 3 (Stability)** can run in parallel with Phase 1 + 2 because it's not user-facing and doesn't depend on new features being shipped. However, **3.1 Playwright E2E** benefits from Phase 1 + 2 being mostly stable (less test rewrites mid-flight). Start writing E2E tests once Phase 1 core features (RAG, memory) are in staging.

---

## Risks + mitigations

**Redesign relitigates IA we just fixed.** The UX audit rounds 1 & 2 fixed missing nav links, duplicate settings, etc. The redesign (Phase 2) is visual + interaction polish only, not IA changes. Mitigation: lock the IA from `docs/ux-audit/` round 1. Redesign specs explicitly call out "no IA changes" in each PRD. PR reviewers verify no new routes or nav restructuring.

**RAG cost explosion.** Small embedding models are cheap, but if every application update triggers a full re-embed of the user's library, costs spike. Mitigation: batch embeddings (enqueue updates, process hourly), add `RAG_ENABLED` flag, cap embeddings per user (max 1000 chunks per library), monitor `ai_cache` quota and warn if RAG usage exceeds 30%.

**Reasoning makes responses slower.** Streaming steps add latency before the final answer. Mitigation: stream steps AS they generate so perceived latency is lower; mock immediate steps upfront ("Analyzing your pipeline...") to show instant feedback.

**Adding `next_action` to schemas breaks existing clients.** If a frontend was built expecting the old response schema, missing `next_action` may crash. Mitigation: make `next_action` optional (default None); old code that doesn't read it still works.

**Sentry leaks PII.** Errors may include user emails, company names, job descriptions. Mitigation: configure Sentry scrubbing rules to regex-mask emails, company names; test with a dummy error; review first 10 error samples in Sentry before enabling prod.

**Playwright tests flake on timing.** Async waits, SSE message arrival, database latency can cause intermittent failures. Mitigation: use Playwright's built-in `waitFor()` with generous timeouts (10s), retry-on-failure in CI (2 retries), seed test data with a fixed UUID (not random) so test data is reproducible.

**Dark mode contrast fails.** Cardinal Red (#8C1515) on dark surface (#08090A) may not meet 4.5:1 WCAG AA. Mitigation: test with axe-core in both modes early (Phase 2.0); use lighter variant (--brand-500) on dark if needed; adjust surface colors if necessary.

---

## What we're explicitly NOT doing this quarter

- **No new top-level features.** No new pages, no new agentic features beyond depth (no new agents, no new job sources).
- **No auto-send / auto-apply expansion.** Product policy is locked. No extending these features.
- **No backend model swap.** Stay on OpenRouter + current models (Claude, Sonnet, etc.). No evaluating alternative providers.
- **No mobile app.** Responsive web only; no React Native.
- **No re-IA of Settings** beyond the fixes from round 1 (missing links, duplicates, save patterns). Settings is already in the redesign scope; don't reopen the IA.
- **No email template redesign.** Morning brief email, digest email stay as-is (visual refresh only if time permits).

---

## Per-phase exit criteria

### Phase 1 done when:

1. RAG retrieval works end-to-end (Co-pilot answer cites a real application; backend logs show embedding retrieval)
2. Streaming reasoning shows at least 2 visible steps before the final answer (logs confirm step tags are emitted and parsed)
3. Source citations are clickable and navigate to the source data (manual test: click citation, verify detail panel/resume section opens)
4. Co-pilot memory badge appears and shows a past memory (logs confirm memory loaded from DB)
5. All AI response schemas include `next_action` field; at least 2 surfaces (Apply Pack, Fit Score) render the action button

### Phase 2 done when:

1. Design system tokens are consolidated in Tailwind config + CSS variables (no hard-coded colors in JSX)
2. Dashboard, Today, Settings screenshots match Linear design in both light + dark modes
3. Detail panel opens as a side drawer (not modal); closes on Escape and backdrop click
4. Kanban and list rows are compact (28-32px) with dot status indicators
5. Mobile responsiveness verified on 375px viewport (detail drawer full-width, touch targets 48px+)
6. Accessibility audit passes: 0 axe-core violations, keyboard nav works, focus visible

### Phase 3 done when:

1. All 5 Playwright E2E tests pass in CI (add application, move stage, morning brief, Co-pilot chat, mock interview)
2. Sentry captures frontend errors (test error visible in dashboard)
3. Backend tests run in MongoDB CI container; all pass
4. Bundle size report shows main bundle < 300 KB gzipped; lazy chunks < 100 KB each
5. Accessibility audit complete (WCAG 2.1 AA, focus management, screen reader tested)

---

## Next concrete action (TL;DR)

**Monday morning:** Phase 1.1 RAG kickoff. Start by reading `backend/ai/openrouter_client.py` and `backend/ai/copilot_context.py` to understand the current LLM call stack. Then:
1. Create `backend/ai/embeddings.py` with `embed_text()` and `chunk_application()` functions
2. Create `backend/ai/rag.py` with `retrieve_chunks(user_id, query_text)` async function
3. Wire RAG into `backend/ai/copilot_context.py` so it retrieves + includes chunks in the system prompt
4. Verify a single Co-pilot message cites a real application from the test user's pipeline

By Friday of week 1, RAG is shipped (merged to main, feature-flagged). This unblocks 1.3 (source citations) and 1.2 (reasoning) to start in parallel during week 2.
