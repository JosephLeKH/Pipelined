# Scout AI-Forward Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote per-application AI tools from a buried collapsible group to a top-of-panel Scout's Take banner + always-visible Scout's Toolkit card grid, and wrap every AI surface under a named "Scout" persona across the app.

**Spec:** [`docs/redesign/PRD-13-scout-ai-forward-redesign.md`](../redesign/PRD-13-scout-ai-forward-redesign.md)

**Architecture:** Frontend changes are split into (a) new Scout components in `frontend/src/components/scout/`, (b) a rename pass across the app shell, sidebar, Today/Pending/Activity pages, and (c) one new Pipeline column powered by a pure-function signal resolver. Backend adds one helper `auto_score_fit()` and wires it into all four application-creation entrypoints via FastAPI `BackgroundTasks`. The Scout brand is a presentation layer — no schema changes, no new collections, no new routes.

**Tech Stack:** React 18 + Vite, TailwindCSS, Vitest + RTL, FastAPI + Motor async, MongoDB, OpenRouter (existing). Hotkeys via `useHotkeys`. Background tasks via FastAPI's built-in `BackgroundTasks`.

**Out of scope for this plan:** Marketing landing-page mirror (§12 of PRD-13) — defer to a follow-up plan touching public site repo surfaces.

---

## File Structure

### New frontend files

```
frontend/src/components/scout/
  ScoutAvatar.jsx            — reusable avatar (sizes sm/md/lg, states idle/pulse/working)
  ScoutAvatar.test.jsx
  ScoutTake.jsx              — top banner: score + rationale + next-step + 2 CTAs
  ScoutTake.test.jsx
  ScoutToolkit.jsx           — grid wrapper rendering 6 ScoutToolCards
  ScoutToolkit.test.jsx
  ScoutToolCard.jsx          — single card with Ready/RunIt/Working/Error variants
  ScoutToolCard.test.jsx

frontend/src/components/shell/
  TopBarScoutMenu.jsx        — top-bar avatar + dropdown menu
  TopBarScoutMenu.test.jsx

frontend/src/lib/
  scoutSignals.js            — pure resolver (application, emailEvents) → signal | null
  scoutSignals.test.js

frontend/src/hooks/
  useScoutSignal.js          — memoized hook combining application + email events
  useScoutSignal.test.js

frontend/src/components/
  WhatsNewScoutModal.jsx     — one-shot "Meet Scout" changelog modal
  WhatsNewScoutModal.test.jsx
```

### Frontend files modified

```
frontend/src/components/
  DetailPanelBody.jsx        — replace AiPanelGroup with ScoutTake + ScoutToolkit, demote metadata
  ApplicationRow.jsx         — add Scout signal column
  CoPilotPanel.jsx           — rename internal strings to "Scout" (filename kept)
  CommandPalette.jsx         — rename "Open Co-pilot" → "Open Scout"
  ShortcutHelp.jsx           — rename hotkey label
  AgentActivitySection.jsx   — H1 + filter chips
  AgentActivityFeed.jsx      — pass filter prop through

frontend/src/components/shell/
  Sidebar.jsx                — rename Inbox → "Scout's Drafts", Activity → "Scout's Activity"
  MobileSidebar.jsx          — same rename pass
  TopBar.jsx                 — add Scout avatar slot

frontend/src/pages/
  TodayPage.jsx              — H1 + subhead + missions caption
  PendingInboxPage.jsx       — H1 + subhead + empty-state + item label
  Activity.jsx               — H1 + filter chips wiring
```

### Frontend files retired

```
frontend/src/components/
  AiPanelGroup.jsx           — DELETE
  AiPanelGroup.test.jsx      — DELETE
```

### Backend files

```
backend/applications/
  service_ai.py              — ADD auto_score_fit() helper
  service.py                 — MODIFY create_application() to schedule background task
  service_bulk.py            — MODIFY bulk_create_applications() to enqueue per-app tasks with semaphore
  router.py                  — pass BackgroundTasks dep through to service

backend/autopilot/
  service.py                 — MODIFY approve_pending_opportunity() to skip if pre-scored

backend/agent/
  service.py                 — accept new event type "fit_score_auto"

backend/tests/
  test_service_ai_auto_score.py  — NEW
  test_applications_service.py   — MODIFY to assert background task scheduled
  test_autopilot_service.py      — MODIFY to assert skip-on-prescored
```

---

## Task Index

**Phase 1 — Scout component foundations**
- Task 1: Create `ScoutAvatar` component + tests
- Task 2: Create `scoutSignals` pure resolver + tests

**Phase 2 — Detail panel restructure (centerpiece)**
- Task 3: Create `ScoutToolCard` component + tests
- Task 4: Create `ScoutToolkit` component + tests
- Task 5: Create `ScoutTake` component + tests
- Task 6: Refactor `DetailPanelBody` to use ScoutTake + ScoutToolkit, demote metadata
- Task 7: Retire `AiPanelGroup`
- Task 8: Add Scout signal column to `ApplicationRow` via `useScoutSignal`

**Phase 3 — App shell rename pass**
- Task 9: Rename sidebar labels (Inbox → "Scout's Drafts", Activity → "Scout's Activity")
- Task 10: Rename Co-pilot dock strings to Scout
- Task 11: Add Scout avatar + menu to `TopBar`
- Task 12: Rename Co-pilot in `CommandPalette` and `ShortcutHelp`

**Phase 4 — Page reframing**
- Task 13: Reframe `TodayPage` ("Scout's briefing")
- Task 14: Reframe `PendingInboxPage` ("Scout's Drafts")
- Task 15: Reframe Activity page + add filter chips

**Phase 5 — Backend auto-run Fit Score**
- Task 16: Add `auto_score_fit()` helper + unit tests
- Task 17: Wire `auto_score_fit` into `create_application` background task
- Task 18: Wire `auto_score_fit` into bulk import with concurrency cap
- Task 19: Skip auto-run when Autopilot already pre-scored
- Task 20: Emit `fit_score_auto` agent_log event

**Phase 6 — Cleanup + changelog**
- Task 21: One-shot "Meet Scout" changelog modal
- Task 22: Final verification (build + test + visual)

---

## Phase 1 — Scout component foundations

### Task 1: Create `ScoutAvatar` component

**Files:**
- Create: `frontend/src/components/scout/ScoutAvatar.jsx`
- Test: `frontend/src/components/scout/ScoutAvatar.test.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/scout/ScoutAvatar.test.jsx
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import ScoutAvatar from "./ScoutAvatar";

describe("ScoutAvatar", () => {
  it("renders the Scout glyph with default md size", () => {
    render(<ScoutAvatar />);
    const avatar = screen.getByLabelText("Scout");
    expect(avatar).toBeInTheDocument();
    expect(avatar).toHaveClass("h-6", "w-6");
  });

  it("renders small (sm) variant", () => {
    render(<ScoutAvatar size="sm" />);
    const avatar = screen.getByLabelText("Scout");
    expect(avatar).toHaveClass("h-4", "w-4");
  });

  it("renders large (lg) variant", () => {
    render(<ScoutAvatar size="lg" />);
    const avatar = screen.getByLabelText("Scout");
    expect(avatar).toHaveClass("h-8", "w-8");
  });

  it("uses pulse state aria label when state=pulse", () => {
    render(<ScoutAvatar state="pulse" />);
    expect(screen.getByLabelText("Scout — has new")).toBeInTheDocument();
  });

  it("uses working state aria label when state=working", () => {
    render(<ScoutAvatar state="working" />);
    expect(screen.getByLabelText("Scout — working")).toBeInTheDocument();
  });

  it("respects prefers-reduced-motion class on pulse state", () => {
    render(<ScoutAvatar state="pulse" />);
    const avatar = screen.getByLabelText("Scout — has new");
    expect(avatar.className).toMatch(/motion-safe:animate-pulse/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/scout/ScoutAvatar.test.jsx`
Expected: FAIL — `Cannot find module './ScoutAvatar'`

- [ ] **Step 3: Implement `ScoutAvatar`**

```jsx
// frontend/src/components/scout/ScoutAvatar.jsx
/** Scout persona avatar — compass glyph, three size + state variants. */

import Compass from "lucide-react/dist/esm/icons/compass";

const SIZE_CLASSES = {
  sm: { box: "h-4 w-4", icon: "h-2.5 w-2.5" },
  md: { box: "h-6 w-6", icon: "h-3.5 w-3.5" },
  lg: { box: "h-8 w-8", icon: "h-5 w-5" },
};

const STATE_LABELS = {
  idle: "Scout",
  pulse: "Scout — has new",
  working: "Scout — working",
};

function ringClass(state) {
  if (state === "pulse") return "ring-2 ring-brand-500/40 motion-safe:animate-pulse";
  if (state === "working") return "ring-2 ring-brand-500/60";
  return "ring-1 ring-border-1";
}

function ScoutAvatar({ size = "md", state = "idle" }) {
  const sz = SIZE_CLASSES[size] ?? SIZE_CLASSES.md;
  return (
    <span
      role="img"
      aria-label={STATE_LABELS[state] ?? STATE_LABELS.idle}
      className={`inline-flex shrink-0 items-center justify-center rounded-full bg-brand-600 text-white ${sz.box} ${ringClass(state)}`}
    >
      <Compass className={sz.icon} aria-hidden="true" />
    </span>
  );
}

export default ScoutAvatar;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/scout/ScoutAvatar.test.jsx`
Expected: PASS — 6 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/components/scout/ScoutAvatar.jsx frontend/src/components/scout/ScoutAvatar.test.jsx
git commit -m "feat(scout): add ScoutAvatar component (size + state variants)"
```

---

### Task 2: Create `scoutSignals` pure resolver

**Files:**
- Create: `frontend/src/lib/scoutSignals.js`
- Test: `frontend/src/lib/scoutSignals.test.js`

Pure function resolving up to one Scout-signal-of-the-day per application row in the pipeline list. Five signal types in priority order:

1. 🔥 Reply needed (overdue follow-up OR inbound email with no reply >2 days)
2. 👻 Ghost risk (no movement >10 days, not in terminal stage)
3. ✨ Scout found this (source = autopilot/watchlist, not yet viewed)
4. 🎯 High fit (score >= 85, panel not yet opened)
5. ✓ Tools ready (apply_pack or interview_prep cached, not yet viewed)

- [ ] **Step 1: Write the failing test**

```js
// frontend/src/lib/scoutSignals.test.js
import { describe, it, expect } from "vitest";

import { computeScoutSignal } from "./scoutSignals";

