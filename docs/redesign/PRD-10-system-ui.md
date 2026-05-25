# PRD-10 — System UI (Notifications, Banners, Modals, Toasts, Errors, Empty States)

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

Sixty percent of "the app feels rough" comes from these tiny surfaces: the wrong empty state, an over-loud toast, a banner that won't go away, a modal with the wrong radius. Linear nails these because they're consistent across the app. We have ~25 components in this category. They all need the same treatment.

This PRD is a sweep: every notification surface, banner, modal, toast, empty state, error boundary, command palette, and share UI gets re-skinned with the same vocabulary.

---

## 2. Sources to read first

- Linear's notification bell + popover (when something happens in your workspace).
- Linear's toast (top-right, auto-dismiss, undo).
- Linear's confirm dialog (delete, archive).
- Linear's command palette.
- Existing files (see manifest in Section 9).

---

## 3. Toast (`sonner`)

The app uses `sonner` for toasts. Configure it to match Linear:

```jsx
// in main.jsx or wherever Toaster is mounted
<Toaster
  position="top-right"
  offset={16}
  toastOptions={{
    classNames: {
      toast: "rounded-lg border border-border-1 bg-surface-0 text-text-1 shadow-popover px-4 py-3 text-sm",
      success: "border-status-success/40",
      error: "border-brand-700/40",
      title: "font-medium",
      description: "text-text-2 text-xs mt-0.5",
      actionButton: "bg-brand-600 text-white text-xs rounded-md px-2 py-1 hover:bg-brand-700",
      cancelButton: "text-text-2 text-xs rounded-md px-2 py-1 hover:bg-surface-2",
    },
    duration: 4000,
  }}
  closeButton
/>
```

- Position: top-right on desktop, bottom on mobile (sonner auto-detects).
- 280 px wide. Border 1 px + popover shadow.
- Success: subtle green left-border accent.
- Error: subtle Cardinal left-border accent.
- Action button (e.g., "Undo"): Cardinal pill.
- Auto-dismiss 4 s; persistent on hover.

`UndoToast.jsx` is replaced by sonner's native action button pattern. Delete the standalone `UndoToast.jsx` if its only role was matching sonner's API.

---

## 4. Banners (top of canvas)

Five banner components exist; they share spec:

| Component | Trigger | Severity |
|-----------|---------|----------|
| `EmailVerificationBanner` | unverified email | medium |
| `OfflineBanner` | window goes offline | high |
| `InboxSetupBanner` | Gmail not connected | low |
| `AutopilotResumeBanner` | Autopilot on, no resume | low |
| `FollowUpBanner` | overdue follow-ups | medium |

All banners share this shape:

```jsx
<div
  role="status"
  className={`
    flex items-center gap-3 border-b
    h-9 px-4 text-xs
    ${severityClasses[severity]}
  `}
>
  <Icon size={14} aria-hidden="true" />
  <span>{message}</span>
  {actionLabel && <Button size="xs" variant="ghost">{actionLabel}</Button>}
  <button aria-label="Dismiss" className="ml-auto" onClick={onDismiss}>
    <X size={14} />
  </button>
</div>
```

Severity classes:
- **high** (offline): `bg-brand-700 text-white border-brand-800` — full Cardinal background, white text.
- **medium** (verify email, follow-up): `bg-brand-50 text-brand-900 border-brand-100`.
- **low** (Gmail, resume): `bg-surface-1 text-text-1 border-border-1`.

Banners stack vertically above the AppShell sidebar+canvas (handled in PRD-01). Dismissed banners persist in localStorage by banner ID for 7 days, then reappear once.

---

## 5. Notification bell + popover

`NotificationBell.jsx` is the bell icon in TopBar (from PRD-01). On click → popover.

### Bell
- 32 × 32 ghost icon button.
- Unread dot: 6 px Cardinal Red, absolute top-right (3 px offset).
- When > 9 unread, show count "9+" in tiny pill (was a 1.25 rem pill — keep but re-skin with Cardinal bg, white text, 10 px font).

