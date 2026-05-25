# PRD-06 — Job Board & Calendar

**Status:** Ready (blocked on PRD-00, PRD-01)
**Depends on:** PRD-00, PRD-01
**Estimated effort:** 1 agent session

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

The Job Board and Calendar are two views with **different data, same row aesthetics** as the Dashboard. After PRD-04, we have the visual primitives (stage dot, dense row, hover actions). This PRD applies them.

Linear inspiration:
- Job board → Linear's "Roadmap" or "Triage" view (filterable list + side-panel detail).
- Calendar → Linear's "Cycle" timeline view (clean grid, subtle event chips).

---

## 2. Sources to read first

- Linear's Roadmap or Triage view.
- Linear's Cycle view (timeline).
- Existing:
  - `frontend/src/pages/JobBoard.jsx`
  - `frontend/src/components/JobBoardContent.jsx`
  - `frontend/src/components/JobCard.jsx`
  - `frontend/src/components/JobRow.jsx`
  - `frontend/src/components/JobDetailPanel.jsx`
  - `frontend/src/components/JobFilters.jsx`
  - `frontend/src/components/JobRecommendations.jsx`
  - `frontend/src/components/JobSearchInput.jsx`
  - `frontend/src/pages/Calendar.jsx`
  - `frontend/src/components/CalendarGrid.jsx`
  - `frontend/src/components/CalendarEventsList.jsx`
  - `frontend/src/components/CalendarEventDetail.jsx`
  - `frontend/src/components/NewEventForm.jsx`
  - `frontend/src/components/NewEventFormFields.jsx`
  - `frontend/src/components/SkeletonCalendarCell.jsx`

---

## 3. Job Board target layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [Sub-header]                                                    │
│ Job board · 1,284 jobs                              [+ Track]   │
│                                                                 │
│ [Search box ────────────────] [Remote ▾] [Type ▾] [Level ▾] [Sort ▾]│
├─────────────────────────────────────────────────────────────────┤
│ ── Recommended for you ──   based on your resume                │
│ [grid of 3 recommendation tiles]                                │
├─────────────────────────────────────────────────────────────────┤
│ ── All jobs ──                                                  │
│ ●  Anthropic     Forward Deployed Engineer        SF    Remote  │
│ ●  Stripe        Software Engineer Intern         NYC   Hybrid  │
│ ●  Vercel        Developer Experience Intern      —     Remote  │
│ ●  Linear        Founding Engineer                SF    Onsite  │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

When a job row is clicked, `JobDetailPanel` slides in from the right (same pattern as DetailPanel from PRD-04, 520 px wide).

---

## 4. Job row spec

40 px row, same density as `ApplicationRow`:

| Element | Width | Notes |
|---------|-------|-------|
| Bookmark | 16 px | filled Cardinal when saved |
| Company logo | 16 px | (or initial) |
| Company | 140 px truncate | 13 px 500 `text-text-1` |
| Role | flex-1 truncate | 13 px 400 `text-text-2` |
| Location | 80 px truncate | 12 px `text-text-3` |
| Remote chip | 64 px | 11 px subtle pill `bg-surface-1 text-text-2`, "Remote" / "Hybrid" / "Onsite" |
| Level | 64 px | 11 px subtle pill |
| Posted | 64 px | 11 px `text-text-3`, "3d ago" |
| Track button | 28 px hover | Cardinal "+ Track" → adds to pipeline at "To Apply" stage |

No card backgrounds. Hover row: `bg-surface-1`. Selected: `bg-brand-50/40`.

### Recommended tile

For the top recommendations row (3 cards):
```
┌─ Recommended ───────────┐
│ Anthropic   ✦ 84%       │
│ Forward Deployed Engineer│
│ SF · Remote · Intern     │
│ [Track]                  │
└─────────────────────────┘
```

- 160 px tall, `bg-surface-0 border border-border-1 rounded-lg p-4`.
- FitBadge sparkle + percent top-right.
- "Track" button bottom-left, secondary size sm.

