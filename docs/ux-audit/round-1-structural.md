# Pipelined UX Audit — Round 1: Structural / Copy / IA

**Date:** 2026-05-30
**Scope:** Static surface audit — labels, copy, information architecture, visual hierarchy, consistency. **Does NOT cover** whether interactions actually work (see round-2 for that).
**Method:** Five parallel exploration agents, each auditing a different surface (~285 components, ~25 pages).

---

## Top 10 Critical / High-Severity Findings

| # | Issue | Surface | Severity |
|---|-------|---------|----------|
| 1 | 4 settings sections are routable but invisible in nav: `/settings/account` (password reset + delete account), `/settings/sharing`, `/settings/reports`, `/settings/agent-activity`. Users cannot reset their password from the UI. | Settings | **Critical** |
| 2 | "Notifications" appears twice in nav (under ACCOUNT and AGENTS) and both route to the *same component*. `/settings/agent-notifications` and `/settings/notifications` are duplicates. | Settings | **Critical** |
| 3 | "Approve" button in Pending Inbox is a lie: button says "Approve" but actually creates a "To Apply" pipeline entry; nothing is sent or applied. Violates product-policy transparency. (`PendingOpportunityCard.jsx:234`) | Autopilot | **Critical** |
| 4 | Landing page promises "on autopilot" but product policy is explicitly *no auto-apply, no auto-send*. Marketing copy contradicts product reality. (`HeroSection.jsx:144`) | Marketing | **High** |
| 5 | Login error "Incorrect email or password" can't be self-corrected — same message whether email format is wrong, account doesn't exist, or password is wrong. (`useLoginForm.js:40`) | Auth | **High** |
| 6 | Onboarding "Install Chrome extension" marks complete on click, not install — users dismiss the checklist without actually installing. (`OnboardingChecklist.jsx:158-161`) | Onboarding | **High** |
| 7 | Sidebar has both "Today" and "Dashboard" with no labeling cue that Today is *home* and Dashboard is *the application table*. (`Sidebar.jsx:28,30`) | Nav | **High** |
| 8 | Auto-redirect on success in 2s for ResetPassword + VerifyEmailConfirm — screen readers can't keep up, no user control. | Auth | **High** |
| 9 | No timestamps on cached AI output (Fit Score, Interview Prep, Apply Pack). Users have no idea if the analysis is from today or 6 weeks ago. | AI | **High** |
| 10 | Three different stale-app indicators on one row (pulsing dot + clock icon + bell icon) — redundant and confusing. (`ApplicationRow.jsx:100-210`) | Pipeline | **High** |

---

## Surface-by-Surface

### Settings (the worst offender — needs structural rework)

- **Navigation is incomplete.** 4 sections invisible. Password reset is undiscoverable.
- **Duplicate Notifications entries** route to the same component.
- **Section names use product jargon** with zero explanation: "Autopilot", "Watchlist", "Agent profile", "Agent activity", "Apply pack", "Fit score", "Co-pilot memory".
- **Save patterns wildly inconsistent**: Profile uses explicit Save/Cancel, Notifications auto-saves on toggle, Appearance persists immediately to localStorage with no feedback, Autopilot has a save button at the bottom. Same page, four patterns.
- **Timezone exists in both Profile and Notifications** with no indication they're the same setting.
- **"Resume & AI" section** is just resume upload — no AI settings. Misnamed.
- **GitHub integration is a placeholder** ("Full integration UI ships in a later iteration") with no "coming soon" badge.
- **Plan & usage** shows a disabled "Upgrade" button labeled "Coming soon" — looks like an account problem.
- **Destructive actions (delete account, delete resume)** are low-contrast outline buttons with no escalation pattern.

### Core pipeline (Dashboard, list, detail panel, add)

