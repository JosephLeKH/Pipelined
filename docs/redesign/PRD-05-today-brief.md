# PRD-05 — Today, Morning Brief & Onboarding

**Status:** Ready (blocked on PRD-00, PRD-01, PRD-04)
**Depends on:** PRD-00 (tokens), PRD-01 (AppShell), PRD-04 (stage tokens, FitBadge, AppRow row patterns)
**Estimated effort:** 1 agent session (~3 hours)

---

## 0. Required research (read before writing code)

Fresh agents — **before touching any file in this PRD**, read these sources to internalize Linear's design philosophy. The PRD describes *what*; these explain *why*, which is what you need for edge cases.

| Source | What to extract |
|--------|-----------------|
| `linear.app/method` | Linear's design + engineering principles essays. Read every essay listed. |
| `linear.app/blog` | Posts on typography, motion, color, density, icons, craft. Search: `design system`, `typography`, `motion`, `icon`. |
| `linear.app/` (live home) | Current visual language — top nav height, section rhythm, hover states, scroll cadence. Inspect element to read computed styles. |
| `linear.app/customers` | Card composition + quote treatment (when this PRD touches testimonial UI). |
| `linear.app/now` | Changelog format + copy voice (when this PRD touches changelog UI). |
| `windframe.dev/styles/linear` | Token extraction — Inter Variable, `tracking-[-0.022em]`, `h-8`/`h-10` buttons, 8–10 px radius, `bg-white/80 backdrop-blur-[20px]` nav. Cross-check against `linear.app` for anything material. |

**Rules:**
1. If this PRD's spec contradicts a Linear principle from the above, **prefer the principle** and flag the conflict in the PR description.
2. Stanford Cardinal Red `#8C1515` (and Cardinal hover/pressed variants) is the **only** color override of Linear's tokens. Every other Linear principle — typography, density, motion, layout — stands.
3. Cite at least one source URL in the PR description: `Followed Linear's [principle] from [URL] §[section]`.
4. Don't skim. Linear's writing is short and dense. Read it.

See [`LINEAR-RESEARCH.md`](./LINEAR-RESEARCH.md) for the deeper brief.

---

## 1. Why this exists

`/today` is the default landing page after login. It is **mission control** — a single-column page that ranks what to do right now. Current design is a column of differently-styled cards that read inconsistently. Linear's Inbox view is the visual model: a tight vertical list of items with strong typographic hierarchy and a quiet header.

The Morning Brief page (`/brief` → redirects to `/today` already, plus `/today` shows a "Morning Brief" history drawer) and the Onboarding Checklist live on the same page surface.

---

## 2. Sources to read first

- Linear's Inbox view (`linear.app/[workspace]/inbox`).
- Existing:
  - `frontend/src/pages/TodayPage.jsx`
  - `frontend/src/pages/MorningBriefPage.jsx`
  - `frontend/src/components/MissionCard.jsx`
  - `frontend/src/components/MissionPriorityPill.jsx`
  - `frontend/src/components/MissionProgressStrip.jsx`
  - `frontend/src/components/MorningBriefSectionCard.jsx`
  - `frontend/src/components/MorningBriefSkeleton.jsx`
  - `frontend/src/components/MorningBriefHistoryPanel.jsx`
  - `frontend/src/components/DigestSection.jsx`
  - `frontend/src/components/WeeklyGoalSection.jsx`
  - `frontend/src/components/WeeklyReviewSection.jsx`
  - `frontend/src/components/OnboardingChecklist.jsx`

---

## 3. Page composition

```
┌─────────────────────────────────────────────────────────────┐
│ Top header (44px from PRD-01) — title "Today"              │
├─────────────────────────────────────────────────────────────┤
│  Wednesday, May 25 · 5 missions                             │
│  Good morning, Joseph.                                      │ ← display-md 28 px
│                                                             │
│  ┌─ Weekly goal ───────────────────────────────────────────┐│
│  │ 5 / 10 applications this week    ████████░░░░░░░░       ││
│  │ 2 days left · tap to set goal                           ││
│  └────────────────────────────────────────────────────────-┘│
│                                                             │
│  ── Today's missions ──                                     │
│  ●  Follow up with Anthropic recruiter      ✓  ⌛  ⋯         │
│  ●  Prep for Stripe technical (in 18h)      ✓  ⌛  ⋯         │
│  ●  Apply to Vercel DX intern (closes today)✓  ⌛  ⋯         │
│  ●  Add OA result for Linear                ✓  ⌛  ⋯         │
│  ●  Review pending opportunities (3)        ✓  ⌛  ⋯         │
│                                                             │
│  ── Morning brief · 8:00 AM ──                              │
│  [collapsed → tap to read; expanded → DigestSection]        │
│                                                             │
│  ── This week's review ──                                   │
│  Read your Sunday review →                                  │
└─────────────────────────────────────────────────────────────┘
```

