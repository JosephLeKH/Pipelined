# PRD-02 — Marketing & Public Surface

**Status:** Ready (blocked on PRD-00, PRD-01)
**Depends on:** PRD-00 (tokens), PRD-01 (none — marketing has its own chrome)
**Estimated effort:** 1.5 agent sessions (landing alone is one)

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

Pipelined's current landing (`frontend/src/pages/LandingPage.jsx`) is editorial — centered hero, a generic three-column feature grid with neutral cards, and a single bottom CTA. It does not match the design language of the rest of the redesigned app.

This PRD **mirrors `linear.app/` as directly as we can** while swapping the brand to Stanford Cardinal Red and the product narrative to job-search. The structure of Linear's landing (verb-led numbered sections, each with a real product UI screenshot, a changelog snippet, a customer-quote row, a horizontal final CTA cluster, and a dark multi-column footer) is the model — section for section.

This PRD also covers Pricing, Public Pipeline, and Public Timeline, since they share the marketing chrome (no app sidebar).

---

## 2. Sources to read first

- **`linear.app`** — top to bottom. Note section numbering (1.0 / 2.0 / 3.0 / 4.0 / 5.0), the alternating direction of UI/copy pairs, the small uppercase eyebrow above each headline, and the footer column structure.
- **`linear.app/now`** — for the changelog snippet pattern.
- **`linear.app/customers`** — for testimonial card composition.
- **`identity.stanford.edu`** — Cardinal Red usage rules; Cardinal `#8C1515` is the single accent.
- Existing files (reference, not preserve):
  - `frontend/src/pages/LandingPage.jsx`
  - `frontend/src/components/HeroSection.jsx`
  - `frontend/src/components/FeaturesSection.jsx`
  - `frontend/src/components/BottomCTA.jsx`
  - `frontend/src/pages/Pricing.jsx`
  - `frontend/src/pages/PublicPipeline.jsx`
  - `frontend/src/pages/PublicTimeline.jsx`

---

## 3. Page-wide rules

