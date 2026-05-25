# Pipelined Redesign — Linear-inspired with Stanford Cardinal Accents

**Status:** Approved for execution
**Owner:** Joseph
**Start date:** 2026-05-25
**Target completion:** 4 sequential agent sessions (one per PRD wave)

---

## 1. North Star

> Pipelined should *feel* like Linear: dense, calm, keyboard-first, fast. The brand identity is Stanford — **Cardinal Red (#8C1515) on white**, used sparingly as an accent on neutral surfaces. No gradients. No glass. No clay-orange brown.

This redesign is **UX + visual only**. No data models, API contracts, or backend behavior changes. Every existing route keeps its path, every component keeps its props and tests, and every product policy ("no auto-send", "no PDF edit", "no auto-apply") stays untouched.

---

## 2. The two reference apps

### Primary: Linear (`linear.app`)
We are *visually copying* Linear. Things we are adopting wholesale:

- **Sidebar navigation** (240 px, left-anchored, collapsible), not a top bar.
- **Two-column app shell**: sidebar + main canvas; right-side detail drawer slides in over canvas, not as a modal.
- **Dense rows** for list views (28–32 px row height, single-line) — no card-per-row.
- **Subtle borders** (1 px, `rgba(0,0,0,0.06)` on light, `rgba(255,255,255,0.06)` on dark) and almost no shadows.
- **Small radii** (4–8 px), never 12+ unless it's a modal.
- **Tight typography** (Inter, 13 px body, -0.01em tracking, 1.45 line-height for body, 1.2 for UI labels).
- **Status dots** (6 px circle + label) for stages — replace today's pill background washes.
- **Cmd-K palette** is the primary action surface; everything reachable from it.
- **Slash menus** and **keyboard chords** (`g d`, `g c`, `c` to create) — Pipelined already has these, we're keeping them.
- **150–200 ms ease-out** for hovers, **220 ms ease-in-out** for panel slides.

### Brand source: Stanford Identity (`identity.stanford.edu`)
We are *not* copying Stanford's typography or layout — only borrowing the palette.

- **Cardinal Red** `#8C1515` (PMS 201C) — single brand color, used for: primary buttons, primary links, active nav state, focus rings, selection, chart accent 1.
- **Cardinal Dark** `#820000` for hover/pressed.
- **Black** `#2E2D29` — body text on light surfaces.
- **Cool Grey** `#53565A` — secondary text.
- **White** `#FFFFFF` — primary surface.
- Optional sparing use of **Palo Alto** `#175E54` for the "Offer" / success state in charts.

The full brand color reference is in [`PRD-00-design-system.md`](./PRD-00-design-system.md).

### Required Linear sources (read before opening any PRD)

Every implementing agent must read these before writing code. Each PRD also lists them in its own Section 0, but they live here too as the canonical project-wide list.

| Source | What to extract |
|--------|-----------------|
| `linear.app/method` | Linear's design + engineering principles essays. The *why* behind opinionated software. |
| `linear.app/blog` | Posts on typography, motion, color, density, icons, craft. Search: `design system`, `typography`, `motion`, `icon`. |
| `linear.app/` (live home) | Current visual language — top nav height, section rhythm, hover states, scroll cadence. |
| `linear.app/customers` | Card composition + quote treatment for testimonial UI. |
| `linear.app/now` | Changelog format + copy voice. |
| `windframe.dev/styles/linear` | Third-party token extraction: Inter Variable, `tracking-[-0.022em]`, `h-8`/`h-10` buttons, 8–10 px radius, `bg-white/80 backdrop-blur-[20px]` nav. Cross-check against `linear.app` for anything material. |

See [`LINEAR-RESEARCH.md`](./LINEAR-RESEARCH.md) for the full brief with extraction targets, conflict-resolution rules, and citation requirements.

**Rule:** If a PRD spec contradicts a stated Linear principle from these sources, prefer the principle and flag the conflict in the PR description. Stanford Cardinal Red is the *only* color override of Linear's tokens; every other Linear principle stands.

---

## 3. PRD index

PRDs are numbered in **execution order**. Each agent session should pick up the lowest-numbered PRD whose dependencies are complete.

| #     | Title                                  | Depends on | Surface |
|-------|----------------------------------------|------------|---------|
| 00    | [Design System Foundation](./PRD-00-design-system.md) | — | Tokens, theme, shadcn primitives, fonts |
| 01    | [App Shell & Navigation](./PRD-01-app-shell.md) | 00 | Sidebar, top header, command palette |
| 02    | [Marketing & Public Surface](./PRD-02-marketing-public.md) | 00, 01 | Landing, Pricing, Public Pipeline/Timeline |
| 03    | [Auth Surface](./PRD-03-auth.md) | 00 | Login, Register, password flows, callbacks |
| 04    | [Pipeline (Dashboard)](./PRD-04-pipeline.md) | 00, 01 | Dashboard, Kanban, List, Detail panel |
| 05    | [Today & Brief](./PRD-05-today-brief.md) | 00, 01, 04 | TodayPage, Morning Brief, Missions, Onboarding |
| 06    | [Jobs & Calendar](./PRD-06-jobs-calendar.md) | 00, 01 | Job Board, Calendar, event/job detail |
| 07    | [Analytics, Offers, Tags, Activity](./PRD-07-analytics-offers-tags-activity.md) | 00, 01 | Charts, OfferComparison, Tags, Activity |
| 08    | [Settings](./PRD-08-settings.md) | 00, 01 | Settings page + all sub-sections |
| 09    | [AI Workflows](./PRD-09-ai-workflows.md) | 00, 04 | Co-pilot, Apply Pack, Mock Interview, Resume Insights |
| 10    | [System UI](./PRD-10-system-ui.md) | 00, 01 | Notifications, banners, modals, empty/error states, command palette |
| 11    | [Chrome Extension](./PRD-11-extension.md) | 00 | Popup, content banner, manifest |
| 12    | [Execution Plan](./PRD-12-execution-plan.md) | all | Phase order, migration, QA checklist |

---

## 4. Hard constraints (carried over from `CLAUDE.md`)

Every agent implementing a PRD must respect:

1. **300-line file limit, 40-line function limit.** Split if exceeded.
2. **No barrel re-exports.** Direct subpath imports for `lucide-react`, `recharts`, `date-fns`, `lodash`.
3. **300+ existing component tests must pass.** Tests query by role/text/label — they will still pass as long as semantics survive. Visual restyling never breaks them; structural rewrites can.
4. **shadcn/ui primitives** stay the foundation. We re-skin via CSS variables, we do not swap libraries.
5. **Accessibility is non-negotiable**: 4.5:1 contrast minimum for body text, 3:1 for UI components/large text, visible focus rings, `prefers-reduced-motion` honored on every transition.
6. **Dark mode** must be redesigned in lockstep with light mode (Linear is famous for both — the dark mode is the default for many users).

---

## 5. Cross-cutting visual rules

These appear in every PRD's spec but are listed here once as the source of truth:

| Rule | Value |
|------|-------|
| Body font | `Inter Display` (or `Inter` if Display unavailable), 13 px, `-0.011em` tracking, `1.45` line-height |
| UI label font | Inter, 12 px, `500`, `-0.005em` tracking, `1.2` line-height |
| Heading | Inter, 24 px / 20 px / 16 px, `600`, `-0.022em` tracking, `1.2` line-height |
| Monospace | `Berkeley Mono`, `JetBrains Mono`, or system `ui-monospace` fallback |
| Primary | `#8C1515` (Cardinal Red); hover `#820000`; pressed `#6E0F0F` |
| Surface (light) | `#FFFFFF` page, `#FAFAFA` rail, `#F4F4F5` hover, `#EFEFF0` pressed |
| Surface (dark) | `#08090A` page, `#0F1011` rail, `#1A1B1E` hover, `#212226` pressed |
| Border (light) | `rgba(0,0,0,0.06)` default, `rgba(0,0,0,0.10)` strong |
| Border (dark) | `rgba(255,255,255,0.06)` default, `rgba(255,255,255,0.10)` strong |
| Text (light) | `#2E2D29` primary, `#53565A` secondary, `#8E8F94` tertiary |
| Text (dark) | `#F4F4F5` primary, `#A1A1AA` secondary, `#71717A` tertiary |
| Radius | 4 px (badges, dots), 6 px (buttons, inputs), 8 px (cards), 12 px (modals) |
| Shadow | None on cards. `0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)` on popovers only. Modals get `0 20px 60px rgba(0,0,0,0.18)` |
| Motion | Hover 150 ms ease-out · Panel slide 220 ms cubic-bezier(0.22, 0.61, 0.36, 1) · Modal fade 180 ms · Skeleton pulse 1.4 s |
| Focus ring | 2 px Cardinal Red, 2 px offset on light · 1 px Cardinal Red, no offset on dark |

---

## 6. Out of scope for this redesign

- Backend API surface (no new endpoints).
- Data schema changes.
- New features. (We may **remove** a feature flag panel if it doesn't fit Linear's density, but we don't add new ones.)
- Brand logotype overhaul — wordmark "Pipelined" stays. Logo mark may shift in PRD-00.
- Mobile-app shell — we improve mobile responsiveness but no React Native work.
- Email templates, PDF rendering (ReportLab), printed reports.

---

## 7. How to use these PRDs

For each PRD, the implementing agent should:

1. **Read [`LINEAR-RESEARCH.md`](./LINEAR-RESEARCH.md) and the linked Linear sources first.** This is non-negotiable. Surface specs in a PRD describe *what*; the Linear sources explain *why*, which is what you need for edge cases.
2. Read the PRD top-to-bottom *and* the referenced source files before touching code.
3. Stage work in a feature branch (`redesign/prd-XX-shortname`).
4. Update existing tests only when semantics change — visual restyle does not change tests.
5. Run `npm test` in `frontend/` and `npm test` in `extension/` before opening a PR.
6. Take a Chrome DevTools screenshot of each redesigned page (light + dark) and attach to the PR.
7. **Cite at least one Linear source URL in the PR description** in the form: `Followed Linear's [principle] from [URL] §[section]`. This forces real reading, not skimming.
8. Cross-link the PR to this PRD in the description.

When in doubt, the **Linear app and Stanford palette** win — not the original Pipelined design.
