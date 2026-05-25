# PRD-04 — Pipeline (Dashboard / Kanban / List / Detail Panel)

**Status:** Ready (blocked on PRD-00, PRD-01)
**Depends on:** PRD-00, PRD-01
**Estimated effort:** 1 long agent session (~6 hours)

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

The Dashboard is where users spend most of their time. It's the analog of Linear's Issues view — dense list of items with status, filters, a detail panel, and a Kanban board alternate. The current design is too "card-heavy" with bordered cards, rounded shadows, and warm tints. We're flattening it to Linear's spec: single-line rows, dot status indicators, no shadows on rows, a quiet filter bar, and a right-side detail drawer.

This is the largest UI surface in the app — touching ~35 components. Treat this PRD as the single biggest visual lift in the redesign.

---

## 2. Sources to read first

- Linear's Issues view (any project you have access to in `linear.app`).
- Linear's "My issues" / cycle view.
- Existing files:
  - `frontend/src/pages/Dashboard.jsx`
  - `frontend/src/components/DashboardToolbar.jsx`
  - `frontend/src/components/StatsBar.jsx`
  - `frontend/src/components/GoalProgress.jsx`
  - `frontend/src/components/FilterBar.jsx`
  - `frontend/src/components/ApplicationList*.jsx` (List, ListBody, ListHeader, ListEmpty)
  - `frontend/src/components/ApplicationRow.jsx`
  - `frontend/src/components/ApplicationRowActions.jsx`
  - `frontend/src/components/KanbanBoard.jsx`, `KanbanColumn.jsx`, `KanbanCard.jsx`
  - `frontend/src/components/DetailPanel.jsx` + `DetailPanelHeader.jsx` + `DetailPanelBody.jsx` + `DetailPanelSections.jsx` + `DetailPanelTimeline.jsx` + `DetailPanelNotes.jsx`
  - `frontend/src/components/ManualAddForm*.jsx`
  - `frontend/src/components/CsvImportModal.jsx`
  - `frontend/src/lib/constants.js` (STAGES, STAGE_COLORS — re-define here)

---

## 3. Page-level layout

After PRD-01, Dashboard renders inside `<AppShell>`. The new structure inside the canvas:

```
┌──────────────────────────────────────────────────────────────────┐
│ Top header (44px from PRD-01)                                    │
├──────────────────────────────────────────────────────────────────┤
│  [Sub-header / page actions, sticky 56 px]                       │
│  Dashboard                              [List ▢] [Kanban]  [+ Add]│
│  ───────────────────────────────────────────────────────────────  │
│  [Filter bar — inline filters as chips, sticky]                  │
│  Stage: All ▾   Source: Any ▾   Stage updated: 30d ▾  Clear      │
├──────────────────────────────────────────────────────────────────┤
│  [Stats / Goal — collapsed when filters active]                  │
│  120 applications  ·  12 active  ·  3 interviews  ·  6 ghosted   │
│  Goal: 5 / 10 this week  ████████░░                              │
├──────────────────────────────────────────────────────────────────┤
│  [List or Kanban view]                                           │
│                                                                  │
│  ●  Anthropic         FDE Intern        Phone Screen   2d ago    │
│  ●  Stripe            SWE Intern        Applied        5d ago    │
│  ●  Linear            Founding Eng      Applied        1w ago    │
│  ●  Vercel            DX Intern         To Apply       —         │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘

(Detail panel slides over from the right when a row is selected.)
```

- The Stats/Goal row is **collapsed to a single-line summary** when any filter is active. Linear's pattern is: don't show overview blocks when the user is in "drilled-in" mode.
- Onboarding checklist, banners (Email verify, Inbox setup, Autopilot resume, Follow-up) are rendered above the sub-header, but each is dismissible and starts dismissed-from-view in localStorage once the user closes them.

---

## 4. Sub-header