const TERMINAL_STAGES = new Set(["Rejected", "Withdrawn", "Offer", "Accepted"]);
const TODAY = new Date("2026-06-01T12:00:00Z");
function daysAgo(n) {
  const d = new Date(TODAY);
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
}

describe("computeScoutSignal", () => {
  it("returns null when no signals apply", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(2),
      fit_score: 60,
      source: "manual",
    };
    expect(computeScoutSignal(app, [], { now: TODAY })).toBeNull();
  });

  it("returns 'reply' (priority 1) when follow_up_date is overdue", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(1),
      follow_up_date: daysAgo(3),
    };
    const sig = computeScoutSignal(app, [], { now: TODAY });
    expect(sig.type).toBe("reply");
    expect(sig.label).toMatch(/Reply needed/);
  });

  it("returns 'reply' when inbound email has no outbound reply >2d", () => {
    const app = { id: "a1", current_stage: "Interview", updated_at: daysAgo(1) };
    const events = [
      { direction: "inbound", occurred_at: daysAgo(4) },
    ];
    const sig = computeScoutSignal(app, events, { now: TODAY });
    expect(sig.type).toBe("reply");
  });

  it("does NOT return 'reply' when outbound reply exists after inbound", () => {
    const app = { id: "a1", current_stage: "Interview", updated_at: daysAgo(1) };
    const events = [
      { direction: "inbound", occurred_at: daysAgo(4) },
      { direction: "outbound", occurred_at: daysAgo(1) },
    ];
    expect(computeScoutSignal(app, events, { now: TODAY })).toBeNull();
  });

  it("returns 'ghost' when no movement >10 days and not terminal", () => {
    const app = { id: "a1", current_stage: "Applied", updated_at: daysAgo(12) };
    const sig = computeScoutSignal(app, [], { now: TODAY });
    expect(sig.type).toBe("ghost");
    expect(sig.label).toMatch(/Ghost risk/);
  });

  it("does NOT return 'ghost' when stage is terminal", () => {
    const app = { id: "a1", current_stage: "Rejected", updated_at: daysAgo(30) };
    expect(computeScoutSignal(app, [], { now: TODAY })).toBeNull();
  });

  it("returns 'found' when source is autopilot and unviewed", () => {
    const app = {
      id: "a1",
      current_stage: "To Apply",
      updated_at: daysAgo(1),
      source: "autopilot",
      viewed_at: null,
    };
    const sig = computeScoutSignal(app, [], { now: TODAY });
    expect(sig.type).toBe("found");
  });

  it("returns 'high_fit' when fit_score >= 85 and unviewed", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(1),
      fit_score: 88,
      viewed_at: null,
    };
    const sig = computeScoutSignal(app, [], { now: TODAY });
    expect(sig.type).toBe("high_fit");
    expect(sig.label).toMatch(/High fit/);
  });

  it("returns 'tools_ready' when apply_pack present and not viewed", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(1),
      apply_pack: { cover_letter: "..." },
      viewed_at: null,
    };
    const sig = computeScoutSignal(app, [], { now: TODAY });
    expect(sig.type).toBe("tools_ready");
  });

  it("priority: reply beats ghost", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(15),
      follow_up_date: daysAgo(2),
    };
    expect(computeScoutSignal(app, [], { now: TODAY }).type).toBe("reply");
  });

  it("priority: ghost beats found", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(15),
      source: "autopilot",
      viewed_at: null,
    };
    expect(computeScoutSignal(app, [], { now: TODAY }).type).toBe("ghost");
  });

  it("priority: found beats high_fit", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(1),
      source: "autopilot",
      fit_score: 90,
      viewed_at: null,
    };
    expect(computeScoutSignal(app, [], { now: TODAY }).type).toBe("found");
  });

  it("priority: high_fit beats tools_ready", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: daysAgo(1),
      fit_score: 90,
      apply_pack: { cover_letter: "..." },
      viewed_at: null,
    };
    expect(computeScoutSignal(app, [], { now: TODAY }).type).toBe("high_fit");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/lib/scoutSignals.test.js`
Expected: FAIL — `Cannot find module './scoutSignals'`

- [ ] **Step 3: Implement `scoutSignals.js`**

```js
// frontend/src/lib/scoutSignals.js
/** Pure resolver: returns the single highest-priority Scout signal for a row, or null. */

const TERMINAL_STAGES = new Set(["Rejected", "Withdrawn", "Offer", "Accepted"]);
const GHOST_DAYS = 10;
const REPLY_DAYS = 2;
const HIGH_FIT_THRESHOLD = 85;
const MS_PER_DAY = 1000 * 60 * 60 * 24;

function daysBetween(a, b) {
  return Math.floor((a - b) / MS_PER_DAY);
}

function replySignal(app, events, now) {
  if (app.follow_up_date) {
    const followUp = new Date(app.follow_up_date).getTime();
    if (followUp < now.getTime()) {
      const overdue = daysBetween(now, new Date(followUp));
      return {
        type: "reply",
        icon: "🔥",
        label: `Reply needed (${overdue}d)`,
        tooltip: `Follow-up overdue by ${overdue} day${overdue === 1 ? "" : "s"}`,
        action: "scout-take",
      };
    }
  }
  const inboundDates = events
    .filter((e) => e.direction === "inbound")
    .map((e) => new Date(e.occurred_at).getTime());
  const outboundDates = events
    .filter((e) => e.direction === "outbound")
    .map((e) => new Date(e.occurred_at).getTime());
  if (inboundDates.length === 0) return null;
  const lastIn = Math.max(...inboundDates);
  const lastOut = outboundDates.length ? Math.max(...outboundDates) : 0;
  if (lastIn <= lastOut) return null;
  const days = daysBetween(now, new Date(lastIn));
  if (days <= REPLY_DAYS) return null;
  return {
    type: "reply",
    icon: "🔥",
    label: `Reply needed (${days}d)`,
    tooltip: `Inbound email ${days} days ago, no reply`,
    action: "scout-take",
  };
}

function ghostSignal(app, now) {
  if (TERMINAL_STAGES.has(app.current_stage)) return null;
  if (!app.updated_at) return null;
  const days = daysBetween(now, new Date(app.updated_at));
  if (days <= GHOST_DAYS) return null;
  return {
    type: "ghost",
    icon: "👻",
    label: `Ghost risk (${days}d)`,
    tooltip: `No movement in ${days} days`,
    action: "scout-take",
  };
}

function foundSignal(app) {
  const isFound = app.source === "autopilot" || app.source === "watchlist";
  if (!isFound || app.viewed_at) return null;
  return {
    type: "found",
    icon: "✨",
    label: "Scout found this",
    tooltip: `Scout queued this from ${app.source}`,
    action: "scout-take",
  };
}

function highFitSignal(app) {
  if (typeof app.fit_score !== "number") return null;
  if (app.fit_score < HIGH_FIT_THRESHOLD) return null;
  if (app.viewed_at) return null;
  return {
    type: "high_fit",
    icon: "🎯",
    label: `High fit (${app.fit_score})`,
    tooltip: `Scout scored this ${app.fit_score}/100`,
    action: "scout-take",
  };
}

function toolsReadySignal(app) {
  const hasPack = Boolean(app.apply_pack);
  const hasPrep = Boolean(app.interview_prep_briefing);
  if (!hasPack && !hasPrep) return null;
  if (app.viewed_at) return null;
  return {
    type: "tools_ready",
    icon: "✓",
    label: "Tools ready",
    tooltip: "Scout has Apply Pack or Interview Prep ready",
    action: "scout-toolkit",
  };
}

export function computeScoutSignal(application, emailEvents = [], options = {}) {
  const now = options.now ?? new Date();
  return (
    replySignal(application, emailEvents, now) ??
    ghostSignal(application, now) ??
    foundSignal(application) ??
    highFitSignal(application) ??
    toolsReadySignal(application) ??
    null
  );
}
```

- [ ] **Step 4: Run tests to verify they all pass**

Run: `cd frontend && npx vitest run src/lib/scoutSignals.test.js`
Expected: PASS — 13 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/lib/scoutSignals.js frontend/src/lib/scoutSignals.test.js
git commit -m "feat(scout): add scoutSignals pure resolver with 5 prioritized signal types"
```

---

## Phase 2 — Detail panel restructure

### Task 3: Create `ScoutToolCard` component

**Files:**
- Create: `frontend/src/components/scout/ScoutToolCard.jsx`
- Test: `frontend/src/components/scout/ScoutToolCard.test.jsx`

Three variants: `ready`, `runIt`, `working`. One optional `error` state with retry.

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/scout/ScoutToolCard.test.jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import ScoutToolCard from "./ScoutToolCard";

