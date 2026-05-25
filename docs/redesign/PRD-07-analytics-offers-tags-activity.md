# PRD-07 — Analytics, Offers, Tags, Activity

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

These four pages are visualization + data-table heavy. They share one core need: render lots of structured information without feeling busy. Linear's analytics surfaces (cycle reports, progress charts) and tabular views (e.g., the all-issues view sortable by columns) are the model.

Charts must use the Stanford-anchored chart palette from PRD-00 §3.4, with Cardinal Red as accent 1.

---

## 2. Sources to read first

- Linear's "Cycle report" or "Progress insights" view.
- Existing:
  - `frontend/src/pages/Analytics.jsx`
  - `frontend/src/components/AnalyticsCharts.jsx`
  - `frontend/src/pages/OfferComparison.jsx`
  - `frontend/src/components/OfferDetailsSection.jsx`
  - `frontend/src/components/OfferSummarySection.jsx`
  - `frontend/src/components/OfferNegotiationPanel.jsx`
  - `frontend/src/components/OfferEditableCell.jsx`
  - `frontend/src/pages/Tags.jsx`
  - `frontend/src/components/TagInput.jsx`
  - `frontend/src/pages/Activity.jsx`
  - `frontend/src/components/AgentActivitySection.jsx`

---

## 3. Analytics page

```
┌─────────────────────────────────────────────────────────────┐
│ [Sub-header] Analytics                  [Range: 30d ▾]  ⌄    │
├─────────────────────────────────────────────────────────────┤
│  ┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐│
│  │ 128        │ │ 18         │ │ 12.4%      │ │ 4.2 days   ││
│  │ Applied    │ │ Interviews │ │ Reply rate │ │ Avg response││
│  └────────────┘ └────────────┘ └────────────┘ └────────────┘│
│                                                             │
│  ── Applications over time ──                               │
│  [line chart, 240 px tall]                                  │
│                                                             │
│  ── Pipeline funnel ──                                      │
│  Applied  ████████████████████████  128                     │
│  Phone    █████████  42                                     │
│  Tech     ████  18                                          │
│  Onsite   ██  8                                             │
│  Offer    █  2                                              │
│                                                             │
│  ── Sources ──                                              │
│  [horizontal bar chart of Source → count]                   │
│                                                             │
│  ── Top companies ──                                        │
│  [table: company, applications, interviews, offers, ghost rate]│
└─────────────────────────────────────────────────────────────┘
```

### 3.1 KPI tile

```jsx
<div className="rounded-lg border border-border-1 bg-surface-0 p-4">
  <p className="text-xs uppercase tracking-wider font-medium text-text-3">{label}</p>
  <p className="mt-1 text-2xl font-semibold tracking-tight text-text-1">{value}</p>
  {delta && (
    <p className="mt-1 text-xs text-text-2">
      <span className={delta > 0 ? "text-status-success" : "text-brand-700"}>
        {delta > 0 ? "↑" : "↓"} {Math.abs(delta)}%
      </span>{" "}
      vs last period
    </p>
  )}
</div>
```

- 4-up grid on desktop; 2-up on tablet; 1-up on mobile.

### 3.2 Charts (`AnalyticsCharts.jsx`)

Use recharts (already a dep). Apply chart palette:

```js
const CHART_COLORS = {
  series1: "#8C1515", // Cardinal
  series2: "#3B82F6", // blue
  series3: "#175E54", // Palo Alto
  series4: "#F59E0B", // amber
  series5: "#71717A", // neutral
};
```

- Axes: 11 px font, `text-text-3`, no gridlines on Y (only soft `border-border-1` between labels).
- Tooltip: `bg-surface-0 border border-border-2 rounded-md shadow-popover p-2 text-xs`.
- Line: 2 px stroke, dots only on hover.
- Bar: 8 px radius top corners, no border.
- Empty chart: rendered as a flat dashed line with "No data for this range" centered.

### 3.3 Funnel

Custom — render as 5 stacked horizontal bars, each labeled, decreasing width. Use the stage colors from §3.4 of PRD-00. The "drop-off" between stages is rendered as muted text below: `−42% drop-off (51 lost to ghost)`.

### 3.4 Top companies table

```
Company           Apps   Interviews  Offers   Ghost rate
Anthropic         3      2           1        0%
Stripe            5      3           0        20%
Linear            2      1           0        50%
```

- Header row 32 px `bg-surface-1 text-text-3 text-[11px] uppercase`.
- Data row 36 px, divider `border-border-1`.
- Right-aligned numerics.
- Ghost rate > 50 % rendered in `text-brand-700`.

---

## 4. Offers page (`/offers`)

Side-by-side comparison of 2-4 offers. Re-skin existing:

```
   Offer comparison

   ┌─ Anthropic ──────┐ ┌─ Stripe ────────┐ ┌─ Linear ──────┐
   │ Cardinal accent  │ │                 │ │                │
   │                  │ │                 │ │                │
   │ Base salary      │ │ Base salary     │ │ Base salary    │
   │ $200,000         │ │ $190,000        │ │ $175,000       │
   │                  │ │                 │ │                │
   │ Equity / yr      │ │ Equity / yr     │ │ Equity / yr    │
   │ $80k             │ │ $40k            │ │ $120k          │
   │                  │ │                 │ │                │
   │ Sign-on          │ │ Sign-on         │ │ Sign-on        │
   │ $30k             │ │ —               │ │ $20k           │
   │                  │ │                 │ │                │
   │ Total Y1         │ │ Total Y1        │ │ Total Y1       │
   │ $310,000         │ │ $230,000        │ │ $315,000  ✦    │
   │                  │ │                 │ │                │
   │ [Edit]           │ │ [Edit]          │ │ [Edit]         │
   └──────────────────┘ └─────────────────┘ └────────────────┘

   ── Negotiation notes ── (full-width panel)
   [markdown editor]
```