```jsx
<div className="sticky top-11 z-20 flex h-14 items-center gap-3 border-b border-border-1 bg-surface-0/90 backdrop-blur px-4">
  <h1 className="text-base font-semibold text-text-1">Dashboard</h1>
  <span className="text-xs text-text-3">{count} applications</span>
  <div className="ml-auto flex items-center gap-1.5">
    <ViewToggle viewMode={viewMode} onChange={onSetViewMode} />
    <Button variant="secondary" size="sm" onClick={onImportCsv}>Import CSV</Button>
    <Button variant="secondary" size="sm" onClick={onExport}>Export</Button>
    <Button variant="default" size="sm" onClick={onAdd}>+ Add application</Button>
  </div>
</div>
```

View toggle: a 2-segment pill (`bg-surface-1 rounded-md p-0.5`), 13 px label icons (List + Layout) + selected has `bg-surface-0 shadow-sm`.

---

## 5. Filter bar

Replace the existing FilterBar (`frontend/src/components/FilterBar.jsx`) which uses big buttons and tag chips with a Linear-style inline filter row:

```
Stage: All ▾    Source: Any ▾    Updated: Last 30d ▾    Saved view: My pipeline ▾   Clear
```

- Each filter: a small dropdown trigger styled as `text-text-2 hover:text-text-1 hover:bg-surface-1 rounded-md px-2 h-7 text-xs`. Chevron 12 px after the label.
- Selected value appears in the trigger label (e.g., "Stage: Applied").
- Saved view dropdown (existing `SavedSearchesSidebar` becomes a dropdown here — remove the sidebar UI; offer "Save current as view…" at the bottom of the saved views dropdown). The standalone Saved Searches sidebar component is **removed** entirely from this page.
- "Clear" link appears only when at least one filter is active. `text-text-3 hover:text-brand-700 text-xs`.

---

## 6. Stats + Goal row

Compressed to a single line when collapsed:

```
120 applications · 12 active · 3 interviews · 6 ghosted   |   Goal: 5/10 this week  ████░░░░░░  ⌃
```

- All numbers are 13 px `text-text-1`; labels are 13 px `text-text-3`.
- The mini goal bar: 96 px wide × 4 px tall, filled `bg-brand-600`, track `bg-surface-2`, radius 2 px.
- The carret on the right expands the row into the full stats grid (the existing StatsBar layout, re-skinned).

`GoalProgress.jsx`: keep semantics. Re-skin with the same row treatment when collapsed; the expanded card has 4 metric tiles in `border-border-1 rounded-lg p-4`.

---

## 7. Application list (single-line, dense)

Every row is **40 px tall**, single line, hover reveals quick actions.

```
[ ][●][○][🏢] Anthropic    Forward Deployed Engineer    [● Phone Screen]   ✦  82%  ⏱  2d ago   ⋯
 |  |  |   |    company         role                       stage pill        |   |    |        |
 |  |  |   |                                                                  |   |    |        actions menu
 |  |  |   logo (16 × 16)                                                     |   |    date applied / updated
 |  |  stale dot (amber)                                                       |   fit score badge (small)
 |  selection checkbox (only on hover or when something is checked)            interview prep ready (sparkle)
 row focus marker (2 px Cardinal left bar when keyboard-focused)
```

### 7.1 Layout (precise)

```
flex items-center gap-3 border-b border-border-1 px-4 h-10
hover:bg-surface-1
focus-visible: 2 px Cardinal left bar inset (no full outline)
selected (when in detail panel): bg-brand-50/40 + 2 px Cardinal left bar
```

### 7.2 Column widths

| Element | Width | Notes |
|---------|-------|-------|
| Checkbox | 16 px | opacity-0 unless `:hover` or `hasSelection` |
| Stale dot | 8 px | pulses if stale |
| Company logo | 16 px (was 24 px — shrink it) | fallback to initial circle in Cardinal-tinted bg |
| Company name | 160 px truncate | 13 px 500 `text-text-1` |
| Role title | flex-1 truncate | 13 px 400 `text-text-2` |
| Stage pill | auto | see 7.3 |
| Sparkle | 16 px | only if `interview_prep_briefing` |
| Fit badge | 44 px | see 7.4 |
| Stale clock | 16 px | only if `staleDays >= 14` |
| Follow-up bell | 16 px | only if `followUpOverdue` |
| Date | 80 px | 12 px `text-text-3` |
| Row menu | 28 px | three-dot, hidden until hover |