---

## 5. Job filters

Same inline filter pattern as PRD-04:

```
Remote: Any ▾   Type: Intern ▾   Level: New grad ▾   Posted: 30d ▾   Sort: Best match ▾
```

- Search input is full-width (40 px tall) at the top.
- Search responds with 200 ms debounce.
- Sort options: Best match (default, uses fit score), Newest, Oldest.

`JobSearchInput.jsx` becomes a controlled input with a magnifying-glass icon left, ⌘K hint right. Pressing Enter focuses the first row.

---

## 6. Job detail panel

Same 520 px right drawer. Sections:

```
┌─ Anthropic — FDE Intern ──── [Track →] [Open job →] [×] ┐
│                                                          │
│  ●  Posted 3d ago · ✦ 84% fit                            │
│                                                          │
│  ── About the role ─────────────────────────────         │
│  [parsed job description, markdown preview]              │
│                                                          │
│  ── Requirements ───────────────────────────             │
│  [bulleted list from extracted skills]                   │
│                                                          │
│  ── Resume insights ───────────────────────              │
│  [AI tips on how to tailor your resume — if user has    │
│   their resume on file]                                  │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

- Track button (primary, Cardinal) creates application at To Apply stage and shows a success toast.
- Open job button opens external URL in new tab.
- Re-uses ApplyPack / ResumeInsights components from PRD-09 (collapsible).

---

## 7. Calendar target layout

The current `Calendar.jsx` has a month grid + events list. Keep both. Re-skin:

```
┌─────────────────────────────────────────────────────────────────┐
│ Calendar · May 2026                       [< prev] [Today] [next>]│
│                                                                 │
│ ┌─ Mo ─┬─ Tu ─┬─ We ─┬─ Th ─┬─ Fr ─┬─ Sa ─┬─ Su ─┐              │
│ │  4   │  5   │  6   │  7   │  8   │  9   │ 10   │              │
│ │  ●   │      │      │      │ ●●   │      │      │              │
│ │ 11   │ 12   │ 13   │ 14   │ 15   │ 16   │ 17   │              │
│ │      │      │  ●   │      │      │      │      │              │
│ │ ...                                                           │
│ └────────────────────────────────────────────────┘              │
│                                                                 │
│ ── Today, May 25 ── 2 events                                    │
│ ●  10:00 AM  Anthropic phone screen (30 min)        Open detail │
│ ●  2:30 PM   Stripe technical interview (90 min)    Open detail │
│                                                                 │
│ ── Upcoming this week ── 4 events                               │
│ ●  May 26 · 11:00 AM  Linear onsite                             │
│ ...                                                             │
└─────────────────────────────────────────────────────────────────┘
```

### 7.1 Calendar grid (`CalendarGrid.jsx`)

- 7-column grid, each cell `min-h-24 border border-border-1 p-2`.
- Day number top-left, 11 px 500.
- Today cell: 2 px Cardinal top border + Cardinal day-number.
- Event dot (6 px Cardinal Red) renders per event in cell. Max 3 dots per cell (overflow → `+N`).
- Hover cell: `bg-surface-1`.
- Click cell: scroll to that day's section in events list below + select it.
- Skeleton cell uses existing `SkeletonCalendarCell.jsx` re-skinned to 96 × 96 placeholder.

### 7.2 Events list (`CalendarEventsList.jsx`)

Grouped by day. Each event:

```
●  10:00 AM  Anthropic phone screen           30 min   Open
```

- 40 px row.
- Cardinal dot if event is in next 24 h, neutral dot otherwise.
- Time 12 px `text-text-2`.
- Title 13 px `text-text-1`.
- Duration 11 px `text-text-3`.
- "Open" link Cardinal Red → opens detail panel.

### 7.3 Event detail (`CalendarEventDetail.jsx`)

Right drawer 480 px:
```
[× ]  Anthropic phone screen
       Wed, May 25 · 10:00 – 10:30 AM

       Application: Anthropic — FDE Intern  →
       Type: Phone screen
       Location: Phone (call from recruiter)

       Prep checklist
       □ Review job description
       □ Re-read your interview prep brief
       □ Prepare 3 questions to ask

       [Open application]
