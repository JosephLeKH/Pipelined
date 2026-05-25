# PRD-00 — Design System Foundation

**Status:** Ready to implement
**Depends on:** —
**Blocks:** Every other PRD
**Estimated effort:** 1 agent session (~3–5 hours)

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

The current design system is Anthropic clay orange (`#d97757`) with Poppins display + Inter body, sitting on a warm gray (`#fafafa`) surface. It feels editorial. We want **dense, neutral, productivity-tool** — Linear's spatial system, Stanford's accent color.

Every screen in Pipelined currently reads from `frontend/src/index.css` and `frontend/tailwind.config.js`. Changing these two files is **80 % of the work** in this PRD; the rest is touching up the eight shadcn primitives that hard-code shape or color.

---

## 2. Sources to read first

| What | Where | Purpose |
|------|-------|---------|
| Linear's landing | `linear.app` | Sidebar weight, spacing, color subtlety |
| Linear's docs | `linear.app/docs` (or screenshots in the PR description) | App-shell density, table density, status pills |
| Linear's method page | `linear.app/method` | Typography rhythm |
| Stanford brand | `identity.stanford.edu/design-elements/color/` | Cardinal Red is `#8C1515`, PMS 201C |
| Existing tokens | `frontend/src/index.css`, `frontend/tailwind.config.js` | What to replace |
| Existing shadcn primitives | `frontend/src/components/ui/*` | What to re-skin |

---

## 3. Tokens — the source of truth

These are the **only** color values used anywhere in the codebase after this PRD lands. If a CSS class hard-codes a color outside this list, it's a bug.

### 3.1 Brand

| Token | Value | Use |
|-------|-------|-----|
| `--brand-50`  | `#FDF2F2` | Tinted hover backgrounds, selected list row |
| `--brand-100` | `#FAE0E0` | Soft chip / badge background |
| `--brand-200` | `#F4BFBF` | (rarely used) |
| `--brand-500` | `#B81E1E` | Mid red, used only in charts |
| `--brand-600` | `#8C1515` | **Cardinal Red — primary** (buttons, links, focus, active nav) |
| `--brand-700` | `#820000` | Primary hover |
| `--brand-800` | `#6E0F0F` | Primary pressed |
| `--brand-900` | `#4F0A0A` | Text-on-tinted-background |

### 3.2 Neutrals (light)

| Token | Value | Use |
|-------|-------|-----|
| `--surface-0` | `#FFFFFF` | Page background, card |
| `--surface-1` | `#FAFAFA` | Sidebar, secondary surface |
| `--surface-2` | `#F4F4F5` | Row hover, input filled |
| `--surface-3` | `#EFEFF0` | Pressed state |
| `--text-1`    | `#2E2D29` | Primary text |
| `--text-2`    | `#53565A` | Secondary text |
| `--text-3`    | `#8E8F94` | Tertiary, placeholder |
| `--text-4`    | `#B4B5B9` | Disabled |
| `--border-1`  | `rgba(0,0,0,0.06)` | Default border |
| `--border-2`  | `rgba(0,0,0,0.10)` | Strong border |
| `--border-3`  | `rgba(0,0,0,0.16)` | Input border on focus-within |

### 3.3 Neutrals (dark)

| Token | Value | Use |
|-------|-------|-----|
| `--surface-0` | `#08090A` | Page background |
| `--surface-1` | `#0F1011` | Sidebar |
| `--surface-2` | `#1A1B1E` | Row hover |
| `--surface-3` | `#212226` | Pressed |
| `--text-1`    | `#F4F4F5` | Primary |
| `--text-2`    | `#A1A1AA` | Secondary |
| `--text-3`    | `#71717A` | Tertiary |
| `--text-4`    | `#52525B` | Disabled |
| `--border-1`  | `rgba(255,255,255,0.06)` |
| `--border-2`  | `rgba(255,255,255,0.10)` |
| `--border-3`  | `rgba(255,255,255,0.16)` |

### 3.4 Status (used by chart palette + StagePill dots)

| Stage | Hex | Token name |
|-------|-----|-----------|
| To Apply | `#71717A` (neutral) | `--status-neutral` |
| Applied | `#3B82F6` (blue 500) | `--status-info` |
| Phone Screen | `#8B5CF6` (violet 500) | `--status-violet` |
| Technical | `#F59E0B` (amber 500) | `--status-warn` |
| Onsite | `#F97316` (orange 500) | `--status-orange` |
| Offer | `#175E54` (Stanford Palo Alto) | `--status-success` |
| Rejected | `#71717A` strikethrough | `--status-muted` |
| Withdrawn | `#71717A` strikethrough | `--status-muted` |

These are dots only (6 px circles). The background of a stage pill is *never* tinted — only the dot is colored.

### 3.5 Typography