### 7.3 Stage pill (the most important visual change)

Today's pill is a tinted-background pill. New design is **dot + label**:

```jsx
<span className="inline-flex items-center gap-1.5 text-xs text-text-1">
  <span className="h-1.5 w-1.5 rounded-full" style={{ background: STAGE_COLORS[stage] }} />
  {stage}
</span>
```

No background tint. The dot is the color signal. The label stays neutral. This is the single biggest density win — pills with backgrounds add visual weight on every row.

### 7.4 Fit badge

Today it's a colored pill ("Strong fit"). New design:

```
✦ 82%
```

- Sparkles icon 11 px `text-brand-600` if score ≥ 70.
- Score number 12 px 600 `text-text-1` if ≥ 70, `text-text-2` if 40–69, `text-text-3` if < 40.
- No background. No border.
- Tooltip on hover explains "Fit score based on your resume and the job description".

### 7.5 Row hover state

On hover:
- Background `bg-surface-1` (120 ms ease-out).
- Checkbox opacity 1.
- Row menu (three-dot) becomes visible.
- Quick action chips appear at the right edge: `Archive` and `Set follow-up` (small buttons, 24 px tall, ghost) — replacing today's swipe-to-reveal pattern on desktop. Mobile keeps swipe.

### 7.6 List header

```
[col-1: checkbox toggle-all]  Company    Role    Stage    Score    Updated
```

- Header row: 32 px, `bg-surface-1 border-b border-border-2`, 11 px 500 uppercase `text-text-3`.
- Click column header to sort (existing capability). Sort indicator: `▲` / `▼` 8 px, right of label.

---

## 8. Kanban board

Re-skin, keep DnD semantics.

### 8.1 Board layout

```
┌─ To Apply (4) ───┐ ┌─ Applied (12) ──┐ ┌─ Phone (3) ──┐ ┌─ Technical (2) ┐
│                   │ │                  │ │              │ │                 │
│ [card]            │ │ [card]           │ │ [card]       │ │ [card]          │
│ [card]            │ │ [card]           │ │              │ │                 │
│                   │ │ [card]           │ │              │ │                 │
└───────────────────┘ └──────────────────┘ └──────────────┘ └─────────────────┘
```

- Columns: min-width 280 px, flex-1, gap 12 px, `overflow-x-auto` for many stages.
- Column header: 40 px, dot + name + count, sticky top within board, `bg-surface-1 border-b border-border-1`. Add-button (`+`) on hover, right-aligned, opens manual add pre-filled with that stage.
- Column body: `bg-surface-1 rounded-lg p-2 gap-2 flex flex-col`. No card background inside — it's a tray.
- Cards: `bg-surface-0 border border-border-1 rounded-lg p-3 hover:border-border-2 cursor-grab`. No shadow.

### 8.2 Kanban card

```jsx
<article className="rounded-lg border border-border-1 bg-surface-0 p-3 hover:border-border-2 transition-colors">
  <div className="flex items-start gap-2">
    <CompanyLogo size={20} />
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-medium text-text-1">{company}</p>
      <p className="truncate text-xs text-text-2 mt-0.5">{role}</p>
    </div>
    {fitScore && <span className="text-xs text-text-3">{fitScore}%</span>}
  </div>
  {staleOrFollowUp && (
    <div className="mt-2 flex items-center gap-2 text-[11px] text-text-3">
      {staleClock} {followUpBell}
    </div>
  )}
</article>
```

- Card height ≈ 72 px (single role line) or 88 px (with footer chips). No shadows.
- Drag state: `opacity-50` ghost; the overlay shows the same card with `shadow-modal`.
- Empty column placeholder: 1 dashed border row, 56 px tall, `text-text-3` "Drop applications here".