Container: `max-w-2xl` (672 px) centered. Mobile: full-width with 16 px padding.

---

## 4. Greeting + date row

```jsx
<header className="pt-8 pb-6">
  <p className="text-xs font-medium uppercase tracking-wider text-text-3">
    {weekday}, {monthDay} · {missionCount} missions
  </p>
  <h1 className="mt-2 text-3xl font-semibold tracking-tight text-text-1">
    Good {timeOfDay}, {firstName}.
  </h1>
</header>
```

Time-of-day logic: < 12 morning, 12–18 afternoon, 18+ evening. Reuse existing helper if present.

---

## 5. Mission row

The biggest change. Today's MissionCard is a tall card (~120 px). New row is **single-line** with optional expand:

```jsx
<li className="group flex items-center gap-3 border-b border-border-1 px-3 py-3 hover:bg-surface-1">
  <span className="h-1.5 w-1.5 rounded-full" style={{ background: priorityColor }} />
  <div className="min-w-0 flex-1">
    <p className="text-sm text-text-1">{mission.title}</p>
    <p className="text-xs text-text-3 mt-0.5">
      {mission.subtitle}  {dueLabel ? ` · ${dueLabel}` : ""}
    </p>
  </div>
  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100">
    <Button size="sm" variant="ghost" onClick={onComplete} aria-label="Complete"><Check/></Button>
    <Button size="sm" variant="ghost" onClick={onSnooze} aria-label="Snooze"><Clock/></Button>
    <RowMenu onOpen={openApp} onSkip={onSkip} />
  </div>
</li>
```

### Priority dot color

| Priority | Color token |
|----------|------------|
| Urgent | `--brand-600` Cardinal |
| High | `--status-orange` |
| Medium | `--status-warn` (amber) |
| Low | `--status-neutral` |

`MissionPriorityPill.jsx` becomes a small inline `<span className="rounded-sm bg-surface-1 px-1.5 py-0.5 text-[11px] text-text-2">{label}</span>` displayed inline with subtitle for the top 3 priorities only.

### Mission tap

Tap (anywhere except action buttons) → open the related application's DetailPanel (if linked) or navigate to the relevant page. Existing behavior.

### Completed missions

Strikethrough on title, `text-text-3` everywhere, animate to `opacity-50` and slide down to a collapsed "Completed (3)" group at the bottom.

### Empty state

If 0 missions:
```
              ✓  (Cardinal check icon)

          You're caught up.
   No missions ranked for today. Enjoy the breather.
```

---

## 6. Weekly goal block

Re-skin `WeeklyGoalSection.jsx`:

- 64 px tall card, `bg-surface-1 border-border-1 rounded-lg p-4`.
- Goal number + bar inline.
- Bar: 200 px wide × 6 px tall, fill `bg-brand-600`, track `bg-surface-2`.
- "Set goal" link on the right when goal is missing or 0.
- Compact mode used inside `/dashboard` from PRD-04.

---

## 7. Morning brief section

The Morning Brief is rendered server-side around 8 AM in user's local timezone. On `/today`, it shows as a collapsible section:

```
── Morning brief · 8:00 AM ──    ↶ History
[Collapsed]   "Tap to read your morning brief"

[Expanded]    DigestSection content: Top opportunities, Today's interviews, Stale apps, Tips
```

- Collapsed state: 56 px row, `bg-surface-1 rounded-lg p-4`, chevron right, "Tap to read your morning brief" + timestamp.
- Expanded: render `DigestSection.jsx` content — re-skinned to:
  - Each subsection (Opportunities / Interviews / Stale / Tips) is a heading + list of 2-line rows.
  - No nested cards. Use the same row pattern as missions.
- History link top-right opens `MorningBriefHistoryPanel.jsx` as a right drawer (same component, re-skinned).