| Style | Family | Size | Weight | Letter-spacing | Line-height |
|-------|--------|------|--------|----------------|-------------|
| `display-xl` | Inter | 48 px / 56 px desktop | 600 | -0.030em | 1.05 |
| `display-lg` | Inter | 36 px | 600 | -0.024em | 1.1 |
| `display-md` | Inter | 28 px | 600 | -0.022em | 1.15 |
| `heading-1`  | Inter | 20 px | 600 | -0.018em | 1.25 |
| `heading-2`  | Inter | 16 px | 600 | -0.014em | 1.3 |
| `heading-3`  | Inter | 14 px | 600 | -0.010em | 1.35 |
| `body`       | Inter | 13 px | 400 | -0.011em | 1.45 |
| `body-sm`    | Inter | 12 px | 400 | -0.005em | 1.4 |
| `label`      | Inter | 12 px | 500 | -0.005em | 1.2 |
| `mono`       | JetBrains Mono / ui-monospace | 12 px | 400 | 0 | 1.4 |

We are **deleting Poppins entirely** from the project. Inter handles every weight from 400 to 600.

### 3.6 Spacing / radius / shadow

| Token | Value |
|-------|-------|
| `--space-0.5` | 2 px |
| `--space-1`   | 4 px |
| `--space-2`   | 8 px |
| `--space-3`   | 12 px |
| `--space-4`   | 16 px |
| `--space-6`   | 24 px |
| `--space-8`   | 32 px |
| `--space-12`  | 48 px |
| `--space-16`  | 64 px |
| `--radius-sm` | 4 px (badges, dots) |
| `--radius-md` | 6 px (buttons, inputs) |
| `--radius-lg` | 8 px (cards) |
| `--radius-xl` | 12 px (modals, drawer) |
| `--shadow-popover` | `0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04)` |
| `--shadow-modal`   | `0 20px 60px rgba(0,0,0,0.18)` |

Cards on the canvas have **no shadow** — only a 1 px border. This is the single biggest Linear visual cue.

### 3.7 Motion

| Use | Duration | Easing |
|-----|----------|--------|
| Hover background fill | 120 ms | `ease-out` |
| Color shift on text | 100 ms | `ease-out` |
| Panel/drawer slide | 220 ms | `cubic-bezier(0.22, 0.61, 0.36, 1)` |
| Modal fade-in | 180 ms | `ease-out` |
| Skeleton pulse | 1.4 s | `ease-in-out` infinite |
| Toast slide | 200 ms | `ease-out` |

All transitions must wrap in `@media (prefers-reduced-motion: reduce) { transition: none; animation: none; }`.

---

## 4. Files to touch

### 4.1 Replace (full rewrite)

| File | What replaces it |
|------|------------------|
| `frontend/src/index.css` | New token map (Section 3), Inter only, scoped utility layer |
| `frontend/tailwind.config.js` | New `theme.extend` with the tokens above; brand palette renamed `brand`, gray palette replaced with zinc-like scale |

### 4.2 Edit (re-skin)

| File | Change |
|------|--------|
| `frontend/src/components/ui/button.jsx` | Remove rounded-full variants; default radius 6 px; primary uses Cardinal Red; new "tertiary" ghost variant matches Linear nav |
| `frontend/src/components/ui/input.jsx` | 32 px height, 6 px radius, no inner shadow, border `--border-1`, focus border `--border-3` + 1 px Cardinal outline |
| `frontend/src/components/ui/dropdown-menu.jsx` | Popover surface, 6 px radius, `--shadow-popover`, 4 px item padding |
| `frontend/src/components/ui/dialog.jsx` (and modal wrappers) | 12 px radius, `--shadow-modal`, backdrop `rgba(0,0,0,0.40)` blur 4 px on light, `rgba(0,0,0,0.60)` on dark |
| `frontend/src/components/ui/tooltip.jsx` | 8 px radius → 6 px; dark on light + light on dark inverted; 11 px label font |
| `frontend/src/components/ui/badge.jsx` | Remove pill default; new variants `dot` (6 px circle + label), `solid`, `soft` |
| `frontend/src/components/ui/checkbox.jsx` | 14 × 14 px, 4 px radius, Cardinal check |
| `frontend/src/components/ui/select.jsx` | Matches Input shape; chevron 12 px |
| `frontend/src/components/ui/switch.jsx` | 28 × 16 px (smaller than today); thumb 12 px; Cardinal when on |
| `frontend/src/styles/animations.css` | Replace `slideInRight`, `fadeInUp`, `pulseSoft` keyframes with new motion tokens; add `slideUp`, `scaleIn` |

### 4.3 Delete

- All references to Poppins (`font-display`, `fontFamily.display`).
- The legacy `--color-body-bg`, `--color-body-text`, `--color-prose-*`, `--color-shimmer-*` tokens. Replace with the new tokens.
- The `accent-blue` (`#6a9bcc`) and `accent-green` (`#788c5d`) named colors — they are unused in the new palette.
- The `brand-50` through `brand-950` clay-orange palette in `tailwind.config.js`.

### 4.4 Create

- `frontend/src/styles/tokens.css` — single source of truth for the CSS variables in Section 3. Imported once from `index.css`.
- `frontend/src/styles/typography.css` — defines the `display-xl`, `heading-1`, etc. utility classes from Section 3.5.

---

## 5. The shadcn `Button` spec (golden example)

The button is the single most-rendered component. Get this right and the rest falls into place.