### 8.3 Mobile Kanban

Existing tabbed mobile view stays — tabs become Linear-style underline-active tabs (no full pill). Tab strip: 32 px tall, `border-b border-border-1`, active tab has 2 px Cardinal bottom-border + `text-text-1`.

---

## 9. Detail panel (right drawer)

Re-skin the existing `DetailPanel.jsx`. Structural change: it slides over **the canvas only**, not the sidebar. Width changes to 520 px on desktop (was 480 px).

### 9.1 Layout

```
┌──── 520 px ─────────────────────────────────┐
│ [×] Anthropic — FDE Intern         ⋯  ⛶    │ ← header 56 px
├────────────────────────────────────────────│
│  Stage  [● Phone Screen ▾]                  │ ← stage editor 48 px
│                                            │
│  Applied  Dec 12 · Updated 2 days ago      │ ← meta row
│  Source: Chrome extension                   │
│                                            │
│  ── Notes ──────────────────────────────── │
│  [markdown editor]                          │
│                                            │
│  ── AI ────────────────────────────────── │
│  ▸ Apply Pack                               │
│  ▸ Mock Interview                           │
│  ▸ Interview Prep                           │
│  ▸ Resume Insights                          │
│  ▸ Follow-up Draft                          │
│                                            │
│  ── Timeline ───────────────────────────── │
│  • Applied · Dec 12                         │
│  • Phone Screen · Dec 18                    │
│  • Note added · Dec 20                      │
│                                            │
│  ── Contacts ──────────────────────────── │
│  [contact card]                             │
│                                            │
└────────────────────────────────────────────┘
```

### 9.2 Header

- 56 px tall, `border-b border-border-1`, padding 16 px.
- Close × button (28 px ghost icon button), then company logo 24 px, then company + role inline.
- Right-aligned: row menu (⋯) + expand-to-full-screen button (⛶) opens the application in a dedicated route `/applications/:id` (new — see Section 12).

### 9.3 Body sections

The existing `DetailPanelBody.jsx` composes many `*Section.jsx` components. Re-skin only:
- Section title: `heading-3` (14 px 600), 16 px top padding, 8 px bottom padding.
- Section divider: 1 px `border-border-1`, no margin.
- Collapsible: chevron toggles via Radix Collapsible. Default-open for Notes + Timeline; default-closed for AI subsections.

### 9.4 Stage selector

Inline pill-with-dropdown, not a select:
- Trigger: dot + stage name + chevron, 28 px tall, `bg-surface-1 rounded-md px-2 hover:bg-surface-2`.
- Menu: list of all stages with dots, current one highlighted. Cmd+1..9 sets stage from anywhere when panel is open.

### 9.5 Notes editor

Re-skin `NotesEditor.jsx` and `MarkdownEditor.jsx`:
- Editor surface: `bg-surface-1 rounded-md border border-border-1` (only when focused, otherwise borderless).
- Toolbar: 32 px, ghost icon buttons (bold/italic/heading/list/link/code/preview), 16 px icons, gap 2 px.
- Preview pane stays — toggle between Edit and Preview tabs at the top of the editor.

### 9.6 Discard dialog

Existing modal stays. Re-skin per PRD-00:
- `bg-surface-0 border border-border-1 rounded-xl shadow-modal p-6 max-w-sm`.
- Backdrop `bg-black/40 backdrop-blur-sm`.

### 9.7 Mobile

On mobile, detail panel becomes a bottom-sheet (it already does this — keep). New: drag-handle bar 4 px × 40 px at the top.

---

## 10. Manual add form + CSV import modal

### 10.1 ManualAddForm

Today: a wide modal with many fields stacked. New:
- Modal width 520 px, `rounded-xl shadow-modal`.
- Form structure (single column, 16 px gap):
  - Company (text)
  - Role title (text)
  - Stage (segmented pill — first 4 stages visible, "More" expands)
  - Date applied (date input, 32 px)
  - Source (4-button segmented control: Manual / Extension / Email / Board) — default Manual
  - Job URL (text, full width)
  - Job description (collapsible textarea, default closed)
  - Notes (collapsible textarea, default closed)
