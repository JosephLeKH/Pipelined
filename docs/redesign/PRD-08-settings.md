# PRD-08 — Settings

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

`Settings.jsx` currently is a long vertical scroll through 12 sections. Linear's settings use a **two-column layout**: a left sub-nav and a right content area. Sections are independently scrollable. This is essential when settings have many sub-sections (Pipelined has 12+).

---

## 2. Sources to read first

- Linear's Settings (`linear.app/settings/account`).
- Existing:
  - `frontend/src/pages/Settings.jsx`
  - `frontend/src/components/SettingsProfileSection.jsx`
  - `frontend/src/components/SettingsAccountSection.jsx`
  - `frontend/src/components/SettingsAgentProfileSection.jsx`
  - `frontend/src/components/SettingsAgentActivitySection.jsx`
  - `frontend/src/components/SettingsAutopilotSection.jsx`
  - `frontend/src/components/SettingsIntegrationsSection.jsx`
  - `frontend/src/components/SettingsNotificationsSection.jsx`
  - `frontend/src/components/SettingsPipelineSection.jsx`
  - `frontend/src/components/SettingsReferralSection.jsx`
  - `frontend/src/components/SettingsReportSection.jsx`
  - `frontend/src/components/SettingsResumeSection.jsx`
  - `frontend/src/components/SettingsTemplatesSection.jsx`
  - `frontend/src/components/SettingsUsageSection.jsx`
  - `frontend/src/components/SettingsWatchlistSection.jsx`
  - `frontend/src/components/TimezoneSelector.jsx`
  - `frontend/src/components/PipelineStagesEditor.jsx`

---

## 3. Layout

```
┌─────────────────────────────────────────────────────────────────┐
│ [Top header from PRD-01]                                        │
├─────────────────────────────────────────────────────────────────┤
│  Settings                                                       │
├──────────────────┬──────────────────────────────────────────────┤
│ Account          │  Profile                                     │
│ Profile          │                                              │
│ Notifications    │  Display name                                │
│ Appearance       │  [Joseph Le_______________________]          │
│                  │                                              │
│ Workspace        │  Email                                       │
│ Pipeline stages  │  joseph@stanford.edu  (Change)               │
│ Templates        │                                              │
│ Tags             │  Time zone                                   │
│                  │  [America/Los_Angeles ▾]                     │
│ Agents           │                                              │
│ Agent profile    │  Avatar                                      │
│ Autopilot        │  [○]  [Upload]  [Remove]                     │
│ Watchlist        │                                              │
│ Templates        │                                              │
│ Resume           │                                              │
│ Notifications    │                                              │
│                  │                                              │
│ Integrations     │                                              │
│ Gmail            │                                              │
│ GitHub           │                                              │
│                  │                                              │
│ Billing          │                                              │
│ Plan & usage     │                                              │
│ Referral         │                                              │
└──────────────────┴──────────────────────────────────────────────┘
```

- Left nav: 240 px wide, `border-r border-border-1`, scrollable.
- Right content: flex-1, scrollable, max-width 720 px centered.
- Each settings sub-page is a route: `/settings/profile`, `/settings/notifications`, etc. Default `/settings` redirects to `/settings/account` (or `/settings/profile`).

---

## 4. Left nav spec

Group label: 11 px 500 uppercase `text-text-3`, padding 16 px 12 px 6 px.

Nav row: 32 px, 8 px gap, 13 px label, padding 16 px left, hover `bg-surface-2`, active `bg-surface-2 text-brand-600` + 2 px Cardinal left bar.

```
ACCOUNT
  Profile             /settings/profile
  Notifications       /settings/notifications
  Appearance          /settings/appearance      ← new (theme + density)

WORKSPACE
  Pipeline stages     /settings/stages
  Templates           /settings/templates
  Tags                /settings/tags            ← link to /tags page

AGENTS
  Agent profile       /settings/agent-profile
  Autopilot           /settings/autopilot
  Watchlist           /settings/watchlist
  Resume              /settings/resume
  Notifications       /settings/agent-notifications

INTEGRATIONS
  Gmail               /settings/integrations/gmail
  GitHub              /settings/integrations/github

BILLING
  Plan & usage        /settings/billing
  Referral            /settings/referral
```