Replace `MorningBriefPage.jsx` standalone page with a redirect to `/today?brief=open` that auto-expands the brief section. The page route should still resolve so deep links from email don't 404.

---

## 8. Weekly review teaser

Sunday-only inline row:

```
── This week's review ──
You shipped 8 applications and had 2 interviews. Read your Sunday review →
```

- 48 px row, `bg-surface-1 rounded-lg p-4`.
- Cardinal arrow link "→" right-aligned.
- Hidden Mon–Sat.

The full `WeeklyReviewSection.jsx` view stays as-is in its current location — re-skin with the new heading hierarchy.

---

## 9. Onboarding checklist

Today's `OnboardingChecklist.jsx` is a bordered card with rows. Re-skin:

```
── Get started ──   3 of 5 complete    [×]
✓  Verify your email
✓  Save your first application
✓  Connect Gmail
○  Set a weekly goal       → Set goal
○  Install Chrome extension → Install
```

- Container: `bg-surface-1 border-border-1 rounded-lg p-4`.
- Checkmarks: 14 × 14, Cardinal when complete, `text-text-3` outline circle when incomplete.
- Right column: action link (Cardinal text, hover underline) for incomplete items only.
- Auto-dismisses when 100 % complete OR when user clicks the × (persisted in localStorage).
- Shown only above the missions list on `/today`, not on other pages.

---

## 10. File manifest

### 10.1 Edit

| File | Change |
|------|--------|
| `frontend/src/pages/TodayPage.jsx` | New composition per Section 3 |
| `frontend/src/pages/MorningBriefPage.jsx` | Redirect to `/today?brief=open`; keep route as shim |
| `frontend/src/components/MissionCard.jsx` | Re-write as single-line row per Section 5 |
| `frontend/src/components/MissionPriorityPill.jsx` | Inline subtle pill |
| `frontend/src/components/MissionProgressStrip.jsx` | Re-skin bar with Cardinal fill |
| `frontend/src/components/MorningBriefSectionCard.jsx` | Re-skin as row+heading subsection |
| `frontend/src/components/MorningBriefSkeleton.jsx` | Skeleton rows match new mission row dimensions |
| `frontend/src/components/MorningBriefHistoryPanel.jsx` | Right drawer 480 px, re-skinned |
| `frontend/src/components/DigestSection.jsx` | New section hierarchy |
| `frontend/src/components/WeeklyGoalSection.jsx` | Compact bar layout |
| `frontend/src/components/WeeklyReviewSection.jsx` | Linear-style narrative rendering |
| `frontend/src/components/OnboardingChecklist.jsx` | Per Section 9 |

### 10.2 Delete

- None — every component above keeps existing tests.

---

## 11. Acceptance criteria

- [ ] `/today` shows greeting + date row, weekly goal, missions, brief, optional weekly review.
- [ ] Missions are single-line rows with priority dot.
- [ ] Hover reveals Complete/Snooze/menu actions; keyboard `c` / `s` / `enter` trigger them on focused row.
- [ ] Completed missions animate to bottom group.
- [ ] Morning Brief is collapsible; remembers state per-day in localStorage.
- [ ] Onboarding checklist shows only when at least 1 step is incomplete and user hasn't dismissed it; auto-dismisses on completion.
- [ ] Sunday-only weekly review teaser visible Sun only (UTC adjusted to user TZ).
- [ ] Empty state shows when 0 missions.
- [ ] `MorningBriefPage.jsx` route redirects to `/today?brief=open`.
- [ ] All tests pass (`TodayPage.test.jsx`, `MorningBriefPage.test.jsx`, related component tests).
- [ ] Dark theme verified.

---

## 12. Out of scope

- New mission types (the scorer is on the backend).
- Mission ranking model changes.
- Email template redesign (still server-rendered).
- Push notifications.

---

## 13. Notes for the implementing agent

- The hardest line is the **greeting**. `Good morning, Joseph.` reads warmer than `Today, May 25` — keep the line.
- Mission completion should feel immediate. Use optimistic React Query mutations — already wired in `useApplications`-style patterns. If not present for missions, add it.
- The brief collapse state should persist per-day, not forever — once a new day's brief arrives, default to collapsed again.
- Don't try to merge MissionCard and ApplicationRow. They share a row aesthetic but have different actions; keep them separate components.
- Confirm: the existing `MissionCard.jsx` was 122 lines? Verify after rewrite it's < 80.