### Popover
- 360 px wide, max-height 480 px.
- Header: "Notifications" + "Mark all read" link.
- Empty: "You're caught up." with checkmark.
- Each notification row: 56 px, `bg-surface-0 border-b border-border-1 hover:bg-surface-1`.
  - Icon left (16 px, status-tinted).
  - Title + subtitle stacked.
  - Time right-aligned (12 px `text-text-3`).
  - Unread = 6 px Cardinal dot at the right edge.
- Click row → navigates to the target (already wired).

---

## 6. Confirm / discard / delete dialogs

Re-skin every dialog (`DiscardDialog` in DetailPanel, `MergeDialog`, `TemplateSaveModal`, the bare `<dialog>` in any util):

```jsx
<Dialog>
  <DialogContent className="
    rounded-xl border border-border-1 bg-surface-0
    shadow-modal p-6 max-w-sm
  ">
    <DialogHeader>
      <DialogTitle className="text-base font-semibold text-text-1">
        {title}
      </DialogTitle>
      <DialogDescription className="text-sm text-text-2 mt-1">
        {description}
      </DialogDescription>
    </DialogHeader>
    <DialogFooter className="mt-5 flex justify-end gap-2">
      <Button variant="ghost" size="sm" onClick={onCancel}>Cancel</Button>
      <Button variant={isDestructive ? "destructive" : "default"} size="sm" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </DialogFooter>
  </DialogContent>
</Dialog>
```

- Backdrop: `bg-black/40 backdrop-blur-sm` (light), `bg-black/60` (dark).
- Esc closes. Click outside closes. Tab focuses confirm by default; destructive defaults to cancel.

---

## 7. Empty states

Standardize via the existing `EmptyState.jsx`:

```jsx
<EmptyState
  icon={<Inbox size={32} />}
  title="No applications yet"
  description="Save a job from any board to start tracking."
  action={<Button variant="default" size="sm">Add application</Button>}
/>
```

Shape:
- 32 px outline icon in `text-text-3`.
- Title: 14 px 600 `text-text-1`, 16 px below icon.
- Description: 13 px `text-text-2`, max-width 320 px, 4 px below title.
- Optional action button, 16 px below description.
- Container padding 48 px vertical, centered.

Every list-empty surface uses `<EmptyState>` — including:
- `ApplicationListEmpty`
- Job board no-results
- Calendar no-events
- Tags page no-tags
- Activity feed no-activity
- Notification bell empty
- Pending inbox empty

---

## 8. Error boundary

`ErrorBoundary.jsx` and `RouteErrorFallback` in `App.jsx`:

```jsx
<div className="flex flex-col items-center gap-3 py-16 px-6 text-center max-w-md mx-auto">
  <div className="h-12 w-12 rounded-full bg-brand-50 flex items-center justify-center">
    <AlertCircle className="h-6 w-6 text-brand-700" />
  </div>
  <h2 className="text-lg font-semibold text-text-1">Something went wrong</h2>
  <p className="text-sm text-text-2">
    We've logged the error. Try refreshing — if it keeps happening, email{" "}
    <a href="mailto:joseph@vimes.io" className="text-brand-600">joseph@vimes.io</a>.
  </p>
  <div className="mt-2 flex gap-2">
    <Button variant="secondary" size="sm" onClick={() => location.reload()}>Refresh</Button>
    <Button variant="default" size="sm" asChild>
      <Link to="/dashboard">Go to dashboard</Link>
    </Button>
  </div>
</div>
```

`ApiErrorMessage.jsx` — inline error for failed mutations:

```jsx
<div className="rounded-md border border-brand-100 bg-brand-50 px-3 py-2 text-sm text-brand-900">
  <span className="font-medium">{title}</span>
  <span className="text-brand-700"> · {detail}</span>
</div>
```

---

## 9. Command palette (already in PRD-01, recap here)