```

- "Open application" navigates to DetailPanel for that app (from PRD-04).
- Prep checklist items persist per-event (checkbox state stored in `event.prep_checklist`).

### 7.4 New event form

`NewEventForm.jsx` becomes a modal 480 px:
```
   Add interview / event

   Title       [______________________________]
   Application [▾ Anthropic — FDE Intern ▾____]
   Date        [05/25/2026] Time [10:00 AM]
   Duration    [30 min ▾]
   Type        [Phone screen ▾]
   Notes       [textarea]

                          [Cancel] [Add event]
```

---

## 8. File manifest

### 8.1 Edit

| File | Change |
|------|--------|
| `frontend/src/pages/JobBoard.jsx` | New composition per Section 3 |
| `frontend/src/components/JobBoardContent.jsx` | Compose recommendation grid + list |
| `frontend/src/components/JobCard.jsx` | Recommendation tile per Section 4 |
| `frontend/src/components/JobRow.jsx` | Row per Section 4 |
| `frontend/src/components/JobDetailPanel.jsx` | Right drawer per Section 6 |
| `frontend/src/components/JobFilters.jsx` | Inline filters per Section 5 |
| `frontend/src/components/JobRecommendations.jsx` | 3-up tile grid |
| `frontend/src/components/JobSearchInput.jsx` | Re-skin per Section 5 |
| `frontend/src/pages/Calendar.jsx` | New composition per Section 7 |
| `frontend/src/components/CalendarGrid.jsx` | Per Section 7.1 |
| `frontend/src/components/CalendarEventsList.jsx` | Per Section 7.2 |
| `frontend/src/components/CalendarEventDetail.jsx` | Right drawer per Section 7.3 |
| `frontend/src/components/NewEventForm.jsx` | Modal per Section 7.4 |
| `frontend/src/components/NewEventFormFields.jsx` | Re-skin fields per PRD-00 |
| `frontend/src/components/SkeletonCalendarCell.jsx` | Match new cell dimensions |

### 8.2 No new files

Composition stays similar — just visual re-skin.

---

## 9. Acceptance criteria

- [ ] Job Board rows are 40 px tall with dot/logo/company/role/location/remote/level/posted/track.
- [ ] Recommendations grid renders 3 tiles (or less if few results), each with fit score sparkle + percent.
- [ ] Filter row is inline and single-line at desktop width.
- [ ] Search debounces at 200 ms.
- [ ] Track button creates an application and shows toast "Tracking Anthropic — FDE Intern".
- [ ] Calendar grid shows month with event dots; today's cell is Cardinal-bordered.
- [ ] Click day → events list scrolls to that day group.
- [ ] Event row shows time, title, duration, Open link.
- [ ] Event detail drawer shows linked application + prep checklist.
- [ ] New event form opens as 480 px modal.
- [ ] All existing tests pass.
- [ ] Dark theme verified.

---

## 10. Out of scope

- New job sources beyond GitHub repos.
- Multi-day events.
- Recurring events.
- Calendar week / day views (month view only).
- iCal export.
- Drag-to-reschedule on calendar.

---

## 11. Notes for the implementing agent

- Job recommendations use the existing `useJobRecommendations` hook. No backend changes.
- The "Track" action calls existing `createApplication` mutation. Pre-fill stage = "To Apply", source = "board", url = job.url.
- For prep checklist persistence, use the existing `event.prep_checklist` field if it exists. If not, add it as a `string[]` of completed item IDs on the event model — backend supports `PATCH /api/cal/events/:id` with arbitrary fields per CLAUDE.md API contract.
- The Track button is the primary CTA in the panel — make sure it has Cardinal background and `disabled` state when the user already tracks this job.