Route the existing settings sections into these subpaths. (Old `?section=` query params can be supported as redirects.)

---

## 5. Content page spec

Each subpage:

```
   Profile
   Update your display name, email, time zone, and avatar.

   ── Display name ──────────────────────────────────────
   [input]
   The name shown in your dashboard and shared timelines.

   ── Email ─────────────────────────────────────────────
   joseph@stanford.edu       [Change]
   Used for sign-in and notifications.

   ── Time zone ────────────────────────────────────────
   [TimezoneSelector]
   Determines Morning Brief and report delivery times.

   ── Avatar ────────────────────────────────────────────
   [○]  [Upload]  [Remove]

                                        [Cancel]  [Save]
```

- Page title: `display-md` (28 px), `text-text-1`.
- Page subtitle: 14 px `text-text-2`, 24 px below title.
- Field block: vertical, 24 px gap.
  - Label: 13 px 500 `text-text-1`.
  - Control.
  - Help text: 12 px `text-text-3`, 4 px below.
- Section divider: 1 px `border-border-1`, 32 px top/bottom.
- Sticky footer: `border-t border-border-1 bg-surface-0` with Save + Cancel buttons. Save only enabled when dirty. Save spinner during pending.

---

## 6. Specific subpages — re-skin highlights

### 6.1 Notifications

```
Channels
  ☑ In-app notifications
  ☑ Email digest (weekly)
  ☐ Email digest (daily)
  ☐ Browser push (coming soon — disabled)

Categories
  Stage changes
    ☑ When an application moves stage
  Follow-ups
    ☑ When a follow-up is due
  Brief
    ☑ Morning brief
    ☑ Sunday weekly review
  Agents
    ☑ When Autopilot has new matches
    ☑ When Watchlist surfaces a listing

Quiet hours
  [Start ▾] – [End ▾]   No notifications during this window
```

Each channel: 36 px row with checkbox label and help-text right.

### 6.2 Appearance (NEW)

```
Theme
  ○ Light  ● Dark  ○ Match system

Density
  ○ Comfortable    ● Compact         (currently default Compact)

Font size
  Small  ▮▮▮●▮  Large

Accent
  ● Cardinal    ○ Default (system)   ← future-proof for color customization
```

- Theme radio: 56 × 56 swatch preview per option.
- Density toggles row height (40 → 36 px for Compact).
- Font size: 5-step slider, persists in localStorage.

### 6.3 Pipeline stages (`PipelineStagesEditor.jsx`)

Re-skin existing draggable list:

```
●  To Apply      ⋮⋮     ▾ Color  ×
●  Applied       ⋮⋮     ▾        ×
●  Phone Screen  ⋮⋮     ▾        ×
●  Technical     ⋮⋮     ▾        ×
●  Onsite        ⋮⋮     ▾        ×
●  Offer         ⋮⋮     ▾        × (cannot remove)
●  Rejected      ⋮⋮     ▾        ×

[+ Add stage]
```

- Drag handle on the right of each row.
- Color picker dropdown shows the 6 stage colors from PRD-00 §3.4.
- "Rejected" + "Offer" are required and cannot be removed (× disabled).
- Save button at bottom; dirty state persists across drags.

### 6.4 Templates

```
Templates           [+ New template]

  Cold outreach           Edit  Delete
  Follow-up #1            Edit  Delete
  Thank-you note          Edit  Delete
```

Click a row → modal with markdown editor + variables (`{{company}}`, `{{role}}`).

### 6.5 Agent profile (`SettingsAgentProfileSection.jsx`)

The user fills out:
- "What roles are you targeting?" (multi-text).
- "What industries?" (chips).
- "What's your seniority?" (intern / new grad / mid / senior).
- "What location?"
- "Resume" (link to /settings/resume).

Used by Autopilot scoring + Co-pilot context.

### 6.6 Autopilot

```
Autopilot   [● ON ]
Nightly scan of curated listings scored against your resume.

Min match score
  [40% slider]            Only show matches at or above this fit score.

Boards to scan
  ☑ GitHub job repos
  ☑ User-saved careers pages

Schedule
  Runs daily at 5:00 AM UTC.
```

### 6.7 Watchlist

Inline list of careers pages. Each row: URL + status (last scanned, results last run) + remove.

### 6.8 Resume