- **Three different stale indicators** (#10).
- **Archive vs Delete distinction not explained** anywhere; Archive lives in both hover quick-actions AND row menu — users don't know they're the same.
- **Bulk action bar verbs are vague**: "Move", "Apply", "Merge" — Apply doesn't apply to jobs, it applies *changes*. Merge silently appears only when exactly 2 rows are selected.
- **Filter dropdowns don't show active state on the trigger** — must open each one to see what's filtered.
- **"Saved Searches"** is actually saved *filter state*, not text search.
- **Keyboard shortcuts (A, /, Cmd+Enter, "g d", etc.) are invisible** to users unless they read source.
- **CSV import wizard step indicator doesn't label steps**; "Next" disabled state has no tooltip explaining why.
- **Notes "Discard" button on close** has no undo path.

### Agentic / AI features

- **No source attribution anywhere.** Fit Score, Interview Prep, Apply Pack, Co-pilot — users never see "this was based on your resume + JD" or "data from Glassdoor as of X".
- **No freshness indicator** on cached output.
- **"Resume Insights" section title is misleading** — the input is a job description; the resume isn't editable. Should be "Job Match Analysis". (`ResumeInsightsSection.jsx:37`)
- **Disclosure patterns are inconsistent across cards**: Morning Brief collapsed-by-default, Pending Inbox sub-panels closed-by-default, Job Recommendations always open, Interview Prep uses tabs, Fit "Why?" is a toggle. Five patterns for the same job.
- **"No auto-send/no auto-apply" messaging is scattered** across 4 different phrasings in different surfaces.
- **Fit Badge** has no legend — what does 65% vs 45% mean?
- **Co-pilot tagline "Grounded in your pipeline"** is jargon. What data did it use?

### Global chrome (sidebar, topbar, command palette, banners)

- **"Open Co-pilot"** is buried in the Account group of the sidebar — top-tier AI feature, bottom-of-nav placement.
- **Command palette section headers** (`text-[0.6875rem]`) are nearly invisible. Quick actions look like nav rows.
- **Mobile search button labeled "⌘K"** — users with no Cmd key.
- **Theme toggle has no tooltip**; Sun-icon-for-dark-mode is counterintuitive.
- **Calendar grid shows event dots but no count number** on day cells.
- **Calendar "Previous/Next month" buttons are chevron-only** — no month label.
- **NotificationBell**: title and body both `truncate` to one line with no expansion; badge caps at "9+" with no real count.
- **Keyboard shortcuts file has conflicting/duplicate definitions** for `a` and Escape across scopes. (`shortcuts.js:36-47`)
- **Multiple top banners can stack** (NPS + email verification + offline) with no z-index strategy.

### Analytics & Calendar

- **Charts lack axis labels and units.**
- **KPI "Avg response" delta is always null** — hard-coded. Tile shows "N/A" forever. (`Analytics.jsx:60-65`)
- **"Reply rate" calculation isn't explained** anywhere on the page.
- **Stage funnel doesn't show conversion percentages**, only counts.
- **Calendar events don't show which company they belong to** in the grid view.
- **Event form** lets you create events in the past with no validation.

### Auth, onboarding, public

- **Onboarding step order is wrong.** "Verify email" first (passive, no value) instead of "Save your first application" (active, immediate value).
- **Goal-detection bug**: `user?.weekly_goal > 0` means a goal of 0 never marks the step complete. (`OnboardingChecklist.jsx:114`)
- **Email verification banner says "to continue"** — but verification isn't actually required.
- **Email mask `jo***@example.com`** shows the domain but hides the local part — won't catch typos in your address.
- **"Demo coming soon" button** on landing — clicking opens a modal that says it's coming soon. Promise-and-fail.
- **Public share pages don't show "what's visible vs hidden"** — no privacy clarity for sharers.
- **GitHub callback error states redirect to `/login?error=...`** but Login doesn't read the param. Silent failures.

---

## Cross-Cutting Patterns

1. **Jargon leaking from product code into UI.** "Autopilot", "Watchlist", "Agent", "Mission", "Apply Pack", "Fit Score", "Co-pilot", "Pending Opportunity" — all undefined in the UI itself.
2. **Inconsistent save semantics.** Explicit save, auto-save, immediate-persist all coexist.
3. **Inconsistent disclosure patterns** for similar content (always open / collapsed / tabbed).
4. **No source attribution / freshness** anywhere AI output appears.
5. **Action verbs don't match action consequences.** "Approve" creates a draft. "Apply" modifies a selection. "Archive" hides recoverably (but isn't explained).
6. **Empty states teach nothing.** Users in empty states have no next-step CTA.
7. **Mobile/desktop action parity broken.** Swipe-only on mobile, hover-only on desktop, with no menu fallback for the same action.
8. **Keyboard shortcuts exist but are invisible.**
9. **Terminology drift**: Application / Job / Opportunity used interchangeably.
10. **Help text is either missing or generic.**

---

## What Round 1 Did NOT Cover

This audit was a **static / structural** read. It did **not** test:
- Whether buttons actually do what they claim
- Whether handlers complete or silently fail
- Whether mutations persist
- Whether errors are surfaced or swallowed
- Whether loading states actually appear
- Whether double-clicks, race conditions, or quota limits are handled
- Whether "broken on certain accounts" bugs exist (e.g., generate-report failing without feedback)

Round 2 covers that.