### Card spec
- `bg-surface-0 border border-border-1 rounded-xl p-6` (rounded-xl for offer importance).
- Best offer (highest Total Y1): 2 px Cardinal border + small "Best" badge top-right.
- Row label: 11 px uppercase `text-text-3`.
- Row value: 14 px 500 `text-text-1`. Editable inline via `OfferEditableCell`.
- "Total Y1" row: 16 px 600.

### Editable cell
- Click to enter edit mode: shows 28 px input, save on blur or Enter.
- Save spinner inline (small dot pulse).

### Negotiation panel
- Existing markdown editor — re-skin per PRD-04 §9.5.

---

## 5. Tags page (`/tags`)

```
   Tags

   [+ New tag]

   ●  #frontend                42 applications  ⋯
   ●  #ai-startup              28 applications  ⋯
   ●  #remote                  17 applications  ⋯
   ●  #sf-bay                  12 applications  ⋯
   ●  #closed-source            3 applications  ⋯
```

- Each row: 40 px, hover-bg.
- Tag dot: 8 px, user-assigned color (6 swatches available).
- Name: 13 px 500.
- Count: 12 px `text-text-3`.
- Row menu (⋯): Edit name, change color, delete, filter dashboard by this tag.
- "Filter dashboard by this tag" → navigates to `/dashboard?tag=frontend`.

### Tag color palette

6 swatches matching the chart palette:
- `#8C1515` Cardinal
- `#3B82F6` blue
- `#8B5CF6` violet
- `#F59E0B` amber
- `#175E54` Palo Alto
- `#71717A` neutral

### TagInput (used everywhere)

`TagInput.jsx` is a token-input used in DetailPanel, ManualAddForm, FilterBar. Re-skin:
- Tokens: 24 px tall pills `bg-surface-1 border-border-1 rounded-md px-2`, color-dot left, label, remove × on hover.
- Input grows inline within tokens.
- Suggestions popover below input: 6 px radius, popover shadow.

---

## 6. Activity feed (`/activity`)

Recent agent activity (autopilot scans, brief generations, etc.). Re-skin:

```
   Activity

   Today
   ●  Autopilot scanned 1,284 jobs · matched 3        5:00 AM
   ●  Morning brief sent                              8:00 AM
   ●  Gmail sync: 12 new emails classified            10:42 AM

   Yesterday
   ●  Autopilot scanned 1,142 jobs · matched 5        5:00 AM
   ●  Weekly review generated                         00:30 AM
   ●  Gmail sync: 8 new emails classified             4:42 AM

   ...
```

- Date headings: 11 px uppercase `text-text-3`, 16 px top.
- Each row: 40 px, dot colored by agent type, title + timestamp right.
- Click row: opens corresponding artifact (brief, review, opportunity card, etc.) — existing behavior.

Agent dot colors:
- Autopilot: Cardinal Red
- Morning Brief: amber
- Gmail Sync: blue
- Weekly Review: Palo Alto
- System: neutral

### `AgentActivitySection.jsx`

Used both inside DetailPanel and Activity page. Compact list, same row pattern.

---

## 7. File manifest

| File | Change |
|------|--------|
| `frontend/src/pages/Analytics.jsx` | Compose KPI tiles + charts + funnel + table per Section 3 |
| `frontend/src/components/AnalyticsCharts.jsx` | Apply chart palette, re-skin tooltips/axes |
| `frontend/src/pages/OfferComparison.jsx` | Card grid per Section 4 |
| `frontend/src/components/OfferDetailsSection.jsx` | Re-skin rows |
| `frontend/src/components/OfferSummarySection.jsx` | Total Y1 emphasis |
| `frontend/src/components/OfferNegotiationPanel.jsx` | Re-skin editor |
| `frontend/src/components/OfferEditableCell.jsx` | Inline 28 px input |
| `frontend/src/pages/Tags.jsx` | List per Section 5 |
| `frontend/src/components/TagInput.jsx` | Re-skin tokens + suggestions per Section 5 |
| `frontend/src/pages/Activity.jsx` | List per Section 6 |
| `frontend/src/components/AgentActivitySection.jsx` | Same row pattern |

---

## 8. Acceptance criteria

- [ ] KPI tiles render as 4-up grid with delta arrows colored by direction.
- [ ] Charts use the new palette (Cardinal series-1) and have token-styled tooltips.
- [ ] Funnel renders 5 stages with stage colors and drop-off labels.
- [ ] Offer cards highlight best total (Cardinal border + "Best" badge).
- [ ] Editable cells save on blur with a subtle pulse.
- [ ] Tag rows are 40 px with color dot and count.
- [ ] Tag colors limited to 6 swatches.
- [ ] Activity rows show agent dot, title, timestamp.
- [ ] All component tests pass.
- [ ] Dark theme verified — chart axes & tooltips still readable.

---

## 9. Out of scope

- New analytics metrics.
- Custom date ranges beyond presets.
- CSV export of analytics.
- Per-tag color picker beyond the 6 presets.
- A drag-to-rearrange offer order.

---

## 10. Notes for the implementing agent

- recharts tooltips can be styled via `wrapperStyle` + `contentStyle` props, OR by replacing the whole `<Tooltip>` with a custom component. The custom component gives you full control — use it.
- The Stanford Palo Alto green (#175E54) is dark — verify legibility on `bg-surface-0` (white). Contrast ratio ~9:1 — fine.
- Ghost rate in the Top Companies table: `(applications_without_response / applications) * 100`. Use existing field if backend exposes it; else compute client-side.
