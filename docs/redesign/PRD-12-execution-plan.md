# PRD-12 — Execution Plan

**Status:** Living document — update after each PRD lands
**Depends on:** All PRDs above
**Purpose:** Sequence the work, track progress, define done.

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

12 PRDs is a lot of ground. This file is the project tracker — it tells whoever is picking up the next session what's done, what's blocked, and what's risky. It also captures the *integration* concerns that no single PRD owns: testing strategy, screenshot review, rollout, fallback if something breaks.

---

## 2. Wave plan

The PRDs can't all run in parallel — some are blocked by PRD-00 tokens, others by PRD-01's AppShell. The optimal sequence is **4 waves**.

### Wave 1 — Foundation (1 PRD, must finish first)

| # | PRD | Output |
|---|-----|--------|
| 00 | Design System Foundation | Token map, Inter font, shadcn primitive re-skin |

**Why solo:** Every other PRD reads from the new tokens. Don't fork until this is on `main`.

### Wave 2 — Independent surfaces (4 PRDs, in parallel)

| # | PRD | Output |
|---|-----|--------|
| 01 | App Shell & Navigation | Sidebar + TopBar; deletes NavBar |
| 02 | Marketing & Public | LandingPage, Pricing, Public Pipeline/Timeline |
| 03 | Auth Surface | Login, Register, password flows |
| 11 | Chrome Extension | Popup + content banner |

**Why parallel:** Each touches different files; they only share tokens (PRD-00) which is already done.

**Coordination:** Marketing screenshots will use the unfinished dashboard for now — placeholder SVG until PRD-04 lands.

### Wave 3 — App surfaces (5 PRDs, in parallel after PRD-01)

| # | PRD | Output |
|---|-----|--------|
| 04 | Pipeline (Dashboard) | The biggest single lift |
| 05 | Today & Brief | (depends on PRD-04 stage tokens) |
| 06 | Jobs & Calendar | Job board + calendar |
| 07 | Analytics, Offers, Tags, Activity | Data surfaces |
| 10 | System UI (notifications, banners, modals, toasts) | Cross-cutting visual polish |

**Why parallel:** Each PRD owns a distinct cluster of components. The only overlap is PRD-04 stage colors (`STAGE_COLORS` in `lib/constants.js`) — agreed in PRD-00 §3.4 — so anyone touching stage UI uses the same source.

**Hold:** PRD-05 should land *after* PRD-04 if at all possible because Today's mission row reuses some patterns from ApplicationRow.

### Wave 4 — Specialized surfaces (2 PRDs, in parallel after PRD-04)

| # | PRD | Output |
|---|-----|--------|
| 08 | Settings | 2-column layout + sub-pages |
| 09 | AI Workflows | Co-pilot drawer + AI section pattern |

**Why parallel:** Both depend on tokens + AppShell. PRD-09 also depends on DetailPanel section pattern from PRD-04.

---

## 3. Recommended branch strategy

```
main
 └─ redesign/prd-00-tokens          (Wave 1, merges to main)
     └─ redesign/prd-01-shell        (Wave 2)
     └─ redesign/prd-02-marketing
     └─ redesign/prd-03-auth
     └─ redesign/prd-11-extension
         (each merges to main once approved)
     └─ redesign/prd-04-pipeline    (Wave 3)
     └─ redesign/prd-05-today
     └─ redesign/prd-06-jobs-calendar
     └─ redesign/prd-07-analytics
     └─ redesign/prd-10-system-ui
         (merges)
     └─ redesign/prd-08-settings    (Wave 4)
     └─ redesign/prd-09-ai
```

Each branch merges through PR with:
- Screenshot of the changed surface (light + dark).
- Failing-test triage if any.
- Manual smoke-test note ("logged in, opened dashboard, opened DetailPanel, opened co-pilot").

---

## 4. Risk register

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Tests using class-name assertions break after PRD-00 | High | Sweep tests in PRD-00 PR; update or delete brittle assertions |
| Tailwind purge misses some new tokens | Medium | Keep `safelist` in tailwind.config.js for `brand-*`, `surface-*`, `text-*`, `border-*`, `status-*` |
| Lighthouse SEO drops on landing page | Low | Re-test after PRD-02; preserve meta tags |
| Mobile drawer + bottom-sheet conflict | Medium | Test detail panel + mobile sidebar together (both Radix Dialog) — confirm z-index ladder (sidebar 50, detail 40, banners 30, top header 30, sticky sub-headers 20) |
| Extension popup looks dim on macOS dark mode | Low | Test on both light + dark before approving PRD-11 |
| Co-pilot drawer overlaps DetailPanel | Medium | Both anchor to right edge — design rule: only one open at a time; opening Co-pilot closes DetailPanel and vice versa (or stacks Co-pilot on top with `z-50`) |
| Stage color palette feels too saturated | Low | Apply chart palette consistently; verify in Analytics charts side-by-side |
| Cardinal red doesn't read as "brand" without the wordmark | Low | The wordmark + GitBranch icon are always paired; the dot indicator-pattern uses Cardinal sparingly so it stays meaningful |