```jsx
// Variants
default:    bg-brand-600 text-white         hover:bg-brand-700 active:bg-brand-800
secondary:  bg-surface-2 text-text-1         hover:bg-surface-3 border-border-1
outline:    bg-transparent text-text-1       border-border-2 hover:bg-surface-2
ghost:      bg-transparent text-text-2       hover:bg-surface-2 hover:text-text-1
destructive:bg-transparent text-brand-700    hover:bg-brand-50  (subtle, not loud red)
link:       bg-transparent text-brand-600    hover:underline underline-offset-2

// Sizes
sm:    h-7   px-2.5 text-xs       (28 px tall, 12 px font)
default: h-8 px-3   text-sm       (32 px tall, 13 px font)
lg:    h-9   px-4   text-sm       (36 px tall, 13 px font)
icon:  h-8 w-8                     (square, no padding)

// Always
radius: 6 px
font-weight: 500
transition: background-color 120 ms ease-out, color 100 ms ease-out
focus-visible: outline 2 px solid Cardinal, outline-offset 2 px
disabled: opacity-50, cursor-not-allowed
```

Note: the **destructive** variant is subtle red text on transparent. Linear never uses loud red fills for "delete" because confirmation already gates the action. Loud red is reserved for connection-lost banners.

---

## 6. Fonts — loading strategy

Inter is already loaded via CSS import in `index.html`. Switch to **Inter Variable** to support every weight in one file and avoid layout shift.

In `frontend/index.html` `<head>`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@400;500&display=swap">
```

Remove the existing Poppins `<link>`. Update `<body>` style + `tailwind.config.js`:

```js
fontFamily: {
  sans: ["Inter", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
  mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
},
```

Remove `display` family entirely. Anywhere `font-display` is used, replace with the appropriate heading utility (PRD-01 sweeps these call sites).

---

## 7. Dark mode — the harder half

Linear's dark mode is the spec users compare against. We must:

1. Drive theme via `class="dark"` on `<html>` (already in place via `ThemeContext`).
2. Use **CSS variables only** for color — no Tailwind dark-mode utilities scattered through components.
3. Verify every component renders correctly with `class="dark"` toggled.
4. The Stanford red stays the same hex (`#8C1515`) in both themes; only its surrounding contrast changes.

Add a dev-only debug toggle in `Settings → Appearance` (PRD-08): a per-token contrast lint that turns rows red when they fail 4.5:1.

---

## 8. Acceptance criteria

- [ ] `frontend/src/index.css` contains only the variables in Section 3 + base resets — no legacy color tokens remain.
- [ ] `frontend/tailwind.config.js`'s `theme.extend.colors` exposes `brand.{50…900}`, `surface.{0…3}`, `text.{1…4}`, `border.{1…3}`, `status.{neutral,info,violet,warn,orange,success,muted}`. Removed: `brand` clay-orange scale, `accent-blue`, `accent-green`, `dark-*` namespace.
- [ ] Grep for `"#d97757"`, `"#fae4d4"`, `"Poppins"`, `font-display`, `accent-blue`, `accent-green` returns zero results (excluding test fixtures and this PRD).
- [ ] Every `frontend/src/components/ui/*.jsx` file uses tokens — no hex codes.
- [ ] Light + dark theme both pass WCAG AA on body text (4.5:1) and Cardinal Red on white (which is 9.4:1 — safe everywhere).
- [ ] `npm test` in `frontend/` is green. (Tests use roles/text, so visual restyling shouldn't break them. If any test asserts a class name or computed color, update it.)
- [ ] Storybook (if present) or a one-off `pages/_design-system-preview.jsx` route renders every primitive in light + dark for screenshot review.
- [ ] `prefers-reduced-motion: reduce` disables every transition and animation.

---

## 9. Notes for the implementing agent

- **Do not** add a UI library. shadcn/ui stays. Headless UI stays.
- **Do not** introduce CSS-in-JS. Tailwind utility classes + the CSS variables in `tokens.css` are the only styling surfaces.
- This PRD touches global tokens — work in a single PR, not split. Once it merges, **every other PRD becomes implementable in parallel**.
- The 300-line-per-file rule applies to new files too. `tokens.css` should be ~120 lines, `typography.css` ~60.
- Test the redesign against the existing dashboard before merging — if `StatsBar`, `KanbanCard`, and `ApplicationRow` already look acceptable after only the token swap, PRD-04 will be a much smaller PR.
- The `Stanford Cardinal Red (#8C1515) on white` combination is **9.4 : 1** contrast. It passes WCAG AAA for body text — but the eye reads pure red on pure white as urgent. Use it only for: primary buttons, active states, ≤ 16 px text inline links. Never for body paragraphs.

---

## 10. Out of scope

- Logo redesign. The wordmark "Pipelined" stays in Inter 600, -0.024em. A mark icon may be added later (use a 16×16 SVG branch/git-merge icon in Cardinal for now — already imported as `GitBranch` from lucide).
- Storybook setup if it doesn't already exist. A single static preview route is enough.
- Internationalization. We assume English LTR.
- Print stylesheets / PDF rendering (handled by backend ReportLab).