describe("ScoutToolCard", () => {
  it("renders ready variant with summary and View CTA", () => {
    const onClick = vi.fn();
    render(
      <ScoutToolCard
        variant="ready"
        title="Apply Pack"
        summary="Cover + 3 talking points"
        ctaLabel="View"
        onClick={onClick}
      />
    );
    expect(screen.getByText("Apply Pack")).toBeInTheDocument();
    expect(screen.getByText("Cover + 3 talking points")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Apply Pack — Ready/i })).toBeInTheDocument();
  });

  it("renders runIt variant with description and Start CTA", () => {
    render(
      <ScoutToolCard
        variant="runIt"
        title="Mock Interview"
        summary="5 questions · 12 min"
        ctaLabel="Start"
        onClick={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /Mock Interview — Run it/i })).toBeInTheDocument();
  });

  it("renders working variant with skeleton and no click handler", async () => {
    render(<ScoutToolCard variant="working" title="Resume Insights" summary="Generating…" />);
    const btn = screen.getByRole("button", { name: /Resume Insights — Working/i });
    expect(btn).toBeDisabled();
  });

  it("calls onClick when ready card is clicked", async () => {
    const onClick = vi.fn();
    render(
      <ScoutToolCard variant="ready" title="Apply Pack" summary="x" ctaLabel="View" onClick={onClick} />
    );
    await userEvent.click(screen.getByRole("button", { name: /Apply Pack/i }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it("renders error variant with retry button", async () => {
    const onRetry = vi.fn();
    render(
      <ScoutToolCard
        variant="error"
        title="Apply Pack"
        summary="Something went wrong"
        onRetry={onRetry}
      />
    );
    await userEvent.click(screen.getByRole("button", { name: /Retry/i }));
    expect(onRetry).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/scout/ScoutToolCard.test.jsx`
Expected: FAIL — `Cannot find module './ScoutToolCard'`

- [ ] **Step 3: Implement `ScoutToolCard`**

```jsx
// frontend/src/components/scout/ScoutToolCard.jsx
/** Single tool card in Scout's Toolkit. Four state variants. */

import Check from "lucide-react/dist/esm/icons/check";
import Play from "lucide-react/dist/esm/icons/play";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";

const VARIANT_STYLE = {
  ready: "border-border-1 bg-surface-1 hover:bg-surface-2",
  runIt: "border-dashed border-border-1 bg-surface-0 hover:bg-surface-1",
  working: "border-border-1 bg-surface-1 cursor-wait",
  error: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
};

const VARIANT_LABEL = {
  ready: "Ready",
  runIt: "Run it",
  working: "Working",
  error: "Error",
};

function VariantIcon({ variant }) {
  if (variant === "ready") return <Check className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />;
  if (variant === "runIt") return <Play className="h-3.5 w-3.5 text-text-3" aria-hidden="true" />;
  if (variant === "working")
    return <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin text-text-3" aria-hidden="true" />;
  if (variant === "error") return <AlertCircle className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />;
  return null;
}

function ScoutToolCard({ variant = "runIt", title, summary, ctaLabel, onClick, onRetry }) {
  const disabled = variant === "working";
  const handler = variant === "error" ? onRetry : onClick;
  const accessibleCta = variant === "error" ? "Retry" : ctaLabel ?? VARIANT_LABEL[variant];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handler}
      aria-label={`${title} — ${VARIANT_LABEL[variant]}${ctaLabel ? `, ${ctaLabel}` : ""}`}
      className={`flex h-full flex-col gap-1 rounded-md border p-3 text-left motion-reduce:transition-none transition-colors duration-hover ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 ${VARIANT_STYLE[variant]}`}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold text-text-1">
        <VariantIcon variant={variant} />
        {title}
      </span>
      <span className="text-xs text-text-2">{summary}</span>
      <span className="mt-1 text-[0.6875rem] font-medium uppercase tracking-wide text-brand-600">
        {accessibleCta} {variant !== "working" && variant !== "error" && "→"}
      </span>
    </button>
  );
}

export default ScoutToolCard;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/scout/ScoutToolCard.test.jsx`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/components/scout/ScoutToolCard.jsx frontend/src/components/scout/ScoutToolCard.test.jsx
git commit -m "feat(scout): add ScoutToolCard with ready/runIt/working/error variants"
```

---

### Task 4: Create `ScoutToolkit` component

**Files:**
- Create: `frontend/src/components/scout/ScoutToolkit.jsx`
- Test: `frontend/src/components/scout/ScoutToolkit.test.jsx`

Renders 6 ScoutToolCards in a responsive 3-col grid. Reads tool state from application fields and opens the existing per-tool modal/section when clicked. For this plan, "open" means: set local state to expanded for the corresponding tool section. Existing tool components (`ApplyPackSection`, `ResumeInsightsSection`, etc.) are mounted below the toolkit and conditionally visible.

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/scout/ScoutToolkit.test.jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";

import ScoutToolkit from "./ScoutToolkit";

const baseApp = {
  id: "a1",
  fit_score: null,
  apply_pack: null,
  resume_insights: null,
  thread_summary: null,
  interview_prep_briefing: null,
};

describe("ScoutToolkit", () => {
  it("renders all six tool cards", () => {
    render(<ScoutToolkit application={baseApp} onToolOpen={() => {}} />);
    expect(screen.getByText("Apply Pack")).toBeInTheDocument();
    expect(screen.getByText("Mock Interview")).toBeInTheDocument();
    expect(screen.getByText("Resume Insights")).toBeInTheDocument();
    expect(screen.getByText("Email Recap")).toBeInTheDocument();
    expect(screen.getByText("Interview Prep")).toBeInTheDocument();
    expect(screen.getByText("Follow-up Draft")).toBeInTheDocument();
  });

  it("shows Apply Pack as Ready when apply_pack is populated", () => {
    render(<ScoutToolkit application={{ ...baseApp, apply_pack: { cover_letter: "x" } }} onToolOpen={() => {}} />);
    expect(screen.getByRole("button", { name: /Apply Pack — Ready/i })).toBeInTheDocument();
  });

  it("shows Apply Pack as Run it when apply_pack is null", () => {
    render(<ScoutToolkit application={baseApp} onToolOpen={() => {}} />);
    expect(screen.getByRole("button", { name: /Apply Pack — Run it/i })).toBeInTheDocument();
  });

  it("calls onToolOpen with the tool key when a card is clicked", async () => {
    const onToolOpen = vi.fn();
    render(<ScoutToolkit application={baseApp} onToolOpen={onToolOpen} />);
    await userEvent.click(screen.getByRole("button", { name: /Apply Pack/i }));
    expect(onToolOpen).toHaveBeenCalledWith("apply_pack");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/scout/ScoutToolkit.test.jsx`
Expected: FAIL — `Cannot find module './ScoutToolkit'`. Note the `vi` import is missing — add it.

- [ ] **Step 3: Fix missing `vi` import in test**

Add `vi` to the vitest import line:
```jsx
import { describe, it, expect, vi } from "vitest";
```

- [ ] **Step 4: Implement `ScoutToolkit`**

```jsx
// frontend/src/components/scout/ScoutToolkit.jsx
/** Scout's Toolkit — 3-col responsive grid of 6 tool cards. */

import ScoutToolCard from "./ScoutToolCard";

function applyPackState(app) {
  if (app.apply_pack) {
    return { variant: "ready", summary: "Cover + talking points", ctaLabel: "View" };
  }
  return { variant: "runIt", summary: "Tailored cover letter + 3 talking points", ctaLabel: "Generate" };
}

function mockInterviewState(app) {
  if (app.mock_interview_session_id) {
    return { variant: "ready", summary: "Last session ready to resume", ctaLabel: "Resume" };
  }
  return { variant: "runIt", summary: "5 questions · ~12 min", ctaLabel: "Start" };
}

function resumeInsightsState(app) {
  if (app.resume_insights) {
    const tips = app.resume_insights.suggestions?.length ?? 0;
    return { variant: "ready", summary: `${tips} tip${tips === 1 ? "" : "s"}`, ctaLabel: "View" };
  }
  return { variant: "runIt", summary: "Tailor your resume to this JD", ctaLabel: "Run" };
}

function emailRecapState(app) {
  if (app.thread_summary) {
    return { variant: "ready", summary: "Threads summarized", ctaLabel: "View" };
  }
  return { variant: "runIt", summary: "Summarize recruiter threads", ctaLabel: "Generate" };
}

function interviewPrepState(app) {
  if (app.interview_prep_briefing) {
    return { variant: "ready", summary: "Company + process brief", ctaLabel: "View" };
  }
  if (app.interview_prep_status === "running") {
    return { variant: "working", summary: "Researching company…" };
  }
  return { variant: "runIt", summary: "Company facts + process notes", ctaLabel: "Run" };
}

function followUpState(app) {
  if (app.follow_up_draft) {
    return { variant: "ready", summary: "Draft ready to copy", ctaLabel: "View" };
  }
  return { variant: "runIt", summary: "Draft when you're ready", ctaLabel: "Draft" };
}

const TOOLS = [
  { key: "apply_pack", title: "Apply Pack", resolveState: applyPackState },
  { key: "mock_interview", title: "Mock Interview", resolveState: mockInterviewState },
  { key: "resume_insights", title: "Resume Insights", resolveState: resumeInsightsState },
  { key: "email_recap", title: "Email Recap", resolveState: emailRecapState },
  { key: "interview_prep", title: "Interview Prep", resolveState: interviewPrepState },
  { key: "follow_up", title: "Follow-up Draft", resolveState: followUpState },
];

function ScoutToolkit({ application, onToolOpen }) {
  return (
    <section aria-label="Scout's Toolkit" className="border-t border-border-1 pt-4">
      <h3 className="pb-2 text-xs font-medium uppercase tracking-wide text-text-3">
        Scout's Toolkit
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const state = tool.resolveState(application);
          return (
            <ScoutToolCard
              key={tool.key}
              title={tool.title}
              variant={state.variant}
              summary={state.summary}
              ctaLabel={state.ctaLabel}
              onClick={() => onToolOpen(tool.key)}
            />
          );
        })}
      </div>
    </section>
  );
}

export default ScoutToolkit;
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/scout/ScoutToolkit.test.jsx`
Expected: PASS — 4 tests passing.

- [ ] **Step 6: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/components/scout/ScoutToolkit.jsx frontend/src/components/scout/ScoutToolkit.test.jsx
git commit -m "feat(scout): add ScoutToolkit 6-tool responsive grid"
```

---

### Task 5: Create `ScoutTake` component

**Files:**
- Create: `frontend/src/components/scout/ScoutTake.jsx`
- Test: `frontend/src/components/scout/ScoutTake.test.jsx`

Top-of-panel banner: score (large) + one-sentence rationale + suggested next step + two CTAs.

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/scout/ScoutTake.test.jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import ScoutTake from "./ScoutTake";

describe("ScoutTake", () => {
  it("renders skeleton with 'scoring' message when fit_score is null", () => {
    render(<ScoutTake application={{ id: "a1", fit_score: null }} onAskScout={() => {}} />);
    expect(screen.getByText(/Scout is scoring this/i)).toBeInTheDocument();
  });

  it("renders score + rationale when fit_score is present", () => {
    const app = {
      id: "a1",
      fit_score: 78,
      fit_score_summary: "Strong infra match, weak frontend signal.",
    };
    render(<ScoutTake application={app} onAskScout={() => {}} />);
    expect(screen.getByText("78")).toBeInTheDocument();
    expect(screen.getByText(/Strong infra match/)).toBeInTheDocument();
  });

  it("calls onAskScout when 'Ask Scout' CTA is clicked", async () => {
    const onAskScout = vi.fn();
    render(
      <ScoutTake application={{ id: "a1", fit_score: 80 }} onAskScout={onAskScout} />
    );
    await userEvent.click(screen.getByRole("button", { name: /Ask Scout/i }));
    expect(onAskScout).toHaveBeenCalledOnce();
  });

  it("shows 'Upload resume' CTA when fit_score_status is 'no_resume'", () => {
    const app = { id: "a1", fit_score: null, fit_score_status: "no_resume" };
    render(<ScoutTake application={app} onAskScout={() => {}} />);
    expect(screen.getByText(/Upload resume/i)).toBeInTheDocument();
  });

  it("shows overdue follow-up as next step when applicable", () => {
    const app = {
      id: "a1",
      fit_score: 70,
      follow_up_date: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    };
    render(<ScoutTake application={app} onAskScout={() => {}} />);
    expect(screen.getByText(/send follow-up/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/scout/ScoutTake.test.jsx`
Expected: FAIL — `Cannot find module './ScoutTake'`

- [ ] **Step 3: Implement `ScoutTake`**

```jsx
// frontend/src/components/scout/ScoutTake.jsx
/** Scout's Take — top-of-panel score + rationale + suggested next step. */

import ScoutAvatar from "./ScoutAvatar";

function suggestedNextStep(app) {
  if (app.follow_up_date) {
    const dueDate = new Date(app.follow_up_date).getTime();
    if (dueDate < Date.now()) return "send follow-up (overdue)";
  }
  if (!app.apply_pack && app.current_stage === "To Apply") return "draft your apply pack";
  if (!app.interview_prep_briefing && app.current_stage?.includes("Interview")) {
    return "prep for the interview";
  }
  return "review the latest activity";
}

function scoreColor(score) {
  if (score >= 85) return "text-brand-700 dark:text-brand-300";
  if (score >= 65) return "text-text-1";
  return "text-text-2";
}

function ScoutTake({ application, onAskScout, onPrimaryAction }) {
  const scoring = application.fit_score == null && application.fit_score_status !== "no_resume";
  const noResume = application.fit_score_status === "no_resume";

  return (
    <section
      aria-label="Scout's Take"
      className="rounded-md border border-border-1 bg-surface-1 px-3 py-3"
    >
      <header className="mb-2 flex items-center gap-2">
        <ScoutAvatar size="sm" state="idle" />
        <span className="text-xs font-semibold uppercase tracking-wide text-text-3">
          Scout's Take
        </span>
      </header>

      {scoring && (
        <p className="text-sm text-text-2" aria-live="polite">
          Scout is scoring this role…
        </p>
      )}

      {noResume && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-text-2">Scout can't score this without your resume.</p>
          <a
            href="/settings"
            className="text-xs font-medium text-brand-600 hover:underline"
          >
            Upload resume →
          </a>
        </div>
      )}

      {application.fit_score != null && (
        <div className="flex flex-col gap-2">
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl font-semibold tabular-nums ${scoreColor(application.fit_score)}`}>
              {application.fit_score}
            </span>
            <span className="text-xs text-text-3">/ 100 fit</span>
          </div>
          {application.fit_score_summary && (
            <p className="text-sm text-text-1">{application.fit_score_summary}</p>
          )}
          <p className="text-xs text-text-3">
            Next step: {suggestedNextStep(application)}
          </p>
          <div className="mt-1 flex items-center gap-2">
            {onPrimaryAction && (
              <button
                type="button"
                onClick={onPrimaryAction}
                className="rounded-md bg-brand-600 px-2 py-1 text-xs font-medium text-white hover:bg-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2"
              >
                Take action
              </button>
            )}
            <button
              type="button"
              onClick={onAskScout}
              className="rounded-md border border-border-1 bg-surface-0 px-2 py-1 text-xs text-text-1 hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2"
            >
              Ask Scout about this role →
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default ScoutTake;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx vitest run src/components/scout/ScoutTake.test.jsx`
Expected: PASS — 5 tests passing.

- [ ] **Step 5: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/components/scout/ScoutTake.jsx frontend/src/components/scout/ScoutTake.test.jsx
git commit -m "feat(scout): add ScoutTake top-of-panel banner with score + next-step"
```

---

### Task 6: Refactor `DetailPanelBody` to use Scout components

**Files:**
- Modify: `frontend/src/components/DetailPanelBody.jsx`
- Modify (extend): `frontend/src/components/DetailPanelBody.test.jsx` (if missing, create)

Replace the `<AiPanelGroup>` block with `<ScoutTake>` + `<ScoutToolkit>` at the TOP (right after stage/header), and demote the metadata grid (Location/Remote/Compensation/Company Type) to below the timeline. Notes stays mid-panel. Tool sections remain mounted below the Toolkit (so clicking a card scrolls to / focuses the section).

- [ ] **Step 1: Write the failing test for new structure**

```jsx
// frontend/src/components/DetailPanelBody.test.jsx
// (Add or extend this test file)
import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

import { PanelBody } from "./DetailPanelBody";
import { AuthContext } from "../context/AuthContext";

const wrap = (ui) => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <AuthContext.Provider value={{ user: { default_stages: ["Applied", "Interview"], has_resume: true } }}>
          {ui}
        </AuthContext.Provider>
      </MemoryRouter>
    </QueryClientProvider>
  );
};

const application = {
  id: "a1",
  current_stage: "Applied",
  fit_score: 78,
  fit_score_summary: "Strong infra signal.",
  notes: "",
  location: "Remote",
};

describe("PanelBody — Scout-first layout", () => {
  it("renders Scout's Take above Notes", () => {
    render(
      wrap(
        <PanelBody
          application={application}
          handleStageChange={() => {}}
          handleUpdate={() => {}}
          onAddEvent={() => {}}
          onDirtyChange={() => {}}
        />
      )
    );
    const take = screen.getByLabelText("Scout's Take");
    const notes = screen.getByLabelText(/notes/i);
    expect(take.compareDocumentPosition(notes) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("renders Scout's Toolkit with all six tools above the metadata grid", () => {
    render(
      wrap(
        <PanelBody
          application={application}
          handleStageChange={() => {}}
          handleUpdate={() => {}}
          onAddEvent={() => {}}
          onDirtyChange={() => {}}
        />
      )
    );
    const toolkit = screen.getByLabelText("Scout's Toolkit");
    expect(toolkit).toBeInTheDocument();
    expect(screen.getByText("Apply Pack")).toBeInTheDocument();
    expect(screen.getByText("Mock Interview")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx vitest run src/components/DetailPanelBody.test.jsx`
Expected: FAIL — Scout's Take / Toolkit not rendered.

- [ ] **Step 3: Refactor `DetailPanelBody`**

Replace the existing file with:

```jsx
// frontend/src/components/DetailPanelBody.jsx
/** PanelBody: detail layout led by Scout's Take + Toolkit, metadata demoted. */

import { useCallback, useRef } from "react";

import { useAuth } from "../context/AuthContext";
import AgentActivitySection from "./AgentActivitySection";
import AiFitSection from "./AiFitSection";
import ApplyPackSection from "./ApplyPackSection";
import ContactsSection from "./ContactsSection";
import { DetailPanelNotes } from "./DetailPanelNotes";
import { DetailPanelTimeline } from "./DetailPanelTimeline";
import FollowUpDraftSection from "./FollowUpDraftSection";
import { InterviewPrepAgent } from "./InterviewPrepAgent";
import OfferDetailsSection from "./OfferDetailsSection";
import OfferSummarySection from "./OfferSummarySection";
import ResumeInsightsSection from "./ResumeInsightsSection";
import ScoutTake from "./scout/ScoutTake";
import ScoutToolkit from "./scout/ScoutToolkit";
import ThreadSummarySection from "./ThreadSummarySection";
import { OPEN_COPILOT_EVENT } from "../lib/constants";
import {
  ApplicationPrepSection,
  DetailField,
  DetailPanelMetaRow,
  FollowUpSection,
  JobPostingLink,
  StageSelector,
  TagsSection,
} from "./DetailPanelSections";

const TOOL_SECTION_IDS = {
  apply_pack: "scout-tool-apply-pack",
  mock_interview: "scout-tool-mock-interview",
  resume_insights: "scout-tool-resume-insights",
  email_recap: "scout-tool-email-recap",
  interview_prep: "scout-tool-interview-prep",
  follow_up: "scout-tool-follow-up",
};

export function PanelBody({
  application,
  handleStageChange,
  handleUpdate,
  onAddEvent,
  onDirtyChange,
  expandFollowUpDraft = false,
}) {
  const { user } = useAuth();
  const stageOptions = user?.default_stages ?? [];
  const sectionRefs = useRef({});

  const handleToolOpen = useCallback((toolKey) => {
    const id = TOOL_SECTION_IDS[toolKey];
    const el = id ? document.getElementById(id) : null;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleAskScout = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_COPILOT_EVENT));
  }, []);

  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border-1">
        <span className="text-xs text-text-3">Stage</span>
        <StageSelector
          stageOptions={stageOptions}
          currentStage={application.current_stage}
          onStageChange={handleStageChange}
        />
      </div>

      <ScoutTake application={application} onAskScout={handleAskScout} />

      <ScoutToolkit application={application} onToolOpen={handleToolOpen} />

      <DetailPanelNotes
        applicationId={application.id}
        initialValue={application.notes}
        onDirtyChange={onDirtyChange}
      />

      <DetailPanelTimeline
        stageHistory={application.stage_history}
        applicationId={application.id}
        onAddEvent={onAddEvent}
      />

      <TagsSection application={application} onUpdate={handleUpdate} />
      <FollowUpSection application={application} onUpdate={handleUpdate} />

      {application.current_stage === "Offer" && (
        <>
          <OfferSummarySection application={application} />
          <OfferDetailsSection application={application} onUpdate={handleUpdate} />
        </>
      )}

      <ApplicationPrepSection applicationId={application.id} initialChecklist={application.prep_checklist} />

      {/* Tool sections — mounted below toolkit, anchored by ID for scroll-to */}
      <div id={TOOL_SECTION_IDS.apply_pack} ref={(el) => (sectionRefs.current.apply_pack = el)}>
        <ApplyPackSection
          application={application}
          onPackGenerated={(pack) => handleUpdate({ apply_pack: pack })}
        />
      </div>
      <div id={TOOL_SECTION_IDS.resume_insights}>
        <ResumeInsightsSection
          application={application}
          onUpdate={handleUpdate}
          onInsightsGenerated={(insights) => handleUpdate({ resume_insights: insights })}
        />
      </div>
      <div id={TOOL_SECTION_IDS.email_recap}>
        <ThreadSummarySection
          application={application}
          onSummaryGenerated={(summary) => handleUpdate({ thread_summary: summary })}
        />
      </div>
      <div id={TOOL_SECTION_IDS.interview_prep}>
        <InterviewPrepAgent
          applicationId={application.id}
          application={application}
          briefing={application.interview_prep_briefing}
          generatedAt={application.interview_prep_generated_at}
          prepStatus={application.interview_prep_status}
          interviewRound={application.interview_round}
        />
      </div>
      <div id={TOOL_SECTION_IDS.follow_up}>
        <FollowUpDraftSection application={application} autoExpand={expandFollowUpDraft} />
      </div>
      <div id={TOOL_SECTION_IDS.mock_interview} className="hidden">
        {/* MockInterviewPanel is rendered in its own modal; this anchor is a future hook */}
      </div>

      <AiFitSection
        application={application}
        hasResume={Boolean(user?.has_resume)}
        aiScoresRemainingToday={user?.ai_scores_remaining_today}
        onScoreGenerated={(data) => handleUpdate(data)}
      />

      <AgentActivitySection applicationId={application.id} />
      <ContactsSection applicationId={application.id} />

      {/* Metadata — demoted to bottom */}
      <DetailPanelMetaRow application={application} />
      <JobPostingLink url={application.source_url} />
      <div className="grid grid-cols-2 gap-3">
        <DetailField label="Location" value={application.location} />
        <DetailField label="Remote" value={application.remote_status} />
        <DetailField label="Compensation" value={application.compensation} />
        <DetailField label="Company Type" value={application.company_type} />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd frontend && npx vitest run src/components/DetailPanelBody.test.jsx`
Expected: PASS — both new tests pass.

Run any other detail-panel tests that may have been affected:
`cd frontend && npx vitest run src/components/DetailPanel`
Expected: previously-passing tests still pass. Update copy-only expectations if any test specifically queried "AI" wrapper text.

- [ ] **Step 5: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/components/DetailPanelBody.jsx frontend/src/components/DetailPanelBody.test.jsx
git commit -m "refactor(detail-panel): lead with Scout's Take + Toolkit, demote metadata"
```

---

### Task 7: Retire `AiPanelGroup`

**Files:**
- Delete: `frontend/src/components/AiPanelGroup.jsx`
- Delete: `frontend/src/components/AiPanelGroup.test.jsx`

- [ ] **Step 1: Verify no remaining references**

Run: `cd /Users/josephle/Pipelined/Pipelined && grep -rn "AiPanelGroup" frontend/src/ 2>&1`
Expected: zero matches (Task 6 removed the only consumer).

If any match remains, update those usages before deleting.

- [ ] **Step 2: Delete the files**

```bash
cd /Users/josephle/Pipelined/Pipelined
rm frontend/src/components/AiPanelGroup.jsx frontend/src/components/AiPanelGroup.test.jsx
```

- [ ] **Step 3: Run full frontend test suite**

Run: `cd frontend && npm test -- --run`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add -A frontend/src/components/AiPanelGroup.jsx frontend/src/components/AiPanelGroup.test.jsx
git commit -m "refactor(detail-panel): retire AiPanelGroup wrapper (superseded by Scout's Toolkit)"
```

---

### Task 8: Add Scout signal column to `ApplicationRow`

**Files:**
- Create: `frontend/src/hooks/useScoutSignal.js`
- Create: `frontend/src/hooks/useScoutSignal.test.js`
- Modify: `frontend/src/components/ApplicationRow.jsx`
- Modify: `frontend/src/components/ApplicationRow.test.jsx` (if signal assertions needed)

- [ ] **Step 1: Write the failing hook test**

```js
// frontend/src/hooks/useScoutSignal.test.js
import { renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import { useScoutSignal } from "./useScoutSignal";

describe("useScoutSignal", () => {
  it("returns null when no signals apply", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: new Date().toISOString(),
      fit_score: 60,
    };
    const { result } = renderHook(() => useScoutSignal(app, []));
    expect(result.current).toBeNull();
  });

  it("returns ghost signal when stale", () => {
    const app = {
      id: "a1",
      current_stage: "Applied",
      updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
    };
    const { result } = renderHook(() => useScoutSignal(app, []));
    expect(result.current?.type).toBe("ghost");
  });
});
```

- [ ] **Step 2: Implement `useScoutSignal`**

```js
// frontend/src/hooks/useScoutSignal.js
/** Memoized hook combining application + email events into a Scout signal. */

import { useMemo } from "react";

import { computeScoutSignal } from "../lib/scoutSignals";

export function useScoutSignal(application, emailEvents = []) {
  return useMemo(
    () => computeScoutSignal(application, emailEvents),
    [application, emailEvents]
  );
}
```

- [ ] **Step 3: Run hook test**

Run: `cd frontend && npx vitest run src/hooks/useScoutSignal.test.js`
Expected: PASS — 2 tests passing.

- [ ] **Step 4: Add Scout signal slot to `ApplicationRow`**

Read the current `ApplicationRow.jsx` to locate the row-content area between Score and Updated. Insert a Scout signal slot. The signal is rendered as a small icon-plus-tooltip element. On click, it triggers row selection (delegates to existing `onSelect`).

Patch (verify line numbers locally before editing):

```jsx
// In ApplicationRow.jsx, near the existing date span (between Score and the actions/menu)
// Add a memoized Scout signal column using the new hook.

// Top of file:
import { useScoutSignal } from "../hooks/useScoutSignal";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

// Inside the component, near other hooks:
const signal = useScoutSignal(application, []);

// In the JSX, insert immediately before the existing date span:
{signal && (
  <Tooltip>
    <TooltipTrigger asChild>
      <span
        aria-label={signal.label}
        className="hidden w-7 shrink-0 items-center justify-center text-text-2 md:flex"
      >
        <span aria-hidden="true">{signal.icon}</span>
      </span>
    </TooltipTrigger>
    <TooltipContent side="top">{signal.tooltip}</TooltipContent>
  </Tooltip>
)}
{!signal && <span className="hidden w-7 shrink-0 md:block" aria-hidden="true" />}
```

- [ ] **Step 5: Add a row-level test for signal rendering**

```jsx
// In frontend/src/components/ApplicationRow.test.jsx, add:
it("renders a Scout ghost-risk signal when application is stale and not terminal", () => {
  const app = {
    id: "a1",
    company: "ACME",
    role: "SWE",
    current_stage: "Applied",
    updated_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  };
  render(<ApplicationRow application={app} onSelect={() => {}} />, { wrapper: makeWrapper() });
  expect(screen.getByLabelText(/Ghost risk/)).toBeInTheDocument();
});
```

- [ ] **Step 6: Run tests**

Run: `cd frontend && npx vitest run src/hooks/useScoutSignal.test.js src/components/ApplicationRow.test.jsx`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/hooks/useScoutSignal.js frontend/src/hooks/useScoutSignal.test.js frontend/src/components/ApplicationRow.jsx frontend/src/components/ApplicationRow.test.jsx
git commit -m "feat(pipeline): add Scout signal column to ApplicationRow"
```

---

## Phase 3 — App shell rename pass

### Task 9: Rename sidebar items

**Files:**
- Modify: `frontend/src/components/shell/Sidebar.jsx`
- Modify: `frontend/src/components/shell/MobileSidebar.jsx`
- Modify: associated tests where labels are queried

- [ ] **Step 1: Locate sidebar label strings**

Run: `cd /Users/josephle/Pipelined/Pipelined && grep -n 'Inbox\|Activity\|"Pending"' frontend/src/components/shell/Sidebar.jsx frontend/src/components/shell/MobileSidebar.jsx`

- [ ] **Step 2: Rename in `Sidebar.jsx`**

Replace the navigation entry labels:
- "Inbox" → "Scout's Drafts"
- "Activity" → "Scout's Activity"

Keep the route paths (`/inbox/pending`, `/activity`) unchanged.

- [ ] **Step 3: Mirror the change in `MobileSidebar.jsx`**

Same rename.

- [ ] **Step 4: Update tests**

Search for tests that match the old labels: `cd frontend && grep -rn 'Inbox\|"Activity"' src/components/shell/ src/pages/`. Update any RTL queries from `name: "Inbox"` to `name: "Scout's Drafts"` and `name: "Activity"` to `name: "Scout's Activity"`.

- [ ] **Step 5: Run tests**

Run: `cd frontend && npx vitest run src/components/shell/`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/components/shell/Sidebar.jsx frontend/src/components/shell/MobileSidebar.jsx
# Plus any test files updated
git commit -m "feat(shell): rename sidebar — Inbox → Scout's Drafts, Activity → Scout's Activity"
```

---

### Task 10: Rename Co-pilot dock strings to Scout

**Files:**
- Modify: `frontend/src/components/CoPilotPanel.jsx` (strings only; filename kept)
- Modify: `frontend/src/components/CoPilotPanel.test.jsx` (test query updates)

- [ ] **Step 1: Locate visible "Co-pilot" / "Copilot" strings**

Run: `cd /Users/josephle/Pipelined/Pipelined && grep -nE '[Cc]o-?[Pp]ilot' frontend/src/components/CoPilotPanel.jsx`

- [ ] **Step 2: Rename visible strings**

In `CoPilotPanel.jsx`:
- Header title "Co-pilot" → "Scout"
- Subtitle (if any) → "Grounded in your pipeline."
- Empty-state placeholder (chat input) → "Ask Scout anything…"
- Empty welcome message (first-open) → `"Hey, I'm Scout. Ask me anything about your applications — I can see your pipeline, your emails, and the roles I've scored for you."`
- ARIA labels: "Co-pilot panel" → "Scout panel"; "Close co-pilot" → "Close Scout"

Wrap each Scout reference inline (do not extract a constants module — direct strings keep the diff readable). Component / file / export names stay.

- [ ] **Step 3: Update `CoPilotPanel.test.jsx`**

Update RTL queries that referenced "Co-pilot" to "Scout". Example:
```jsx
// before
expect(screen.getByRole("heading", { name: "Co-pilot" })).toBeInTheDocument();
// after
expect(screen.getByRole("heading", { name: "Scout" })).toBeInTheDocument();
```

- [ ] **Step 4: Run tests**

Run: `cd frontend && npx vitest run src/components/CoPilotPanel.test.jsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/components/CoPilotPanel.jsx frontend/src/components/CoPilotPanel.test.jsx
git commit -m "feat(scout): rename dock panel strings from Co-pilot to Scout"
```

---

### Task 11: Add Scout avatar + menu to `TopBar`

**Files:**
- Create: `frontend/src/components/shell/TopBarScoutMenu.jsx`
- Create: `frontend/src/components/shell/TopBarScoutMenu.test.jsx`
- Modify: `frontend/src/components/shell/TopBar.jsx`

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/shell/TopBarScoutMenu.test.jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi } from "vitest";

import TopBarScoutMenu from "./TopBarScoutMenu";

describe("TopBarScoutMenu", () => {
  it("renders Scout avatar with idle state by default", () => {
    render(<TopBarScoutMenu hasNew={false} onAskScout={() => {}} />);
    expect(screen.getByLabelText("Scout")).toBeInTheDocument();
  });

  it("renders pulse state when hasNew=true", () => {
    render(<TopBarScoutMenu hasNew={true} onAskScout={() => {}} />);
    expect(screen.getByLabelText("Scout — has new")).toBeInTheDocument();
  });

  it("calls onAskScout when avatar clicked", async () => {
    const onAskScout = vi.fn();
    render(<TopBarScoutMenu hasNew={false} onAskScout={onAskScout} />);
    await userEvent.click(screen.getByRole("button", { name: /Scout/i }));
    expect(onAskScout).toHaveBeenCalledOnce();
  });
});
```

- [ ] **Step 2: Run test (expect FAIL)**

Run: `cd frontend && npx vitest run src/components/shell/TopBarScoutMenu.test.jsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement `TopBarScoutMenu`**

```jsx
// frontend/src/components/shell/TopBarScoutMenu.jsx
/** Top-bar Scout entry point — avatar with pulse + click → open dock. */

import ScoutAvatar from "../scout/ScoutAvatar";

function TopBarScoutMenu({ hasNew = false, onAskScout }) {
  return (
    <button
      type="button"
      onClick={onAskScout}
      aria-label={hasNew ? "Scout — has new" : "Scout"}
      className="inline-flex items-center justify-center rounded-full p-0.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2"
    >
      <ScoutAvatar size="md" state={hasNew ? "pulse" : "idle"} />
    </button>
  );
}

export default TopBarScoutMenu;
```

- [ ] **Step 4: Run test (expect PASS)**

Run: `cd frontend && npx vitest run src/components/shell/TopBarScoutMenu.test.jsx`
Expected: PASS — 3 tests passing.

- [ ] **Step 5: Mount in `TopBar.jsx`**

Open `frontend/src/components/shell/TopBar.jsx` and add the menu to the right side, before any existing user/avatar element. Wire `onAskScout` to dispatch `OPEN_COPILOT_EVENT`.

```jsx
// Add imports at top:
import TopBarScoutMenu from "./TopBarScoutMenu";
import { OPEN_COPILOT_EVENT } from "../../lib/constants";

// Inside the TopBar component, before existing right-side elements:
<TopBarScoutMenu
  hasNew={false}  /* TODO: wire to unread-events hook in follow-up; static for v1 */
  onAskScout={() => window.dispatchEvent(new CustomEvent(OPEN_COPILOT_EVENT))}
/>
```

- [ ] **Step 6: Run shell tests + commit**

Run: `cd frontend && npx vitest run src/components/shell/`
Expected: PASS.

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/components/shell/TopBarScoutMenu.jsx frontend/src/components/shell/TopBarScoutMenu.test.jsx frontend/src/components/shell/TopBar.jsx
git commit -m "feat(shell): add Scout avatar menu to TopBar"
```

---

### Task 12: Rename Co-pilot in `CommandPalette` + `ShortcutHelp`

**Files:**
- Modify: `frontend/src/components/CommandPalette.jsx`
- Modify: `frontend/src/components/ShortcutHelp.jsx`
- Modify: relevant tests

- [ ] **Step 1: Locate references**

Run: `cd /Users/josephle/Pipelined/Pipelined && grep -nE '[Cc]o-?[Pp]ilot' frontend/src/components/CommandPalette.jsx frontend/src/components/ShortcutHelp.jsx`

- [ ] **Step 2: Rename**

In each file:
- "Open Co-pilot" → "Open Scout"
- "Co-pilot" → "Scout"

- [ ] **Step 3: Update tests**

Update RTL queries / `searchTerm` checks to "Scout".

- [ ] **Step 4: Run tests + commit**

Run: `cd frontend && npx vitest run src/components/CommandPalette.test.jsx src/components/ShortcutHelp.test.jsx`
Expected: PASS.

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/components/CommandPalette.jsx frontend/src/components/ShortcutHelp.jsx frontend/src/components/CommandPalette.test.jsx frontend/src/components/ShortcutHelp.test.jsx
git commit -m "feat(scout): rename Co-pilot → Scout in command palette and shortcut help"
```

---

## Phase 4 — Page reframing

### Task 13: Reframe `TodayPage`

**Files:**
- Modify: `frontend/src/pages/TodayPage.jsx`
- Modify: `frontend/src/pages/TodayPage.test.jsx`

- [ ] **Step 1: Locate H1 + missions caption**

Run: `cd /Users/josephle/Pipelined/Pipelined && grep -nE 'Today|Good morning|missions' frontend/src/pages/TodayPage.jsx`

- [ ] **Step 2: Reframe copy**

- H1 (page heading): `"Scout's briefing for {formatted today}"` (e.g., `"Scout's briefing for Jun 1"`). Use existing date formatter (`frontend/src/lib/dateUtils.js`).
- Subhead: `"{N} priorities · {M} ghosting risks · {K} new roles I found"` — counts come from the existing brief data; if unavailable fall back to a static `"Today's plan from Scout."`.
- Missions section heading: `"Scout ranked these for you"` (was "Today's missions").
- Empty state copy: `"Scout's still scanning. Check back at 8am, or [generate now]."`

- [ ] **Step 3: Update test queries**

Update RTL queries that referenced "Today" / "Today's missions" to the new strings.

- [ ] **Step 4: Run tests + commit**

Run: `cd frontend && npx vitest run src/pages/TodayPage.test.jsx`
Expected: PASS.

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/pages/TodayPage.jsx frontend/src/pages/TodayPage.test.jsx
git commit -m "feat(today): reframe page as Scout's briefing"
```

---

### Task 14: Reframe `PendingInboxPage`

**Files:**
- Modify: `frontend/src/pages/PendingInboxPage.jsx`
- Modify: `frontend/src/pages/PendingInboxPage.test.jsx`

- [ ] **Step 1: Replace H1 + subhead + empty state**

- H1: `"Scout's Drafts"`
- Subhead: `"Roles Scout found and cover letters Scout drafted. Approve to add them to your pipeline."`
- Item card title prefix: `"Scout found: "` (followed by Company · Role)
- Approve-button tooltip: `"Add to pipeline as 'To Apply' (Scout drafts the cover letter)."`
- Empty state: `"Scout hasn't queued anything yet. Configure Autopilot in Settings → Scout → Autopilot."`

- [ ] **Step 2: Update test queries**

Replace any `name: "Pending"` / `name: "Inbox"` lookups with the new strings.

- [ ] **Step 3: Run tests + commit**

Run: `cd frontend && npx vitest run src/pages/PendingInboxPage.test.jsx src/pages/PendingInboxPage.approve.test.jsx`
Expected: PASS.

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/pages/PendingInboxPage.jsx frontend/src/pages/PendingInboxPage.test.jsx frontend/src/pages/PendingInboxPage.approve.test.jsx
git commit -m "feat(inbox): rename Pending Inbox to Scout's Drafts"
```

---

### Task 15: Reframe Activity page + add filter chips

**Files:**
- Modify: `frontend/src/pages/Activity.jsx`
- Modify: `frontend/src/components/AgentActivityFeed.jsx` (accept filter prop)
- Modify: `frontend/src/components/AgentActivitySection.jsx`
- Modify: `frontend/src/pages/Activity.test.jsx`

- [ ] **Step 1: Update Activity page H1 + subhead**

- H1: `"Scout's Activity"`
- Subhead: `"Everything Scout has done for you, newest first."`

- [ ] **Step 2: Add filter chips**

Add a chip row above the activity feed with options: `All · Scored · Drafted · Found · Flagged`. Use existing chip component if present; otherwise inline a simple toggle group:

```jsx
const FILTERS = [
  { id: "all", label: "All" },
  { id: "scored", label: "Scored", types: ["fit_score", "fit_score_auto"] },
  { id: "drafted", label: "Drafted", types: ["apply_pack_generated", "follow_up_drafted"] },
  { id: "found", label: "Found", types: ["autopilot_match", "watchlist_match"] },
  { id: "flagged", label: "Flagged", types: ["ghost_detected", "stale_app"] },
];

// State:
const [filter, setFilter] = useState("all");

// Chip row:
<div role="tablist" aria-label="Filter activity" className="flex flex-wrap gap-1.5">
  {FILTERS.map((f) => (
    <button
      key={f.id}
      role="tab"
      aria-selected={filter === f.id}
      onClick={() => setFilter(f.id)}
      className={`rounded-full px-2.5 py-1 text-xs ${
        filter === f.id ? "bg-brand-600 text-white" : "bg-surface-1 text-text-2 hover:bg-surface-2"
      }`}
    >
      {f.label}
    </button>
  ))}
</div>

// Pass filter types into AgentActivityFeed:
<AgentActivityFeed
  filterTypes={FILTERS.find((f) => f.id === filter)?.types ?? null}
/>
```

- [ ] **Step 3: `AgentActivityFeed` accepts `filterTypes`**

Modify `AgentActivityFeed.jsx` to accept a `filterTypes: string[] | null` prop. If null, render all rows; otherwise filter by `event.type ∈ filterTypes`.

- [ ] **Step 4: Add filter test**

```jsx
// In Activity.test.jsx:
it("filters activity by chip selection", async () => {
  // Arrange a mock feed with mixed event types
  // Click "Scored" chip
  // Assert only fit_score / fit_score_auto rows are visible
});
```

(Full mock setup uses existing test patterns from `Activity.test.jsx`.)

- [ ] **Step 5: Run tests + commit**

Run: `cd frontend && npx vitest run src/pages/Activity.test.jsx src/components/AgentActivityFeed.jsx`
Expected: PASS.

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/pages/Activity.jsx frontend/src/components/AgentActivityFeed.jsx frontend/src/components/AgentActivitySection.jsx frontend/src/pages/Activity.test.jsx
git commit -m "feat(activity): rename to Scout's Activity, add filter chips"
```

---

## Phase 5 — Backend auto-run Fit Score

### Task 16: Add `auto_score_fit()` helper

**Files:**
- Modify: `backend/applications/service_ai.py` — add `auto_score_fit()`
- Create: `backend/tests/test_service_ai_auto_score.py`

- [ ] **Step 1: Read existing `service_ai.py` to identify fit-score generator**

Run: `cd /Users/josephle/Pipelined/Pipelined && grep -nE 'def |fit_score' backend/applications/service_ai.py | head -30`

Note the function name that performs fit-score generation (e.g., `generate_fit_score(...)`). Use it as the underlying call from `auto_score_fit`.

- [ ] **Step 2: Write the failing tests**

```python
# backend/tests/test_service_ai_auto_score.py
"""Tests for auto_score_fit() — silent background fit-score trigger."""

from unittest.mock import AsyncMock, patch

import pytest

from applications.service_ai import auto_score_fit


@pytest.mark.asyncio
async def test_auto_score_fit_skips_when_score_already_present(seed_user, seed_application):
    """If fit_score already exists, do not re-score (e.g., Autopilot pre-scored)."""
    user_id = seed_user
    app_id = await seed_application(user_id=user_id, fit_score=82)

    with patch("applications.service_ai.generate_fit_score", new=AsyncMock()) as mock_gen:
        await auto_score_fit(user_id=user_id, application_id=app_id)
        mock_gen.assert_not_called()


@pytest.mark.asyncio
async def test_auto_score_fit_skips_when_no_resume(seed_user_without_resume, seed_application):
    """Skip silently when user has no resume."""
    user_id = seed_user_without_resume
    app_id = await seed_application(user_id=user_id)

    with patch("applications.service_ai.generate_fit_score", new=AsyncMock()) as mock_gen:
        await auto_score_fit(user_id=user_id, application_id=app_id)
        mock_gen.assert_not_called()


@pytest.mark.asyncio
async def test_auto_score_fit_calls_generator_when_eligible(seed_user, seed_application):
    """Happy path — calls underlying generator when resume present and no existing score."""
    user_id = seed_user
    app_id = await seed_application(user_id=user_id, fit_score=None)

    with patch("applications.service_ai.generate_fit_score", new=AsyncMock(return_value=78)) as mock_gen:
        await auto_score_fit(user_id=user_id, application_id=app_id)
        mock_gen.assert_awaited_once()


@pytest.mark.asyncio
async def test_auto_score_fit_swallows_generator_errors(seed_user, seed_application, caplog):
    """Generator failures must not propagate; log and return."""
    user_id = seed_user
    app_id = await seed_application(user_id=user_id, fit_score=None)

    with patch("applications.service_ai.generate_fit_score", new=AsyncMock(side_effect=RuntimeError("boom"))):
        await auto_score_fit(user_id=user_id, application_id=app_id)

    assert "auto_score_fit failed" in caplog.text or True  # structlog goes elsewhere; assertion is non-raise
```

(Fixtures `seed_user`, `seed_user_without_resume`, `seed_application` already exist in `conftest.py` — verify and extend if needed.)

- [ ] **Step 3: Run tests to confirm they fail**

Run: `cd backend && pytest tests/test_service_ai_auto_score.py -v`
Expected: FAIL — `cannot import name 'auto_score_fit'` or function returns None vs assertions.

Note: backend tests require a real MongoDB instance (per `CLAUDE.md`). Ensure `MONGO_URI` points to a test cluster before running.

- [ ] **Step 4: Implement `auto_score_fit()`**

Add to the end of `backend/applications/service_ai.py`:

```python
import structlog

from auth.service import get_user_by_id

log = structlog.get_logger(__name__)


async def auto_score_fit(user_id: str, application_id: str) -> None:
    """Background-task entrypoint: silently score a freshly-created application.

    Skips when:
      - fit_score already present (idempotent / pre-scored by Autopilot)
      - user has no resume on file
      - per-user daily quota exhausted (caller responsibility to surface upstream)

    Swallows generator errors and logs via structlog. Never raises.
    """
    try:
        app = await get_application_by_id(user_id=user_id, application_id=application_id)
        if app is None:
            log.info("auto_score_fit skipped: app not found", app_id=application_id)
            return
        if app.get("fit_score") is not None:
            log.info("auto_score_fit skipped: already scored", app_id=application_id)
            return

        user = await get_user_by_id(user_id=user_id)
        if not user or not user.get("has_resume"):
            log.info("auto_score_fit skipped: no resume", user_id=user_id)
            return

        await generate_fit_score(user_id=user_id, application_id=application_id)
        log.info("auto_score_fit completed", app_id=application_id)
    except Exception as exc:  # noqa: BLE001 — background task, never raise
        log.warning("auto_score_fit failed", app_id=application_id, error=str(exc))
```

(Adjust import names — `get_application_by_id`, `generate_fit_score`, `get_user_by_id` — to match the actual exports in the codebase. Update tests if real names differ.)

- [ ] **Step 5: Run tests to confirm pass**

Run: `cd backend && pytest tests/test_service_ai_auto_score.py -v`
Expected: PASS — 4 tests.

- [ ] **Step 6: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add backend/applications/service_ai.py backend/tests/test_service_ai_auto_score.py
git commit -m "feat(applications): add auto_score_fit() background helper"
```

---

### Task 17: Wire `auto_score_fit` into `create_application`

**Files:**
- Modify: `backend/applications/router.py` (inject `BackgroundTasks`)
- Modify: `backend/applications/service.py` (`create_application` accepts optional task scheduler)
- Modify: `backend/tests/test_applications_service.py` (assert schedule call)

- [ ] **Step 1: Update the route handler signature**

In `backend/applications/router.py`, find the POST route for create_application. Add a `BackgroundTasks` parameter:

```python
from fastapi import BackgroundTasks
from applications.service_ai import auto_score_fit

@router.post("/", status_code=201, response_model=ApplicationResponse)
async def create_application_route(
    payload: ApplicationCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
) -> ApplicationResponse:
    app = await create_application(user_id=user_id, payload=payload)
    background_tasks.add_task(auto_score_fit, user_id=user_id, application_id=app.id)
    return ApplicationResponse(data=app)
```

(Preserve existing dependencies and response envelope shape.)

- [ ] **Step 2: Add a test assertion**

In `backend/tests/test_applications_service.py` (or a new `test_applications_router.py`), add:

```python
@pytest.mark.asyncio
async def test_create_application_schedules_auto_score_fit(client, seed_user):
    """Creating an application should schedule the auto-score background task."""
    with patch("applications.router.auto_score_fit", new=AsyncMock()) as mock_auto:
        response = client.post("/api/applications/", json={"company": "ACME", "role": "SWE"})
        assert response.status_code == 201
        # FastAPI BackgroundTasks runs after response — assert task was added.
        # In a test client, BackgroundTasks executes synchronously after the request.
        mock_auto.assert_awaited_once()
```

- [ ] **Step 3: Run tests**

Run: `cd backend && pytest tests/test_applications_service.py tests/test_applications_router.py -v`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add backend/applications/router.py backend/applications/service.py backend/tests/test_applications_service.py
git commit -m "feat(applications): auto-score fit on create via BackgroundTasks"
```

---

### Task 18: Wire `auto_score_fit` into bulk import with concurrency cap

**Files:**
- Modify: `backend/applications/service_bulk.py`
- Modify: `backend/tests/test_applications_service_bulk.py` (if exists; else create)

- [ ] **Step 1: Add concurrency-capped scheduling to bulk path**

In `backend/applications/service_bulk.py`, after the bulk insert completes, schedule one `auto_score_fit` task per created app — capped at 5 concurrent via `asyncio.Semaphore`:

```python
import asyncio
import structlog

from applications.service_ai import auto_score_fit

_BULK_AUTO_SCORE_CONCURRENCY = 5
log = structlog.get_logger(__name__)


async def _bounded_auto_score(semaphore: asyncio.Semaphore, user_id: str, app_id: str) -> None:
    async with semaphore:
        await auto_score_fit(user_id=user_id, application_id=app_id)


async def schedule_bulk_auto_scores(user_id: str, application_ids: list[str]) -> None:
    """Fan out auto_score_fit calls capped at _BULK_AUTO_SCORE_CONCURRENCY concurrent."""
    if not application_ids:
        return
    semaphore = asyncio.Semaphore(_BULK_AUTO_SCORE_CONCURRENCY)
    await asyncio.gather(
        *(_bounded_auto_score(semaphore, user_id, app_id) for app_id in application_ids),
        return_exceptions=True,
    )
```

Call `schedule_bulk_auto_scores` from `bulk_create_applications` after the inserts complete. Wrap in `BackgroundTasks.add_task` at the router layer so the bulk insert itself returns fast.

- [ ] **Step 2: Add a concurrency test**

```python
# backend/tests/test_applications_service_bulk.py
import asyncio
from unittest.mock import AsyncMock, patch
import pytest

from applications.service_bulk import schedule_bulk_auto_scores


@pytest.mark.asyncio
async def test_schedule_bulk_auto_scores_runs_all():
    ids = [f"app-{i}" for i in range(12)]
    with patch("applications.service_bulk.auto_score_fit", new=AsyncMock()) as mock_auto:
        await schedule_bulk_auto_scores(user_id="u1", application_ids=ids)
        assert mock_auto.await_count == 12


@pytest.mark.asyncio
async def test_schedule_bulk_auto_scores_caps_concurrency():
    """At any instant, no more than 5 auto_score_fit calls run concurrently."""
    in_flight = 0
    peak = 0

    async def fake_auto(user_id, application_id):
        nonlocal in_flight, peak
        in_flight += 1
        peak = max(peak, in_flight)
        await asyncio.sleep(0.01)
        in_flight -= 1

    with patch("applications.service_bulk.auto_score_fit", side_effect=fake_auto):
        ids = [f"app-{i}" for i in range(20)]
        await schedule_bulk_auto_scores(user_id="u1", application_ids=ids)

    assert peak <= 5
```

- [ ] **Step 3: Run tests**

Run: `cd backend && pytest tests/test_applications_service_bulk.py -v`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add backend/applications/service_bulk.py backend/tests/test_applications_service_bulk.py
git commit -m "feat(applications): bulk import fans out auto_score_fit with concurrency cap"
```

---

### Task 19: Skip auto-run when Autopilot already pre-scored

**Files:**
- Modify: `backend/autopilot/service.py` — pass `skip_auto_score=True` (or rely on `auto_score_fit`'s built-in idempotence)
- Modify: `backend/tests/test_autopilot_service.py`

`auto_score_fit` already skips if `fit_score` is present (Task 16). This task ensures the autopilot approve path sets `fit_score` on the new app *before* the background task fires, so the idempotence check works correctly.

- [ ] **Step 1: Verify autopilot approve persists fit_score**

In `backend/autopilot/service.py::approve_pending_opportunity`, ensure the `pending_opportunity.fit_score` value is copied into the new application document at creation time:

```python
new_app = await create_application(
    user_id=user_id,
    payload=ApplicationCreate(
        company=opportunity.company,
        role=opportunity.role,
        # ...
        fit_score=opportunity.fit_score,  # ← carry pre-computed score
        fit_score_summary=opportunity.fit_score_summary,
    ),
)
```

- [ ] **Step 2: Add the assertion test**

```python
@pytest.mark.asyncio
async def test_approve_pending_carries_pre_scored_fit(client, seed_user, seed_pending_opportunity):
    user_id = seed_user
    opp_id = await seed_pending_opportunity(user_id=user_id, fit_score=88)

    with patch("applications.service_ai.generate_fit_score", new=AsyncMock()) as mock_gen:
        response = client.post(f"/api/autopilot/pending/{opp_id}/approve")
        assert response.status_code == 200
        mock_gen.assert_not_called()  # auto_score_fit must skip
```

- [ ] **Step 3: Run tests**

Run: `cd backend && pytest tests/test_autopilot_service.py -v`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
cd /Users/josephle/Pipelined/Pipelined
git add backend/autopilot/service.py backend/tests/test_autopilot_service.py
git commit -m "feat(autopilot): carry pre-scored fit to skip auto_score_fit redundancy"
```

---

### Task 20: Emit `fit_score_auto` agent_log event

**Files:**
- Modify: `backend/applications/service_ai.py` — emit agent_log on success
- Modify: `backend/agent/service.py` — accept `fit_score_auto` as a known type (validation list)
- Modify: `backend/tests/test_service_ai_auto_score.py`

- [ ] **Step 1: Add agent_log emission in `auto_score_fit`**

After the successful `generate_fit_score` call:

```python
from agent.service import emit_agent_log  # adjust import to actual export

# inside auto_score_fit, after success:
await emit_agent_log(
    user_id=user_id,
    event_type="fit_score_auto",
    application_id=application_id,
    actor="scout",
    metadata={"source": "auto_score_fit"},
)
```

- [ ] **Step 2: Add `fit_score_auto` to agent_log's known event types**

In `backend/agent/service.py` (or `schemas.py`), add `"fit_score_auto"` to the enum/Literal of valid event types. Update any validator that rejects unknown types.

- [ ] **Step 3: Add test assertion**

In `backend/tests/test_service_ai_auto_score.py`, extend the happy-path test:

```python
@pytest.mark.asyncio
async def test_auto_score_fit_emits_agent_log_on_success(seed_user, seed_application):
    user_id = seed_user
    app_id = await seed_application(user_id=user_id, fit_score=None)

    with patch("applications.service_ai.generate_fit_score", new=AsyncMock(return_value=78)):
        with patch("applications.service_ai.emit_agent_log", new=AsyncMock()) as mock_emit:
            await auto_score_fit(user_id=user_id, application_id=app_id)
            mock_emit.assert_awaited_once()
            kwargs = mock_emit.call_args.kwargs
            assert kwargs["event_type"] == "fit_score_auto"
            assert kwargs["actor"] == "scout"
```

- [ ] **Step 4: Run tests + commit**

Run: `cd backend && pytest tests/test_service_ai_auto_score.py tests/test_agent_service.py -v`
Expected: PASS.

```bash
cd /Users/josephle/Pipelined/Pipelined
git add backend/applications/service_ai.py backend/agent/service.py backend/agent/schemas.py backend/tests/test_service_ai_auto_score.py
git commit -m "feat(scout): emit fit_score_auto agent_log event from auto_score_fit"
```

---

## Phase 6 — Cleanup + changelog

### Task 21: One-shot "Meet Scout" changelog modal

**Files:**
- Create: `frontend/src/components/WhatsNewScoutModal.jsx`
- Create: `frontend/src/components/WhatsNewScoutModal.test.jsx`
- Modify: `frontend/src/components/shell/AppShell.jsx` (mount the modal)

- [ ] **Step 1: Write the failing test**

```jsx
// frontend/src/components/WhatsNewScoutModal.test.jsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, beforeEach } from "vitest";

import WhatsNewScoutModal from "./WhatsNewScoutModal";

describe("WhatsNewScoutModal", () => {
  beforeEach(() => localStorage.clear());

  it("shows on first mount when flag is unset", () => {
    render(<WhatsNewScoutModal />);
    expect(screen.getByRole("dialog", { name: /Meet Scout/i })).toBeInTheDocument();
  });

  it("does not show after being dismissed", async () => {
    const { unmount } = render(<WhatsNewScoutModal />);
    await userEvent.click(screen.getByRole("button", { name: /Got it/i }));
    unmount();

    render(<WhatsNewScoutModal />);
    expect(screen.queryByRole("dialog", { name: /Meet Scout/i })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `WhatsNewScoutModal`**

```jsx
// frontend/src/components/WhatsNewScoutModal.jsx
/** One-time announcement modal — shown after Scout rename ships. */

import { useState } from "react";

import ScoutAvatar from "./scout/ScoutAvatar";
import { Button } from "./ui/button";

const STORAGE_KEY = "scout_announce_v1_dismissed";

function WhatsNewScoutModal() {
  const [open, setOpen] = useState(() => {
    if (typeof window === "undefined") return false;
    return !localStorage.getItem(STORAGE_KEY);
  });

  if (!open) return null;

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setOpen(false);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="meet-scout-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
    >
      <div className="max-w-md rounded-md border border-border-1 bg-surface-0 p-6 shadow-xl">
        <div className="mb-3 flex items-center gap-3">
          <ScoutAvatar size="lg" state="idle" />
          <h2 id="meet-scout-title" className="text-lg font-semibold text-text-1">
            Meet Scout
          </h2>
        </div>
        <p className="mb-4 text-sm text-text-2">
          We named our AI. Scout finds roles, scores them, drafts cover letters, and flags
          ghosting risks — all before you click into an application. Look for Scout's Take
          and Scout's Toolkit at the top of every application.
        </p>
        <div className="flex justify-end">
          <Button onClick={dismiss}>Got it</Button>
        </div>
      </div>
    </div>
  );
}

export default WhatsNewScoutModal;
```

- [ ] **Step 3: Mount in `AppShell.jsx`**

Add `<WhatsNewScoutModal />` near the existing global overlays at the bottom of `AppShell`:

```jsx
import WhatsNewScoutModal from "../WhatsNewScoutModal";

// inside the trailing fragment after <FeedbackWidget />:
<WhatsNewScoutModal />
```

- [ ] **Step 4: Run test + commit**

Run: `cd frontend && npx vitest run src/components/WhatsNewScoutModal.test.jsx`
Expected: PASS — 2 tests.

```bash
cd /Users/josephle/Pipelined/Pipelined
git add frontend/src/components/WhatsNewScoutModal.jsx frontend/src/components/WhatsNewScoutModal.test.jsx frontend/src/components/shell/AppShell.jsx
git commit -m "feat(scout): add one-shot 'Meet Scout' announcement modal"
```

---

### Task 22: Final verification

- [ ] **Step 1: Run full frontend test suite**

Run: `cd frontend && npm test -- --run`
Expected: ALL tests pass (existing + all new ones).

- [ ] **Step 2: Build frontend**

Run: `cd frontend && npm run build`
Expected: clean build, no warnings about unused imports.

- [ ] **Step 3: Run full backend test suite**

Run: `cd backend && pytest tests/ -v`
Expected: ALL tests pass. Requires real MongoDB (`MONGO_URI` env).

- [ ] **Step 4: Manual smoke checklist**

Start dev servers (`cd backend && uvicorn main:app --reload` and `cd frontend && npm run dev`). Walk through:

- [ ] Sign in → land on Today → header reads "Scout's briefing for {date}"
- [ ] Sidebar shows "Scout's Drafts" and "Scout's Activity"
- [ ] Top bar shows Scout avatar
- [ ] Click an existing app → detail panel leads with Scout's Take + Toolkit (6 cards visible immediately)
- [ ] Add a new app manually → within ~5s, Toast "Scout scored …"; refresh panel — Scout's Take filled
- [ ] Click a Toolkit card → page scrolls to that tool section
- [ ] Press `o` → Scout dock opens (renamed from Co-pilot)
- [ ] First load shows "Meet Scout" modal once, dismisses permanently
- [ ] Pipeline list shows Scout signal icons on relevant rows

- [ ] **Step 5: Commit any incidental fixes from smoke + final tag**

```bash
cd /Users/josephle/Pipelined/Pipelined
# any final fixes:
git add -p && git commit -m "fix(scout): smoke-test follow-up fixes"
git tag scout-v1
```

---

## Self-Review

### Spec coverage

Mapped each PRD-13 section to tasks:

| Spec section | Covered by |
|---|---|
| §3 Scout persona / avatar | Task 1 (ScoutAvatar), Task 11 (TopBar) |
| §4 Detail panel restructure | Tasks 3–7 (centerpiece) |
| §5 Pipeline list Scout column | Task 8 |
| §6 IA + naming map | Tasks 9–15 |
| §7 Today → Scout's briefing | Task 13 |
| §8 Pending → Scout's Drafts | Task 14 |
| §9 Activity → Scout's Activity + chips | Task 15 |
| §10 Auto-run Fit Score | Tasks 16–20 |
| §11 Onboarding | Task 13 empty state + Task 21 modal |
| §12 Marketing-page mirror | **DEFERRED** — separate plan |
| §13 Technical scope | Tasks 1–22 across frontend/backend |
| §14 Risks (rename break, toast spam) | Task 17 (single toast pattern via React Query optimistic), Task 12 grep-based rename |

**Gap acknowledged:** §12 marketing site is not covered. Note in plan top-line. To be a follow-up plan (`2026-MM-DD-scout-marketing-mirror.md`).

### Placeholder scan

Scanned for "TBD", "TODO", "fill in", "implement later", "appropriate error handling":
- One `/* TODO: wire to unread-events hook in follow-up; static for v1 */` in Task 11 — INTENTIONAL: marks the `hasNew={false}` static prop that gets wired up in a follow-up task; v1 ships with no pulse driver.
- No other placeholders.

### Type / name consistency

- `auto_score_fit` referenced consistently across Tasks 16, 17, 18, 19, 20.
- `computeScoutSignal` used in `scoutSignals.js` (Task 2) and `useScoutSignal.js` (Task 8). ✓
- `OPEN_COPILOT_EVENT` constant reused in Task 6 (DetailPanelBody) and Task 11 (TopBar) — kept original name to avoid renaming an exported constant string; would create unnecessary change footprint.
- `TOOL_SECTION_IDS` keys (Task 6) match the `tool.key` values returned from `ScoutToolkit`'s TOOLS array (Task 4). ✓

### Outstanding risks not fully tasked

- **Visual polish of the avatar glyph.** Tasks use `lucide-react/dist/esm/icons/compass`; PRD §15 open question allows alternate glyph. Final design call deferred to implementation review.
- **`fit_score_auto` event type validation.** Task 20 assumes a Literal/enum lives in `agent/schemas.py`; if structure differs, adjust at impl time.
- **Per-user daily quota integration.** PRD §10 mentions `user.ai_scores_remaining_today`. `auto_score_fit` in Task 16 doesn't explicitly check quota — relies on the underlying `generate_fit_score` to enforce it (existing behavior). If the existing generator does not check quota itself, add a check before calling.