| Rule | Value |
|------|-------|
| Background | `bg-surface-0` (#FFFFFF) on every section except footer. **No dark hero.** Linear's hero is light — we mirror that. |
| Section vertical rhythm | 120 px top + 120 px bottom on desktop (96 px on tablet, 72 px on mobile). |
| Max content width | `max-w-6xl` (1152 px) centered, with `px-6` (24 px) gutters. |
| Section divider | A single 1 px `border-border-1` line between sections — **no shadow, no gradient**. |
| Eyebrow above each section headline | 12 px Inter 500, uppercase tracking 0.08em, Cardinal Red. Format: `1.0 — Capture`. |
| Section headline | `display-lg` (40 px desktop / 32 px mobile), 600, tracking -0.025em, `text-text-1`. |
| Section subhead | 18 px 400 `text-text-2`, max-width 640 px, line-height 1.55. |
| Section CTA | Single ghost link `Capture →` 14 px 500 Cardinal Red. Arrow translates 2 px right on hover (120 ms). |
| Scroll-reveal | IntersectionObserver fade-up (8 px y-translate, 320 ms, ease-out). Disabled under `prefers-reduced-motion: reduce`. |
| Hover/active rings | Match PRD-00 — 2 px Cardinal ring on focus-visible only. |

---

## 4. Marketing chrome (top nav + footer)

### 4.1 Top nav

```jsx
<header className="sticky top-0 z-40 border-b border-border-1 bg-surface-0/85 backdrop-blur supports-[backdrop-filter]:bg-surface-0/70">
  <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
    {/* Left: wordmark */}
    <Link to="/" className="flex items-center gap-1.5">
      <GitBranch className="h-4 w-4 text-brand-700" strokeWidth={2} />
      <span className="text-[15px] font-semibold tracking-tight text-text-1">Pipelined</span>
    </Link>

    {/* Center: primary nav */}
    <nav className="hidden md:flex items-center gap-1">
      <NavLink to="/#capture">Product</NavLink>
      <NavLink to="/#changelog">Changelog</NavLink>
      <NavLink to="/#testimonials">Students</NavLink>
      <NavLink to="/pricing">Pricing</NavLink>
    </nav>

    {/* Right: auth */}
    <div className="flex items-center gap-2">
      <Link to="/login" className="text-[13px] font-medium text-text-2 hover:text-text-1">Log in</Link>
      <Link to="/register" className="rounded-md bg-brand-700 px-3 py-1.5 text-[13px] font-medium text-white hover:bg-brand-800 transition-colors duration-120">
        Sign up
      </Link>
    </div>
  </div>
</header>
```

- `NavLink` text: 13 px 500 `text-text-2` → hover `text-text-1`. **No underlines.** 6 px horizontal padding.
- Mobile (`<768 px`): replace primary nav with hamburger that opens a `Sheet` from the right (uses existing shadcn `sheet`). Inside: the four nav links stacked + Log in + Sign up at bottom.
- Top nav height is **56 px** (Linear is 56 px too). The app's AppShell top header is 44 px — they are intentionally different. Marketing reads taller.

### 4.2 Footer (dark)

```
bg-surface-inverse (#08090A)   text-white/70   border-top: 1px border-border-1
6 columns at desktop, 2-up at tablet, 1-up at mobile

╔══════════════════════════════════════════════════════════════════════╗
║  [Pipelined wordmark in white + GitBranch in Cardinal]                ║
║                                                                       ║
║  Product         Features       Company     Resources    Connect    Legal       ║
║  Capture         Today          About       Docs         Contact    Privacy     ║
║  Plan            Co-pilot       Method      Changelog    GitHub     Terms       ║
║  Apply           Apply Pack     Brand       Status       X/Twitter  DPA         ║
║  Prep            Mock Interview Careers     Open source  Discord                ║
║  Review          Resume Insights Students                                       ║
║  Pricing         Autopilot                                                      ║
║                  Watchlist                                                      ║
║                                                                       ║
║  ─────────────── Built by a Stanford CS student · © 2026 ────────────── ║
╚══════════════════════════════════════════════════════════════════════╝
```

- Column heading: 11 px Inter 600 uppercase tracking 0.08em `text-white/55`.
- Column link: 13 px Inter 400 `text-white/75` → hover `text-white`. Stacked, 8 px row gap.
- Wordmark block sits left of the columns on desktop, above them on tablet/mobile.
- Bottom row: 12 px italic `text-white/55`, centered, with a 1 px `border-white/10` above it.
- Many of these links may not exist yet (Method, Brand, Status, etc.). Render the column but link each to `/#TODO` and add a `data-stub="true"` attribute. **Do not 404** — for unbuilt links, render a `<button>` styled like a link that opens a toast: "Coming soon". This is more honest than fake pages.

---

## 5. Landing page — section by section

The page reads **top-to-bottom** as 9 sections in this order:

```
1. Hero
2. Capture            (1.0)
3. Plan               (2.0)
4. Apply              (3.0)
5. Prep               (4.0)
6. Review             (5.0)
7. Changelog
8. Students (testimonials)
9. Final CTA cluster
[footer]
```

### 5.1 Hero

```
┌────────────────────────────────────────────────────────────────────┐
│  [eyebrow pill — optional]   "Built for Stanford CS students"       │
│                                                                    │
│  The pipeline for                                                  │
│  your job search.                                                  │
│                                                                    │
│  Capture every application from one-click save to signed offer.    │
│  Designed for the AI era of recruiting.                            │
│                                                                    │
│  [ Sign up — free ]    [ Watch the demo  ↗ ]                       │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                                                              │  │
│  │   PRODUCT SCREENSHOT — Today page (mission list)             │  │
│  │   1280 × 720, light theme, no shadow, 1px border, radius 12  │  │
│  │                                                              │  │
│  └──────────────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────────────┘
```

| Element | Spec |
|---------|------|
| Eyebrow pill (optional) | 24 px tall, `bg-surface-1 border-border-1 rounded-full`, 12 px 500 `text-text-2`, 6 px dot before text in Cardinal Red, 12 px horizontal padding. Sits 16 px above headline. |
| Headline | `display-xl` (56 px desktop / 36 px mobile), 600, tracking **-0.030em**, `text-text-1`, max-width 880 px, line-height 1.05. Two lines on desktop — break manually after "for". |
| Subhead | 18 px 400 `text-text-2`, max-width 560 px, line-height 1.55, 24 px top gap from headline. |
| Primary CTA | Button `lg` (36 px tall), Cardinal Red (`bg-brand-700` → hover `bg-brand-800`), white text, 14 px 500. |
| Secondary CTA | Ghost link, 14 px 500 `text-text-2` → hover `text-text-1`. `↗` icon 12 px, 4 px left gap. Opens a placeholder modal "Demo coming soon" until we shoot one. |
| CTA spacing | 12 px gap between buttons. 40 px top gap from subhead. 80 px bottom gap to screenshot. |
| Hero screenshot | 1280 × 720 PNG at `frontend/public/screenshots/hero-today.png`. Light theme. Render with `<img loading="eager" decoding="async" width="1280" height="720" className="rounded-xl border border-border-1">`. **No drop shadow** — Linear's hero screenshot has no shadow either. |
| Hero height | Centered vertically in a min-height of 720 px desktop, 560 px mobile. Top padding 96 px from nav. |

**Why we differ from Linear's hero on one point:** Linear shows three product screenshots side-by-side. We show one. Reason: three at our scale (less complex product, smaller screenshots) would feel busy. The single screenshot lets Today (our most distinctive screen) carry the hero.

### 5.2 Section 1.0 — Capture (Chrome extension)

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  1.0 — CAPTURE                          [text on left]             │
│                                                                    │
│  Capture every job in one click.                                   │
│                                                                    │
│  The Chrome extension reads LinkedIn, Greenhouse, Lever,           │
│  Workday, and 6 more boards. AI parses the JD, contacts, and       │
│  salary band into a structured row — no copy-paste.                │
│                                                                    │
│  Capture →                                                         │
│                                                                    │
│  [screenshot of extension popup right]                             │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

- 2-column grid: text-left / screenshot-right on desktop. 64 px column gap. Mobile: stacked, text first.
- Screenshot: 800 × 600 PNG `frontend/public/screenshots/section-capture.png` — shows the extension popup over a faint LinkedIn job page background.
- 3 sub-bullets below the subhead, each prefixed with a 12 px Cardinal check mark:
  - "One-click save across 10 boards"
  - "AI-parsed JD, contact, and salary band"
  - "Captures resume version + tags in one shot"
- Bullet text: 14 px 400 `text-text-2`.

### 5.3 Section 2.0 — Plan (Today + Morning Brief)

```
┌────────────────────────────────────────────────────────────────────┐
│  [screenshot of Today page left]                                   │
│                                                                    │
│  2.0 — PLAN                            [text on right]             │
│                                                                    │
│  Know what to do this morning.                                     │
│                                                                    │
│  Today ranks every open thread — interviews to confirm,            │
│  follow-ups to send, applications to write — into one calm         │
│  list. Morning Brief lands in your inbox by 8 AM.                  │
│                                                                    │
│  Plan →                                                            │
└────────────────────────────────────────────────────────────────────┘
```

- 2-column grid: **screenshot-left / text-right** on desktop (alternates from Section 1.0). Mobile: stacked, text first.
- Screenshot: 800 × 600 PNG of `/today` with 3-5 mission rows + collapsed morning brief banner.
- 3 sub-bullets:
  - "Mission scorer ranks what matters today"
  - "Snooze, complete, or open with `j`/`k`/`Enter`"
  - "Morning Brief in your inbox at 8 AM local"

### 5.4 Section 3.0 — Apply (Co-pilot + Apply Pack)

```
┌────────────────────────────────────────────────────────────────────┐
│  3.0 — APPLY                            [text on left]             │
│                                                                    │
│  Draft a great application in two minutes.                         │
│                                                                    │
│  Apply Pack generates a tailored resume bullet set, cover          │
│  letter, and "Why this company" answer from the JD. Co-pilot       │
│  answers anything else — grounded in your real pipeline.           │
│                                                                    │
│  Apply →                                                           │
│                                                                    │
│  [screenshot of Apply Pack tabs in DetailPanel right]              │
└────────────────────────────────────────────────────────────────────┘
```

- 2-column: text-left / screenshot-right (alternates back).
- Screenshot: 800 × 600 PNG showing DetailPanel with Apply Pack tabs.
- 3 sub-bullets:
  - "No auto-send — you copy, you send"
  - "Cited from your résumé and the JD"
  - "Streams in 8-10 seconds via OpenRouter"
- **Compliance hook**: explicit "No auto-send" sub-bullet preserves the product policy from CLAUDE.md and signals trust to recruiters reading the landing page.

### 5.5 Section 4.0 — Prep (Mock Interview)

```
┌────────────────────────────────────────────────────────────────────┐
│  [screenshot of Mock Interview live left]                          │
│                                                                    │
│  4.0 — PREP                            [text on right]             │
│                                                                    │
│  Rehearse before the real call.                                    │
│                                                                    │
│  Mock Interview runs a live SSE session in your browser —          │
│  behavioural or technical, scored against the role. Debrief        │
│  surfaces what to fix before the recruiter calls.                  │
│                                                                    │
│  Prep →                                                            │
└────────────────────────────────────────────────────────────────────┘
```

- 2-column: screenshot-left / text-right.
- Screenshot: 800 × 600 PNG showing Mock Interview mid-session (question card + transcript pane).
- 3 sub-bullets:
  - "Behavioural + technical question banks per role"
  - "Streaming via SSE — feels like a real call"
  - "Debrief with strengths, gaps, and recommended drills"

### 5.6 Section 5.0 — Review (Analytics + Weekly Review)

```
┌────────────────────────────────────────────────────────────────────┐
│  5.0 — REVIEW                          [text on left]              │
│                                                                    │
│  See where time goes.                                              │
│                                                                    │
│  Pipeline funnel, ghost rate per company, response time            │
│  trends — and a Weekly Review email every Monday with what         │
│  moved and what stalled.                                           │
│                                                                    │
│  Review →                                                          │
│                                                                    │
│  [screenshot of Analytics page right — funnel + KPI tiles]         │
└────────────────────────────────────────────────────────────────────┘
```

- 2-column: text-left / screenshot-right.
- Screenshot: 800 × 600 PNG of `/analytics` showing 4 KPI tiles + funnel + top companies table.
- 3 sub-bullets:
  - "Pipeline funnel with stage drop-off"
  - "Ghost-rate ranking per company"
  - "Weekly Review email every Monday"

### 5.7 Changelog snippet

```
┌────────────────────────────────────────────────────────────────────┐
│                                                                    │
│  CHANGELOG                                                         │
│                                                                    │
│  Mock Interview · Live SSE rehearsals                May 18         │
│  Watchlist · Daily career-page scans                 May 09         │
│  Apply Pack v2 · Cited bullets + CL draft            Apr 27         │
│  Autopilot · Approve-only mode                       Apr 14         │
│                                                                    │
│  View changelog →                                                  │
└────────────────────────────────────────────────────────────────────┘
```

- Section background: `bg-surface-1` (#FAFAFA) — the only section that breaks the white. This is the "zebra stripe" that Linear uses sparingly.
- 4-row list. Each row: 56 px tall, 1 px `border-border-1` bottom (last row no border).
- Row left: 14 px 500 `text-text-1` title + ` · ` separator + 13 px 400 `text-text-2` description.
- Row right: 12 px 500 `text-text-3` date, right-aligned.
- "View changelog →" link below the list, 14 px 500 Cardinal Red.
- For now, the 4 entries can be hard-coded in `LandingChangelog.jsx`. A real `/changelog` page is out of scope (stub link to `/#changelog` and toast "Full changelog coming soon").

### 5.8 Students (testimonials)

```
┌──────────────────────────────────────────────────────────────────────────┐
│  Loved by students at top CS programs                                     │
│                                                                          │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐        │
│  │ "Pipelined cut   │  │ "Today is the    │  │ "Apply Pack saved│        │
│  │  my Sunday job-  │  │  only thing that │  │  me 30 min per   │        │
│  │  search session  │  │  kept me sane    │  │  application.    │        │
│  │  from 4 hours    │  │  during fall     │  │  Recruiters keep │        │
│  │  to 40 minutes." │  │  recruiting."    │  │  asking what     │        │
│  │                  │  │                  │  │  tool I use."    │        │
│  │  — Maya R.       │  │  — Daniel K.     │  │  — Priya S.      │        │
│  │  Stanford CS '27 │  │  MIT EECS '26    │  │  Berkeley EECS'26│        │
│  └──────────────────┘  └──────────────────┘  └──────────────────┘        │
│                                                                          │
│  Trusted by students from Stanford, MIT, Berkeley, CMU, Waterloo.        │
└──────────────────────────────────────────────────────────────────────────┘
```

- Section headline: `display-md` (28 px) 600 `text-text-1`, centered.
- 3 testimonial cards in a 3-up grid (1-up on mobile, 80 px gap between rows).
- Card: `bg-surface-0 border border-border-1 rounded-xl p-6`, height 240 px desktop.
- Card body: 15 px 400 `text-text-1`, line-height 1.55, line-clamp 5.
- Card attribution: 13 px 600 `text-text-1` name + 12 px 400 `text-text-3` school/year on next line.
- **Quotes for v1 can be invented and reviewed with Joseph** before launch. Mark each card `data-placeholder="true"` and add a TODO comment so we can swap them with real quotes once we have permission. Do not invent specific real names — use first-name + last-initial like the example to make it obvious these are placeholders.
- Below the grid: a one-line stat in 14 px 500 `text-text-2`, centered, 40 px top gap.

### 5.9 Final CTA cluster

```
┌──────────────────────────────────────────────────────────────────────────┐
│                                                                          │
│  Built for students.                                                     │
│  Available today.                                                        │
│                                                                          │
│  ┌────────────────┐ ┌──────────────────┐ ┌──────────────────┐            │
│  │  Sign up free  │ │  Open app        │ │  Install extension│           │
│  └────────────────┘ └──────────────────┘ └──────────────────┘            │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

- Section background: `bg-surface-1`.
- Headline: `display-lg` (40 px), 600, centered, two lines, tracking -0.025em.
- CTA cluster: 3 buttons in a horizontal row (stacks to vertical at `<640 px`).
  - `Sign up free` — primary, Cardinal Red, 36 px tall.
  - `Open app` — secondary (border `border-border-2`, white bg, `text-text-1`). Hidden if user is logged out (gated via existing `useAuth`).
  - `Install extension` — secondary, links to Chrome Web Store URL (placeholder `chrome://stub` until published — until then, opens a modal "Coming to the Chrome Web Store").
- Section height: 320 px desktop, 240 px mobile.

---

## 6. Pricing page (`/pricing`)

Linear's pricing has 3 tiers; we have 2 (Free / Pro). Same card structure, narrower grid.

```
   ─────────── Pricing ───────────

   Built for students. Priced for students.

   ┌──── Free ────────────────┐  ┌──── Pro ─────── (Cardinal border) ─┐
   │ $0                       │  │ $5/mo                                │
   │ Everything you need to   │  │ For an active job-search season      │
   │ track an active search   │  │                                       │
   │                          │  │                                       │
   │ ✓ 50 applications        │  │ ✓ Unlimited applications              │
   │ ✓ Kanban + list views    │  │ ✓ Unlimited Co-pilot                  │
   │ ✓ Chrome extension       │  │ ✓ Apply Pack + Mock Interview         │
   │ ✓ Today + Morning Brief  │  │ ✓ Autopilot + Watchlist               │
   │ ✓ 10 Co-pilot msgs/day   │  │ ✓ Resume Insights                     │
   │                          │  │ ✓ Priority support                    │
   │                          │  │                                       │
   │ [ Get started ]          │  │ [ Upgrade ]                           │
   └──────────────────────────┘  └───────────────────────────────────────┘

   ─────────── FAQ ───────────
   ▸ Can I cancel anytime?
   ▸ Do you store my resume?
   ▸ How is my data used?
   ▸ What boards work with the extension?
   ▸ Is the Stanford branding affiliated?   ← clarifies independence
```

- Card: `border border-border-1 bg-surface-0 rounded-xl p-8`, no shadow.
- Pro card: `border-brand-700` (2 px), and a 24 px tall Cardinal "Best for full season" badge top-right.
- Price: `display-md` (28 px) 600, with `/mo` in 14 px 500 `text-text-3` baseline-aligned.
- Bullet check icon: 14 × 14 `text-brand-700`, 8 px gap to label.
- Bullet text: 14 px 400 `text-text-1`.
- CTA: 36 px tall button. Free → ghost `border-border-2`. Pro → solid Cardinal.
- FAQ uses shadcn `Accordion`, re-skinned per PRD-00: 14 px 500 row, 16 px row vertical padding, chevron right 12 px, 1 px bottom divider per row.
- New FAQ entry "**Is the Stanford branding affiliated?**" is required for honesty: "No — Pipelined is built by a Stanford CS student but is not affiliated with or endorsed by Stanford University. Cardinal Red is used as a personal brand homage."

---

## 7. Public Pipeline & Public Timeline

These render a read-only snapshot of a user's pipeline (`/pipeline/:slug`) or timeline (`/shared/timeline/:slug`). They sit behind the marketing chrome (top nav, footer) — **no AppShell sidebar**.

### 7.1 Layout

```
[marketing top nav]

┌────────────────────────────────────────────────────────────────────┐
│  Joseph Le · CS internship search · Spring '26                     │
│  45 applications · 8 interviews · 2 offers                         │
│                                                                    │
│  ┌────────────────────────────────────────────────────────────────┐│
│  │  Want to track yours?  [ Track yours →]      (Cardinal bar)   ││
│  └────────────────────────────────────────────────────────────────┘│
│                                                                    │
│  ── Pipeline stages ──                                             │
│  [horizontal stage row: To Apply ● 12 · Applied ● 18 · …]          │
│                                                                    │
│  ── Applications (read-only list) ──                               │
│  [dense list, no actions, no checkboxes, no detail drawer]         │
└────────────────────────────────────────────────────────────────────┘

[marketing footer]
```

### 7.2 Specs

- Top metadata: 14 px 500 `text-text-3` label row + 16 px 600 `text-text-1` value row.
- CTA bar: full-width inside the content column, `bg-brand-50 border-y border-border-1`, 16 px vertical padding. Left: Cardinal text 14 px 500. Right: a solid Cardinal button → `/register`.
- Stage strip: horizontal row of chips, each `bg-surface-1 border-border-1 rounded-md px-3 py-1.5 text-[13px] font-medium text-text-1`, with a 6 px stage dot on the left. 100% width, scrolls horizontally on mobile.
- Application list rows: same component as PRD-04's `ApplicationRow` but with `readOnly` prop set — hides checkboxes, hover menu, row chevron. Rows stay 40 px.
- No DetailPanel; clicks on a row are no-ops (or open a "Sign up to see details" modal).

### 7.3 Public Timeline

Renders a vertical chronological timeline of milestones (applied, interview, offer, rejection) per application. Uses the timeline component from PRD-04 with the same `readOnly` prop. Marketing chrome wraps it.

---

## 8. File manifest

### 8.1 Edit (existing files)

| File | Change |
|------|--------|
| `frontend/src/pages/LandingPage.jsx` | Rewrite top-down: compose `<MarketingNav />`, `<Hero />`, `<SectionCapture />`, `<SectionPlan />`, `<SectionApply />`, `<SectionPrep />`, `<SectionReview />`, `<LandingChangelog />`, `<TestimonialGrid />`, `<FinalCTA />`, `<MarketingFooter />`. Preserve `useAuth → Navigate to /today` redirect at top of file. |
| `frontend/src/components/HeroSection.jsx` | Replace contents with Section 5.1 hero. Renames suggested but optional — file can stay. |
| `frontend/src/components/FeaturesSection.jsx` | Delete this file (existing 11-tile grid is gone). |
| `frontend/src/components/BottomCTA.jsx` | Delete this file (replaced by `FinalCTA.jsx` with 3-button cluster). |
| `frontend/src/pages/Pricing.jsx` | Two-card layout per Section 6, including new FAQ row about Stanford. |
| `frontend/src/pages/PublicPipeline.jsx` | Apply marketing chrome + stage strip + read-only list. Pass `readOnly` to row component. |
| `frontend/src/pages/PublicTimeline.jsx` | Apply marketing chrome + timeline component in `readOnly` mode. |

### 8.2 Create

| File | Purpose |
|------|---------|
| `frontend/src/components/marketing/MarketingNav.jsx` | Top nav (Section 4.1). |
| `frontend/src/components/marketing/MarketingFooter.jsx` | Dark 6-column footer (Section 4.2). |
| `frontend/src/components/marketing/NumberedSection.jsx` | Reusable wrapper for sections 1.0–5.0 — props: `number`, `eyebrow`, `headline`, `subhead`, `bullets[]`, `ctaLabel`, `ctaHref`, `screenshot`, `imageSide: "left" \| "right"`. |
| `frontend/src/components/marketing/LandingChangelog.jsx` | Changelog snippet (Section 5.7) — 4 hard-coded entries for now. |
| `frontend/src/components/marketing/TestimonialGrid.jsx` | 3-card grid (Section 5.8). |
| `frontend/src/components/marketing/TestimonialCard.jsx` | Single card primitive. |
| `frontend/src/components/marketing/FinalCTA.jsx` | Section 5.9 — 3-button cluster. |
| `frontend/src/components/marketing/PricingCard.jsx` | Reusable pricing tier card. |
| `frontend/public/screenshots/hero-today.png` | Placeholder until PRD-04 ships, then real. 1280 × 720. |
| `frontend/public/screenshots/section-capture.png` | Extension popup screenshot. 800 × 600. |
| `frontend/public/screenshots/section-plan.png` | Today page screenshot. 800 × 600. |
| `frontend/public/screenshots/section-apply.png` | Apply Pack screenshot. 800 × 600. |
| `frontend/public/screenshots/section-prep.png` | Mock Interview screenshot. 800 × 600. |
| `frontend/public/screenshots/section-review.png` | Analytics screenshot. 800 × 600. |

### 8.3 Delete

- `frontend/src/components/FeaturesSection.jsx` (11-tile grid replaced by 5 numbered sections).
- `frontend/src/components/BottomCTA.jsx` (replaced by `FinalCTA.jsx`).
- The 11-feature `FEATURES` array in `LandingPage.jsx` (the 5 numbered sections subsume it).

---

## 9. Acceptance criteria

- [ ] `/` (logged out) renders the full marketing landing in the order: Hero → 1.0 → 2.0 → 3.0 → 4.0 → 5.0 → Changelog → Students → Final CTA → Footer.
- [ ] `/` (logged in) redirects to `/today`. Behavior preserved from existing `useAuth` check.
- [ ] Marketing nav is sticky, 56 px tall, white with 85% backdrop blur, has 4 primary links + Log in + Sign up.
- [ ] Footer is dark (`bg-surface-inverse`), 6 columns at desktop, 2-up at tablet, 1-up at mobile, with a bottom italic credit line.
- [ ] All 5 numbered sections render their eyebrow (`1.0 — CAPTURE`) in Cardinal Red, 12 px 500 uppercase tracking 0.08em.
- [ ] Sections alternate image-right / image-left / image-right / image-left / image-right (1.0 right, 2.0 left, 3.0 right, 4.0 left, 5.0 right).
- [ ] Sections 5.7 (changelog) and 5.9 (final CTA) are on `bg-surface-1`; all others on `bg-surface-0`.
- [ ] Hero CTA primary is Cardinal 36 px, secondary is ghost with `↗` icon.
- [ ] Testimonial cards have placeholder quotes flagged with `data-placeholder="true"` and a TODO comment.
- [ ] Pricing renders 2 cards, Pro has 2 px Cardinal border + "Best for full season" badge.
- [ ] Pricing FAQ includes "Is the Stanford branding affiliated?" with the disclaimer answer.
- [ ] Public Pipeline page (`/pipeline/:slug`) renders un-authenticated with marketing chrome + stage strip + read-only list + Cardinal CTA bar.
- [ ] Public Timeline page (`/shared/timeline/:slug`) renders un-authenticated with marketing chrome + read-only timeline.
- [ ] All screenshots use explicit `width`/`height` to prevent layout shift. Hero `loading="eager"`, others `loading="lazy"`.
- [ ] No clay-orange (`#d97757`) references remain. No Poppins font references remain.
- [ ] All existing landing tests pass (`LandingPage.test.jsx`, `Pricing.test.jsx`, `PublicPipeline.test.jsx`, `PublicTimeline.test.jsx`). Update tests if copy changed.
- [ ] Lighthouse on `/`: SEO ≥ 95, Best Practices ≥ 95, A11y ≥ 95.
- [ ] Reduced motion: scroll-reveals and CTA hover translations disabled under `prefers-reduced-motion: reduce`.

---

## 10. Out of scope

- Animated product demos (Lottie, Rive, video) — static screenshots only for v1.
- A live interactive tab-switcher feature block (Linear does not actually use one in their current landing — section visuals are static screenshots).
- A real `/changelog` page; the section is hard-coded for v1.
- A real customers page; `/customers` is not built.
- A working Chrome Web Store link until the extension is published.
- Internationalization (English-only).
- Blog or method pages.
- A11y deep audit beyond Lighthouse ≥ 95.
- Replacing the GitBranch icon with a custom logomark (separate logo design project).

---

## 11. Notes for the implementing agent

- **`LandingPage.jsx` will exceed 300 lines if you inline everything.** Split into section components under `components/marketing/`. Each section file should be < 80 lines.
- **`NumberedSection.jsx` is the workhorse** — Sections 1.0–5.0 all instantiate it. Get the props API right and the rest is data.
- **Screenshots are the highest-value asset.** Until PRD-04 ships, render placeholder SVGs with the correct aspect ratio + a subtle "Screenshot coming with PRD-04" label centered. Do **not** ship blurry mockups — placeholders are more honest.
- **The "zebra stripe" (light → off-white → light)** is the only visual contrast on the page. Don't add gradients, glows, or shadows to "spice it up" — Linear's restraint is the point.
- **No emoji icons** anywhere on this page. Use `lucide-react` with direct subpath imports per CLAUDE.md (e.g., `lucide-react/dist/esm/icons/check`).
- **Cardinal is sparing.** It appears in: top-nav Sign up button, section eyebrows, sub-bullet check marks, sub-bullet section CTA arrows, hero CTA primary, Pro pricing border + badge + button, CTA bar on public pages, footer Pipelined wordmark dot, final CTA primary button. Nowhere else.
- **Trust signals on a job-search product are critical.** The "No auto-send" sub-bullet in 3.0 Apply, the Stanford disclaimer in Pricing FAQ, and the placeholder testimonial flags are all there for honesty. Keep them.
- **The agent should preview `/`, `/pricing`, and a sample `/pipeline/test-slug` in Chrome DevTools MCP before opening the PR.** Take screenshots in light and dark theme (dark theme = footer only, the rest is light-only marketing). Save under `docs/redesign/screenshots/landing-{section}-{light|dark}.png`.