Single resume upload via `SettingsResumeSection.jsx`. Re-skin:
- Empty state: dashed 96 px drop zone.
- Uploaded state: file name + size + last updated + Delete + Replace.
- Show extracted fields summary below ("Extracted: 4 jobs, 3 projects, 8 skills") with a "Re-parse" link.

### 6.9 Integrations / Gmail

```
Gmail               ● Connected as joseph@stanford.edu
                    Last sync 12 minutes ago · 14 emails parsed today

[Disconnect]   [Sync now]
```

If not connected: large connect button "Connect Gmail" Cardinal primary + read-only privacy callout below.

### 6.10 Integrations / GitHub

Same pattern.

### 6.11 Billing / Plan & usage

```
Plan    Free       [Upgrade to Pro]

Usage this month
  Co-pilot turns        18 / 100        ████░░░░░░
  Apply Packs           4 / 10          ████████░░
  Mock interviews       1 / 3           ████░░░░░░
  Resume insights       5 / 10          █████░░░░░

Renews on Mar 1, 2027.
```

- Usage bars: 4 px tall, Cardinal fill.
- Approaching limit (≥ 80 %): bar turns `--status-warn` (amber).
- At limit (100 %): bar turns `--brand-700` (Cardinal dark) + "Upgrade" CTA inline.

### 6.12 Referral

```
Refer a friend.
Get a free month of Pro for each friend who signs up.

Your link
[https://pipelined.app/r/joseph-le_____] [Copy]

You've referred  2 friends   ·   Earned  2 months free
```

---

## 7. File manifest

### 7.1 Edit (every settings file)

| File | Change |
|------|--------|
| `frontend/src/pages/Settings.jsx` | Replace single-page scroll with 2-column layout + nested `<Routes>` |
| `frontend/src/components/Settings*Section.jsx` (12 files) | Re-skin per Section 6 specifics |
| `frontend/src/components/TimezoneSelector.jsx` | Re-skin Select primitive |
| `frontend/src/components/PipelineStagesEditor.jsx` | Per Section 6.3 |

### 7.2 Create

| File | Purpose |
|------|---------|
| `frontend/src/components/SettingsLayout.jsx` | Two-column wrapper with sub-nav |
| `frontend/src/components/SettingsNav.jsx` | Left rail nav |
| `frontend/src/components/SettingsAppearanceSection.jsx` | Theme + density + font size + accent |
| `frontend/src/lib/settingsRoutes.js` | Map of subpaths → sections + group |

### 7.3 No deletes

Every section remains.

---

## 8. Acceptance criteria

- [ ] `/settings` renders 2-column layout; redirects to `/settings/profile` by default.
- [ ] Each subpath renders the corresponding section in the content area.
- [ ] Left nav highlights active sub-page; 2 px Cardinal left bar marker.
- [ ] Sticky footer Save button appears only when form is dirty.
- [ ] Save shows spinner + "Saved" microcopy 2 s on success.
- [ ] Appearance section: theme switch toggles immediately + persists.
- [ ] Density toggle changes row height app-wide via a CSS variable.
- [ ] Pipeline stage drag-to-reorder works with new aesthetics.
- [ ] Usage bars in Billing change color at 80 % and 100 %.
- [ ] Referral link copies to clipboard with toast.
- [ ] All component tests pass (`Settings.test.jsx` + each `Settings*Section.test.jsx`).
- [ ] Dark theme verified.

---

## 9. Out of scope

- New settings categories.
- Per-user feature flags page (admin-only).
- SSO settings.
- API key management.
- Bulk-edit applications from settings.

---

## 10. Notes for the implementing agent

- Use React Router nested routes inside `Settings.jsx` — `<Routes>` rendering `<Route path="profile" element={<SettingsProfileSection />} />` etc. The outer `Settings.jsx` becomes a thin layout shell.
- Backend doesn't change. Each section keeps its existing API calls.
- The Appearance section's density toggle should set `data-density="compact|comfortable"` on `<html>` and let CSS pick up a `--row-height` variable. Apply this variable to ApplicationRow, MissionCard, JobRow.
- The 12-section breakdown in old `Settings.jsx` is faithfully preserved — only the wrapping layout changes.
- TimezoneSelector uses `Intl.supportedValuesOf("timeZone")` if available, else falls back to existing list.