`CommandPalette.jsx` re-skinned per PRD-01 §7. This PRD only verifies:
- Backdrop blur.
- Item rows 36 px with selected `bg-surface-2` + Cardinal left bar.
- Recents persist (localStorage `pipelined.cmdk.recents`, max 5).

---

## 10. Upgrade plan modal

`UpgradePlanModal.jsx` — opens when user hits a paid feature limit. Re-skin as:

```
                    ✦ Pipelined Pro

   Unlock unlimited co-pilot, mock interviews, autopilot,
   resume insights, and priority support.

   $5/mo · cancel anytime

   [   Upgrade  ]   [Maybe later]
```

- Modal 480 × auto, rounded-xl.
- Cardinal "Upgrade" primary button. "Maybe later" ghost.
- Sparkle icon in Cardinal at top.

---

## 11. Share modals (`SharePipeline`, `ShareTimeline`)

Both share a public read-only URL.

```
   Share your pipeline

   Anyone with the link can view a read-only summary.

   [ https://pipelined.app/pipeline/abc1234        ] [Copy]

   ● Public      🔘 Unlisted        ○ Off

   What's visible
   ✓ Applications (anonymized roles + companies)
   ✓ Stage counts
   ☐ Personal notes
   ☐ Email addresses

   [ Open public page →]                            [Done]
```

- 520 px modal.
- URL field: `input` with copy button right. Hover: copy icon → check on copy with toast "Link copied".
- Visibility radios styled as 32 px segmented control.
- Visibility checklist with checkbox tokens.
- "Open public page" link opens the URL in a new tab.

---

## 12. PendingOpportunityCard / Inbox page

`PendingInboxPage.jsx` is the autopilot review queue. Each card:

```
┌──────────────────────────────────────────────────────────┐
│ ●  Anthropic   FDE Intern         ✦ 84% · Suggested by  │
│    SF · Remote · Intern             Autopilot · 2h ago  │
│    "Forward Deployed Engineer at Anthropic. You'll …"   │
│                                                          │
│    [Approve →]    [Reject]    [Open job ↗]              │
└──────────────────────────────────────────────────────────┘
```

- Card: `bg-surface-0 border border-border-1 rounded-lg p-4`.
- Cardinal Approve button (creates application + dismiss card).
- Ghost Reject button (dismiss card).
- Open job link (text, Cardinal).
- Cover-letter draft in a collapsible: "View AI-drafted cover letter ▾".
- Resume tips collapsible.

Page header: "Pending opportunities · 3 to review" + "Pause autopilot" link.

Empty: "Autopilot hasn't found any new matches. Check back tomorrow at 5 AM UTC."

---

## 13. Shortcut help (`ShortcutHelp.jsx`)

Modal 560 px wide, two-column layout:

```
   Keyboard shortcuts

   Navigation
   ⌘K / Ctrl K   Open command palette
   g d           Dashboard
   g t           Today
   g i           Inbox
   g c           Calendar
   g a           Analytics
   g j           Job board
   g s           Settings

   Actions
   a             Add application
   /             Search
   o             Open co-pilot
   ?             Show shortcuts (this)
   [             Collapse sidebar
   ⌘ Enter       Submit form
   Esc           Close panel/modal
```

- 13 px row.
- `kbd` styling: `bg-surface-1 border border-border-1 rounded-sm px-1.5 py-0.5 text-[11px] font-mono`.

---

## 14. Feedback widget (`FeedbackWidget.jsx`)

Bottom-right floating button:

```
   [💬 Feedback]    ← 36 px pill, Cardinal hover
```

On click: side panel (400 px right drawer) with form: rating 1-5 + textarea + submit. Re-skin per PRD-00.

---

## 15. Inbox setup dialog

`InboxSetupDialog.jsx` is a step-by-step modal walking through Gmail OAuth. Re-skin:
- Each step: heading + body + primary CTA.
- Step indicator: "1 of 3" top-right.
- Cancel link bottom-left.

---

## 16. File manifest

### 16.1 Edit (re-skin)