- Footer: Cancel (ghost) + Add application (Cardinal primary), right-aligned.
- Existing keyboard shortcut `a` opens this — keep.

### 10.2 CsvImportModal

Today: simple file picker + progress. New:
- Step 1: Drop zone (160 px tall, dashed border, drag-over Cardinal tint).
- Step 2: Column mapping (table with source CSV col → target field dropdown).
- Step 3: Preview first 3 rows.
- Step 4: Import button + progress bar.
- Reuse existing logic; just split into 4 visual steps and re-skin.

---

## 11. Banners and onboarding inline

These banners render above the sub-header inside the canvas:

| Banner | When | Style |
|--------|------|-------|
| `OnboardingChecklist` | First 7 days, until dismissed | `bg-surface-1 border-border-1 rounded-lg p-4` with progress bar |
| `EmailVerificationBanner` | If user email unverified | top of canvas, `bg-brand-50 text-brand-900 border-b border-brand-100 h-9` |
| `InboxSetupBanner` | If Gmail not connected | dismissible card, ghost CTA |
| `AutopilotResumeBanner` | If Autopilot enabled but no resume | dismissible card |
| `FollowUpBanner` | If overdue follow-ups exist | Cardinal-dot card, link to filtered view |

All banners get a 16 × 16 close × on the right, persist dismissal in localStorage by banner ID.

---

## 12. New route: `/applications/:id` (full-screen detail)

Add a route that shows the same content as DetailPanel but as a dedicated page (no panel, content fills canvas). Opens when user clicks the "expand" button (⛶) in DetailPanelHeader.

- Same content as the panel.
- Top: breadcrumb "Dashboard / Anthropic – FDE Intern".
- Body width capped at 880 px.

This isn't critical — implement if time permits, otherwise skip and remove the ⛶ button.

---

## 13. File manifest

### 13.1 Edit (most)

| File | Change |
|------|--------|
| `frontend/src/pages/Dashboard.jsx` | Drop the page wrapper (AppShell handles it from PRD-01); compose new sub-header + filter bar + stats row + view + detail panel |
| `frontend/src/components/DashboardToolbar.jsx` | Move actions into sub-header; segmented view-mode pill |
| `frontend/src/components/FilterBar.jsx` | Inline filter row; saved searches as dropdown |
| `frontend/src/components/StatsBar.jsx` | Collapsed/expanded variants |
| `frontend/src/components/GoalProgress.jsx` | Compact horizontal layout |
| `frontend/src/components/ApplicationList.jsx` | Just composition; no visual changes |
| `frontend/src/components/ApplicationListHeader.jsx` | New compact header per 7.6 |
| `frontend/src/components/ApplicationListBody.jsx` | Pass new row props |
| `frontend/src/components/ApplicationRow.jsx` | Full re-skin per Section 7 |
| `frontend/src/components/ApplicationRowActions.jsx` | Hover-revealed quick chips; row menu (⋯) refresh |
| `frontend/src/components/ApplicationListEmpty.jsx` | New empty illustration: dashed 96 × 96 box + "No applications yet" |
| `frontend/src/components/KanbanBoard.jsx` | Re-skin column + drag overlay |
| `frontend/src/components/KanbanColumn.jsx` | Sticky header, add-button on hover |
| `frontend/src/components/KanbanCard.jsx` | Full re-skin per Section 8.2 |
| `frontend/src/components/CompanyLogo.jsx` | Default size 16 px; fallback initial circle in Cardinal-tint |
| `frontend/src/components/FitBadge.jsx` | Sparkle + percent per 7.4 |
| `frontend/src/components/StatsBar.jsx` | Compact + expanded |
| `frontend/src/components/DetailPanel.jsx` | Width 520 px, re-skinned |
| `frontend/src/components/DetailPanelHeader.jsx` | New header per 9.2 |
| `frontend/src/components/DetailPanelBody.jsx` | Re-skinned sections |
| `frontend/src/components/DetailPanelSections.jsx` | Per-section title style |
| `frontend/src/components/DetailPanelTimeline.jsx` | Linear-style timeline (dot + line) |
| `frontend/src/components/DetailPanelNotes.jsx` | Re-skinned |
| `frontend/src/components/NotesEditor.jsx` | Toolbar re-skin |
| `frontend/src/components/MarkdownEditor.jsx` | Toolbar re-skin |
| `frontend/src/components/ManualAddForm.jsx` (+ Fields, CategoryRow, DateRow) | New form per 10.1 |
| `frontend/src/components/CsvImportModal.jsx` | 4-step wizard per 10.2 |
| `frontend/src/components/OnboardingChecklist.jsx` | Re-skin per Section 11 |
| `frontend/src/lib/constants.js` | `STAGE_COLORS` updated to use the dot-color values from PRD-00 §3.4 |

