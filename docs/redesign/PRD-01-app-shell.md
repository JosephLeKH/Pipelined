# PRD-01 — App Shell & Global Navigation

**Status:** Ready (blocked on PRD-00)
**Depends on:** PRD-00
**Blocks:** PRD-04, PRD-05, PRD-06, PRD-07, PRD-08, PRD-10
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

Pipelined currently has a horizontal top NavBar (`frontend/src/components/NavBar.jsx`) with 9 links, breaking density and visual hierarchy. Linear puts navigation on the left in a 240 px sidebar; the top of the canvas is reserved for **page-local context** (filters, view toggles, page title, page actions).

We are replacing the top NavBar with a **left sidebar + thin top header**. Existing routes do not change. Existing keyboard chords (`g d`, `g c`, etc.) keep working.

---

## 2. Sources to read first

- `linear.app/docs` — sidebar density, group spacing, badge placement (your favorite app you already use daily).
- `frontend/src/components/NavBar.jsx` — current top-nav implementation (delete this).
- `frontend/src/App.jsx` — routing and `AuthenticatedShell` (modify).
- `frontend/src/pages/Dashboard.jsx` (and every other protected page) — they all render `<NavBar />` directly (need to remove).
- `frontend/src/components/CommandPalette.jsx` — cmd-K palette (re-skin).
- `frontend/src/components/CoPilotPanel.jsx` — right-side drawer (re-skin).
- `frontend/src/components/NotificationBell.jsx` — popover (re-skin).

---