| File | Change |
|------|--------|
| `frontend/src/main.jsx` (or root) | Configure Toaster per Section 3 |
| `frontend/src/components/NotificationBell.jsx` | Per Section 5 |
| `frontend/src/components/EmailVerificationBanner.jsx` | Per Section 4 |
| `frontend/src/components/OfflineBanner.jsx` | Per Section 4 (high severity) |
| `frontend/src/components/InboxSetupBanner.jsx` | Per Section 4 |
| `frontend/src/components/AutopilotResumeBanner.jsx` | Per Section 4 |
| `frontend/src/components/FollowUpBanner.jsx` | Per Section 4 |
| `frontend/src/components/MergeDialog.jsx` | Confirm dialog per Section 6 |
| `frontend/src/components/TemplateSaveModal.jsx` | Per Section 6 |
| `frontend/src/components/EmptyState.jsx` | Standard per Section 7 |
| `frontend/src/components/ErrorBoundary.jsx` | Per Section 8 |
| `frontend/src/components/ApiErrorMessage.jsx` | Per Section 8 |
| `frontend/src/components/UpgradePlanModal.jsx` | Per Section 10 |
| `frontend/src/components/SharePipeline.jsx` | Per Section 11 |
| `frontend/src/components/ShareTimeline.jsx` | Per Section 11 |
| `frontend/src/components/PendingOpportunityCard.jsx` | Per Section 12 |
| `frontend/src/pages/PendingInboxPage.jsx` | Per Section 12 |
| `frontend/src/components/ShortcutHelp.jsx` | Per Section 13 |
| `frontend/src/components/FeedbackWidget.jsx` | Per Section 14 |
| `frontend/src/components/InboxSetupDialog.jsx` | Per Section 15 |
| `frontend/src/components/DuplicateWarning.jsx` | Inline subtle warning (yellow dot + text), no card |

### 16.2 Delete

- `frontend/src/components/UndoToast.jsx` — replaced by sonner action button. Update callers to use `toast(...)` with `action: { label, onClick }` directly.

---

## 17. Acceptance criteria

- [ ] All banners share the same height (36 px) and dismissibility pattern.
- [ ] All toasts use sonner with the configured classNames; no custom UndoToast remains.
- [ ] Notification bell shows Cardinal unread dot; "9+" pill when count > 9; popover slides in 180 ms.
- [ ] Empty states use `<EmptyState>` everywhere; no ad-hoc empty markup.
- [ ] Confirm dialogs default to 12 px radius, modal shadow, backdrop blur.
- [ ] Error boundary shows the new "Something went wrong" layout with refresh + dashboard buttons.
- [ ] Pending opportunity cards have Approve / Reject / Open job actions with the correct hover/disabled states.
- [ ] ShortcutHelp lists the new shortcuts from PRD-01 (`[`, `g t`, `g i`, `g s`, `o`).
- [ ] Feedback widget opens as a right drawer with form; submits without page reload.
- [ ] All component tests pass.
- [ ] Dark theme verified.

---

## 18. Out of scope

- New notification types.
- New share permissions (e.g., per-applicaiton).
- Feedback widget integrations beyond what exists.
- A dedicated changelog UI.
- In-app messaging (Intercom etc).

---

## 19. Notes for the implementing agent

- Sonner is already a dependency. Confirm in `package.json`; if missing, install.
- The `EmptyState` component already exists at `components/EmptyState.jsx`. Standardize its API — accepted props: `icon` (ReactNode), `title` (string), `description` (string), `action` (ReactNode). Backward-compat: if a caller passes `children`, render after description.
- The 7-day reappear policy for dismissed banners is implemented by storing `{ dismissedAt: ISOString }` in localStorage and comparing on mount.
- The dark-mode backdrop opacity (60 % vs 40 %) is important — pure black at 40 % is too transparent on the dark surface.
- Tests for `UndoToast` need updating since the file is deleted. Replace with assertions on `sonner` mock calls.