---

## 5. Pre-merge checklist (per PRD)

Before opening the PR:

- [ ] All component tests pass (`npm test` in `frontend/`).
- [ ] Extension tests pass (`npm test` in `extension/`) if PRD touches extension.
- [ ] Type-checking / linting clean if configured (`npm run lint`).
- [ ] Storybook (if present) or `/dev/preview` page (if added) renders without console errors.
- [ ] Light + dark theme verified manually for every page in scope.
- [ ] Lighthouse on at least one page in scope: A11y ≥ 95.
- [ ] `prefers-reduced-motion: reduce` disables every transition / animation.
- [ ] No `console.log`, `console.warn`, `console.error` left over.
- [ ] No hard-coded hex colors (`grep "#[0-9A-Fa-f]\{6\}" src/` returns only `tokens.css` + test fixtures + this PRD).
- [ ] No reference to Poppins, clay orange, `accent-blue`, `accent-green`, indigo `#6366F1`.

---

## 6. QA — full app smoke test before final merge

A single test pass after Wave 4 lands:

1. **Auth**: register a new account; verify email; log in; log out; log back in.
2. **Landing → onboarding**: visit `/` logged-out; click CTA; sign up; see onboarding checklist on `/today`.
3. **Capture**: load extension; visit a LinkedIn job; click extension; verify save appears in popup; click "Open in dashboard" → row visible.
4. **Dashboard**: filter by stage; sort by score; open DetailPanel; change stage; add notes; close; reopen; verify notes persist; archive; restore.
5. **Today**: complete a mission; snooze a mission; verify they re-order; open the morning brief; collapse it.
6. **Calendar**: add an interview event; click it; verify detail; check prep item; navigate to linked application.
7. **Jobs**: search; filter remote-only; click row → detail; track → verify it appears in dashboard.
8. **Settings**: change theme (light/dark/system); change density (compact/comfortable); reorder pipeline stages.
9. **Co-pilot**: open drawer with `o`; ask a question; verify streaming; close drawer.
10. **Apply Pack**: open DetailPanel; generate Apply Pack; switch tabs; copy.
11. **Mock interview**: start session; answer 2 questions; end early; verify debrief.
12. **Sharing**: from settings or share modal, generate public pipeline link; open in incognito; verify read-only view.
13. **Notifications**: trigger a banner (offline → toggle network); verify high-severity banner appears + can be dismissed.
14. **Error**: cause a 500 (use DevTools network override); verify ErrorBoundary fallback renders correctly.

Take a screenshot of each surface (light + dark) and save under `docs/redesign/screenshots/`. These become the marketing assets and the regression baseline.

---

## 7. Rollback plan

Each PRD's branch merges to `main` independently. If something is broken, revert the PRD's merge commit. Because PRD-00 tokens are shared, reverting PRD-00 means reverting everything. Avoid that path by:

- Validating PRD-00 in a draft PR with all tests passing + manual smoke on every page (the full app should look "wrong color" but functional after PRD-00 alone).
- Not stacking Wave 2 PRDs on top of an unmerged PRD-00 — wait for the merge first.

---

## 8. Definition of done — for the whole redesign

The redesign is done when:

- All 12 PRDs are merged to `main`.
- A single deploy to `pipelined-zci7h.ondigitalocean.app` shows the new design end-to-end.
- The Chrome extension is rebuilt + zipped + uploaded to the Chrome Web Store (or reloaded locally for staging).
- A demo video (≤ 90 s) walks through Landing → Login → Today → Dashboard → DetailPanel → Co-pilot → Settings, recorded for portfolio + retro.
- A retro doc captures what we'd do differently — saved at `docs/redesign/retro.md` (not committed by these PRDs; written after).

---

## 9. Time estimate

Rough — assuming one motivated agent session per PRD, with research and screenshot reviews:

| Wave | PRDs | Hours |
|------|------|-------|
| 1 | 00 | 4 |
| 2 | 01, 02, 03, 11 | 4 × 3 = 12 (or 1.5 days wall-clock if parallel) |
| 3 | 04, 05, 06, 07, 10 | 5 × 4 = 20 (or 2 days wall-clock if parallel) |
| 4 | 08, 09 | 2 × 3 = 6 |
| QA | Smoke + screenshots + retro | 4 |
| **Total** | | ~46 hours, ~4 days wall-clock with parallel agents |

If sequenced single-threaded (one agent doing everything in order), it's closer to 8–10 working days.

---

## 10. After the redesign — what's next

Out of scope for this redesign but obvious next steps:

- Logo mark redesign (a custom monogram replacing the GitBranch icon).
- Onboarding video / interactive demo.
- Performance pass (image optimization, bundle splitting).
- Mobile app exploration (React Native or PWA).
- Internationalization (English-only today).
- Marketing site CMS (currently hard-coded in `LandingPage.jsx`).
- A11y deep audit by a third party.

None of these are blocking the redesign. They are the natural follow-ups once the foundation is in.