## 3. Target architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ [Sidebar 240px]            │ [Top header 44px]                  │
│                            │ ─────────────────────────────────  │
│ Pipelined ▼                │  Dashboard      [search]   [⌘K]   │
│                            │ ─────────────────────────────────  │
│ ── Workspace ──            │                                    │
│  ▢ Today               •5  │                                    │
│  ▢ Inbox               •2  │                                    │
│  ▢ Dashboard               │            <Outlet />              │
│  ▢ Job Board               │                                    │
│  ▢ Calendar                │                                    │
│  ▢ Analytics               │                                    │
│  ▢ Activity                │                                    │
│  ▢ Tags                    │                                    │
│  ▢ Offers   (conditional)  │                                    │
│                            │                                    │
│ ── Account ──              │                                    │
│  ▢ Settings                │                                    │
│  ⤤ Open Co-pilot           │                                    │
│                            │                                    │
│ ─────────────────          │                                    │
│ [avatar] joseph@...     ⌄  │                                    │
└─────────────────────────────────────────────────────────────────┘
```

- **Sidebar width:** 240 px desktop, collapsible to 56 px (icon-only) via `[` keyboard shortcut (Linear convention).
- **Mobile:** sidebar slides over canvas as a drawer (translateX with backdrop) — same trigger as today's hamburger.
- **Top header:** 44 px tall, contains page title (auto-derived from route), search input (240 px, opens cmd-K on focus), cmd-K affordance pill, notification bell, theme toggle, user avatar.
- **Logo area:** 48 px tall, shows `Pipelined` wordmark + chevron that opens a future "workspace switcher" menu (placeholder for now — opens user menu).

---

## 4. File manifest

### 4.1 Create

| File | Purpose | Approx lines |
|------|---------|-------------|
| `frontend/src/components/shell/AppShell.jsx` | Outer layout: `<Sidebar /> + <TopBar /> + <Outlet />` | 90 |
| `frontend/src/components/shell/Sidebar.jsx` | Left rail with logo, nav groups, user footer | 180 |
| `frontend/src/components/shell/SidebarNavItem.jsx` | One row: icon + label + optional badge | 60 |
| `frontend/src/components/shell/TopBar.jsx` | Page title + search + cmd-K pill + bell + theme + avatar | 140 |
| `frontend/src/components/shell/MobileSidebar.jsx` | Slide-over drawer wrapper using Radix Dialog | 90 |
| `frontend/src/hooks/useSidebarCollapsed.js` | LocalStorage-persisted bool + `[` shortcut binding | 40 |
| `frontend/src/lib/routeMeta.js` | Map of `pathname → { title, icon, group }` | 60 |

### 4.2 Edit

| File | Change |
|------|--------|
| `frontend/src/App.jsx` | Wrap every protected route in `<AppShell>`; lift `<AuthenticatedShell>` (CoPilot, ShortcutHelp, EmailVerificationBanner) into the AppShell |
| `frontend/src/pages/Dashboard.jsx` | Remove `<NavBar />` and the outer `<div className="flex min-h-screen flex-col bg-background">` wrapper |
| Every other page that renders `<NavBar />`: `Calendar.jsx`, `Analytics.jsx`, `JobBoard.jsx`, `Activity.jsx`, `Settings.jsx`, `OfferComparison.jsx`, `Tags.jsx`, `TodayPage.jsx`, `PendingInboxPage.jsx`, `MorningBriefPage.jsx` | Same — remove the NavBar render and outer wrapper. AppShell provides them. |
| `frontend/src/components/CommandPalette.jsx` | Re-skin per PRD-00 (popover surface, 12 px radius, shadow-modal, 13 px item rows) |
| `frontend/src/components/NotificationBell.jsx` | Re-skin popover; move bell into TopBar |
| `frontend/src/components/CoPilotPanel.jsx` | Anchor right-side drawer (480 px, slides in 220 ms); re-skin per PRD-00 |
| `frontend/src/components/EmailVerificationBanner.jsx` | Move banner inside `<AppShell>` above TopBar, not above NavBar |
| `frontend/src/components/OfflineBanner.jsx` | Same — render inside AppShell, above sidebar+canvas |
| `frontend/src/components/ShortcutHelp.jsx` | Add a row for `[` (collapse sidebar) and update the cmd-K affordance copy |

### 4.3 Delete

- `frontend/src/components/NavBar.jsx` (and `NavBar.test.jsx` — replace with `AppShell.test.jsx` covering routing + active state).

---

## 5. Sidebar spec

### 5.1 Layout

```jsx
<aside className="
  group flex h-screen flex-col border-r border-border-1 bg-surface-1
  w-[240px] data-[collapsed=true]:w-[56px]
  transition-[width] duration-200 ease-out
">
  <Logo />              // 48 px row, padding 12 px
  <NavGroups />         // scroll if overflow
  <UserMenu />          // 56 px row, sticky-bottom
</aside>
```

### 5.2 Nav groups

```
Workspace
  - Today              (Sun icon)         /today          chord "g t"
  - Inbox              (Inbox icon)       /inbox/pending  chord "g i"   badge: pending
  - Dashboard          (Layout icon)      /dashboard      chord "g d"
  - Job Board          (Briefcase icon)   /jobs           chord "g j"
  - Calendar           (CalendarDays)     /calendar       chord "g c"
  - Analytics          (BarChart2)        /analytics      chord "g a"
  - Activity           (Activity)         /activity
  - Tags               (Tag)              /tags
  - Offers             (Trophy)           /offers         (conditional: shown only if hasOffers === true)

Account
  - Settings           (Settings)         /settings       chord "g s"
  - Open Co-pilot      (Bot)              opens drawer    chord "o"     (button, not link)
```

Group label: 11 px, 500, `text-text-3`, uppercase, letter-spacing 0.06em, padding 16 px left 8 px bottom.
Nav row: 32 px tall, 8 px gap icon→label, 13 px label, `text-text-2`, hover `bg-surface-2 text-text-1`, active `bg-surface-2 text-brand-600 + 2 px Cardinal left bar`.

Badge (Inbox count): 16 px tall, 6 px horizontal padding, `bg-surface-3 text-text-2` (subtle), 11 px font, radius 4 px. Cardinal red only when overdue follow-ups exist (the bell already covers urgent — keep this badge calm).

### 5.3 Collapsed state (56 px)

- Icons only, centered.
- Tooltips on hover (after 400 ms delay) showing label.
- Logo collapses to just the `GitBranch` mark in Cardinal Red.
- User footer collapses to avatar only.

### 5.4 Mobile

- Hidden by default below `md` breakpoint (768 px).
- Hamburger lives in the TopBar on mobile.
- Tapping it opens `<MobileSidebar />` as a Radix Dialog with `data-side="left"` — slides in 220 ms.
- Backdrop click closes. Esc closes. Body scroll locked while open.

---

## 6. TopBar spec

```jsx
<header className="
  sticky top-0 z-30 flex h-11 items-center gap-3
  border-b border-border-1 bg-surface-0 px-4
">
  <button onClick={toggleSidebar} aria-label="Toggle sidebar" className="md:hidden" />
  <h1 className="text-sm font-semibold text-text-1">
    {routeMeta[pathname]?.title ?? "Pipelined"}
  </h1>
  <div className="ml-auto flex items-center gap-1.5">
    <SearchTrigger />           // 240 px input, opens cmd-K on focus
    <CmdKPill />                // mobile-only condensed trigger
    <NotificationBell />
    <ThemeToggle />
    <UserAvatarMenu />
  </div>
</header>
```

- `routeMeta[pathname]?.title` falls back to the page's own `<h1>` if not in the map.
- The **SearchTrigger** is a button styled as an input: `h-8 w-[240px] rounded-md border-border-1 bg-surface-1 px-2.5 text-sm text-text-3` with the placeholder "Search or jump to… ⌘K". Clicking it opens the CommandPalette.
- The `CmdKPill` shows `⌘K` in a 24 × 24 button with `font-mono text-xs`. Hidden ≥ md (replaced by full search input).

---

## 7. Command palette refresh

Re-skin the existing `frontend/src/components/CommandPalette.jsx`:

- Surface: `bg-surface-0`, border `border-border-2`, radius 12 px, `--shadow-modal`.
- Backdrop: `rgba(0,0,0,0.50)` + `backdrop-blur-sm`.
- Input: 48 px tall, 16 px font, no border (only border-bottom `border-border-1`), placeholder "Type a command or search…".
- Item row: 36 px, 13 px font, icon left (16 × 16, `text-text-3`), label, `text-text-1`, secondary `text-text-3` aligned right, kbd hint far right (e.g., `g d`).
- Selected item: `bg-surface-2` + Cardinal left-border 2 px.
- Group headings: 11 px, 500, uppercase, `text-text-3`, sticky.
- Recent items list at top when input is empty (persisted via `localStorage`).

Sections in order:
1. **Quick actions**: Add application, Import CSV, Open co-pilot, Start mock interview.
2. **Navigation**: Today, Inbox, Dashboard, Job Board, Calendar, Analytics, Activity, Tags, Offers, Settings.
3. **Recent applications**: top 5 from `useRecentApplications` (existing hook if present, else add).
4. **Settings shortcuts**: Theme: Light/Dark/System, Pipeline stages…, Integrations…

---

## 8. Keyboard shortcuts

Existing chords stay. **Add:**

| Key | Action |
|-----|--------|
| `[` | Toggle sidebar collapsed/expanded |
| `g t` | Navigate to Today (Pipelined already supports `g d`, `g c`, `g a`, `g j` — extend to `g t`, `g i`, `g s`) |
| `o` | Open co-pilot drawer |
| `?` | Open ShortcutHelp (already works — verify) |

Update `frontend/src/lib/shortcuts.js` (or wherever `CHORD_DESTINATIONS` is defined in App.jsx — extract to a lib file if not).

Update `frontend/src/components/ShortcutHelp.jsx` to list the new shortcuts grouped:
- Navigation (`g d`, `g c`, …)
- Actions (`a` add, `i` import, `o` co-pilot, `/` focus search)
- UI (`[` collapse sidebar, `cmd+k` palette, `?` this help, `esc` close)

---

## 9. UX changes worth flagging

1. **Today is the default landing page** post-login. `App.jsx` should redirect `"/"` → `/today` for authenticated users (already does — verify).
2. The **Offers tab is conditional** (only when `hasOffers === true`) — current NavBar logic moves into Sidebar.
3. **Co-pilot button leaves the top bar** — it lives in the sidebar `Account` group as "Open co-pilot". The bot icon stays. Keyboard shortcut `o` opens the drawer.
4. **Theme cycle button stays in TopBar** for visibility.
5. **Search input** in the TopBar is *only* a cmd-K trigger — no separate search-as-you-type page. It opens the palette focused on the "Search" tab.

---

## 10. Acceptance criteria

- [ ] `NavBar.jsx` is deleted; no file imports it.
- [ ] Every protected page renders inside `<AppShell>` with `<Outlet />` (or its current page-level content).
- [ ] Sidebar shows correct active state for the current route on every protected page.
- [ ] `[` toggles sidebar collapse with a 200 ms width animation; collapsed state persists across reload via `localStorage`.
- [ ] Mobile (< 768 px): sidebar is hidden; hamburger opens slide-over drawer; backdrop click closes.
- [ ] Cmd-K palette opens from anywhere (sidebar nav, top-bar search input, `cmd+k` / `ctrl+k`).
- [ ] CoPilot drawer slides in from right; `o` opens it; click backdrop or `Esc` closes.
- [ ] EmailVerificationBanner + OfflineBanner render above the sidebar+canvas grid, not above NavBar (which no longer exists).
- [ ] All 9 chord shortcuts work (`g d`, `g i`, `g t`, `g c`, `g a`, `g j`, `g s`, plus `a` and `o`).
- [ ] Existing tests for NavBar are replaced with `AppShell.test.jsx`; existing tests for CommandPalette, CoPilotPanel, NotificationBell still pass.
- [ ] Light + dark themes both render correctly; sidebar has visible 1 px border separating it from canvas in both modes.
- [ ] `prefers-reduced-motion: reduce` disables sidebar width animation and drawer slide.

---

## 11. Out of scope

- Workspace switching (organization support). The logo's chevron is a no-op for now (or opens the user menu).
- Per-page command palette context (showing only commands relevant to current page). All commands global for now.
- Right-side "inspector" panel — DetailPanel keeps its current modal-drawer pattern in PRD-04.
- Sidebar resize via drag. Just collapsed/expanded toggle.

---

## 12. Notes for the implementing agent

- The `Outlet` pattern means migrating routes to React Router's nested-route style. If you'd rather not, pass `{children}` into `<AppShell>` and have each protected page route render `<ProtectedPage><AppShell><Dashboard /></AppShell></ProtectedPage>`. Wrap the `ProtectedPage` HOC to do this automatically.
- The 300-line file limit applies. `Sidebar.jsx` will be near the limit — extract `SidebarNavItem`, `SidebarGroup`, `UserMenu`, `Logo` into small co-located files inside `components/shell/`.
- `routeMeta.js` is a *pure data* file — no React. It exports an object `{ "/today": { title: "Today", icon: Sun, chord: "g t" }, … }`.
- The Linear convention for cmd-K is `⌘K` on macOS, `Ctrl K` on Windows/Linux. Detect platform via `navigator.platform` and swap the displayed glyph.
- Don't reach for `react-resizable-panels` or any layout library — flex + grid handles this in ~30 lines.