### 13.2 Delete

- `frontend/src/components/SavedSearchesSidebar.jsx` (moved into FilterBar dropdown). Update tests.
- `frontend/src/components/SaveSearchPopover.jsx` if its only use was the sidebar; otherwise inline into the dropdown.

### 13.3 Create (optional, only if pursuing §12)

- `frontend/src/pages/ApplicationDetailPage.jsx` — full-screen detail.

---

## 14. Acceptance criteria

- [ ] Every Application row is 40 px tall on desktop, 56 px on mobile.
- [ ] Stage pill is dot + label only — no tinted background.
- [ ] FitBadge is sparkle + percent — no pill, no background.
- [ ] FilterBar fits in a single row at ≥ 768 px viewport.
- [ ] Sub-header is sticky below the top header (top: 44 px).
- [ ] StatsBar collapses to a single line; carret expands it.
- [ ] Kanban columns scroll horizontally on overflow; column headers stay sticky within the board.
- [ ] DetailPanel slides in from the right (220 ms) and is 520 px wide on desktop.
- [ ] Notes editor saves on blur (no save button); shows "Saving…" then "Saved · 2 s ago" microcopy.
- [ ] ManualAddForm opens with `a` shortcut and submits with `cmd+enter`.
- [ ] CSV import shows 4 steps with explicit progress.
- [ ] All hover, focus, selected states use tokens from PRD-00.
- [ ] Existing tests pass; for any test asserting class names or computed styles, update the test (not the visual design).
- [ ] Lighthouse on Dashboard: A11y ≥ 95, Best Practices ≥ 95.
- [ ] Dark theme is verified — every row, badge, hover state, and the right drawer render correctly.

---

## 15. Out of scope

- New filter dimensions (e.g., by tag). Existing filter set only.
- Server-side sort/pagination changes.
- New columns in the list view.
- New stages (the stage list is user-configurable today — keep that).
- A "graph" view alternative.
- Real-time presence indicators (someone else editing).

---

## 16. Notes for the implementing agent

- The single most impactful change is **swapping the stage pill background for a dot**. Do this first, eyeball the dashboard, decide if you need anything else.
- The `STAGE_COLORS` map in `frontend/src/lib/constants.js` is used by both list + kanban + extension. Update it once; everywhere else reads from it.
- Row hover swiping conflicts on touch devices. Keep the existing `useSwipeAction` for mobile (already works) and add the desktop hover-reveal quick chips as a separate path.
- Detail panel currently uses a full-bleed black-30 backdrop. Keep the backdrop but reduce opacity to 30 % — Linear's detail drawer doesn't have a backdrop at all on desktop. Decide based on UX testing; default to **with backdrop** for now since clicking outside should close.
- `useSwipeAction` returns `transform: translateX(...)` on the row — make sure your new flex column widths still fit when shifted.
- Don't try to re-architect the React Query keys. The current `useApplications` + `useApplication(id)` pattern is fine.
- The 300-line limit will bite `ApplicationRow.jsx` (already 214 lines). After the redesign it might shrink — measure, split if it grows.
