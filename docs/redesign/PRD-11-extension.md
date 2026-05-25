# PRD-11 — Chrome Extension Redesign

**Status:** Ready (blocked on PRD-00 tokens)
**Depends on:** PRD-00 (color/typography values referenced by extension CSS)
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

The extension popup (`extension/popup/popup.css`) currently uses an indigo gradient header (`--brand-600: #6366F1`) — **a completely different color system from the web app**, which uses clay orange. After PRD-00, the web app is Stanford Cardinal Red on white. The extension should match.

We're aligning the popup's visual language with the web app and tightening density. The content banner (`extension/content/content.css`) — the in-page Shadow-DOM toast that confirms a save — also gets the same treatment.

Constraint: the extension has **no build step**. It must work with raw CSS in Chrome MV3 popup/content scripts. No Tailwind. No PostCSS. We hand-write the same tokens as CSS variables.

---

## 2. Sources to read first

- `linear.app` Chrome extension if available (or Vercel/Raycast for popup-as-tool patterns).
- Existing: `extension/popup/popup.html`, `extension/popup/popup.css`, `extension/popup/popup.js`, `extension/content/content.css`, `extension/content/content.js`, `extension/content/contact_banner.js`, `extension/manifest.json`.
- PRD-00 Section 3 — the token table is the source of truth for colors.

---

## 3. Popup target layout

```
┌──────────────────────────────────────┐    width: 360 px
│ ◍ Pipelined                joseph ▾ │    header: 48 px, surface-0
├──────────────────────────────────────┤    border-bottom: border-1
│ Auto-save           [●○]  OFF        │    row: 32 px, surface-1
├──────────────────────────────────────┤
│  ●  Anthropic               Phone •  │
│     Forward Deployed Eng.   2h ago   │    item: 56 px, surface-0
│ ──────────────────────────────────── │    border-bottom: border-1
│  ●  Stripe                  Apl  •   │
│     Software Engineer       5h ago   │
│ ──────────────────────────────────── │
│  ●  Linear                  Apl  •   │
│     Founding Engineer       1d ago   │
├──────────────────────────────────────┤
│  Open Dashboard →            v1.0.0  │    footer: 32 px, surface-1
└──────────────────────────────────────┘
```

### Key visual changes
- **Header**: no gradient. White (`#FFFFFF`) surface with the Pipelined wordmark + Cardinal `GitBranch` glyph on the left. User name on the right as a dropdown trigger.
- **Sign out** moves into the avatar dropdown.
- **Auto-save row** stays but adopts new switch styling.
- **List rows**:
  - Stage dot 6 px on the left (`status-*` color per stage), not a 3 px vertical bar.
  - Company 13 px 500.
  - Role 12 px 400 `text-text-2`.
  - Stage abbreviation pill 11 px on the right + timestamp below it.
  - Hover: `bg-surface-2`.
- **Empty state**: 32 × 32 outline briefcase icon in `--text-3`, headline "Nothing saved yet", subhead "Visit a job posting to start tracking."
- **Footer**: 11 px, `text-text-3`, footer link in `text-brand-600`.

### Unauthenticated state
```
        ◍ Pipelined

      [Briefcase icon, 40 px, Cardinal red]

     Sign in to start tracking
  Track applications across 10 job boards.

     [    Sign in    ]   ← Cardinal primary, 36 px, full width

  ── or ──

     [Open Dashboard →]   ← ghost link
```

---

## 4. Content banner target

The banner injects into the page via Shadow DOM after a successful save:

```
                                  ┌────────────────────────────┐
                                  │ ✓  Saved to Pipelined      │
                                  │                            │
                                  │ Anthropic · FDE intern     │
                                  │ [Open in dashboard →]      │
                                  └────────────────────────────┘
                                            bottom-right
```

Spec:
- Surface: `bg-text-1` (`#2E2D29`) — dark on light page is the Linear toast pattern.
- Text: `text-surface-0` (`#FFFFFF`).
- Radius: 8 px.
- Padding: 12 px 16 px.
- Width: 320 px max.
- Shadow: `0 8px 24px rgba(0,0,0,0.16)`.
- Check icon: 14 × 14, `text-status-success` (Palo Alto green).
- Position: `position: fixed; bottom: 24px; right: 24px; z-index: 2147483647`.
- Auto-dismiss after 4 s with a fade-out (220 ms).
- Click "Open in dashboard" → opens app in new tab on the application's detail.

For the *contact* banner (`contact_banner.js`), same surface treatment but with a different icon (User) and different body ("Saved contact — added to your network").

---

## 5. File manifest

### 5.1 Edit

| File | Change |
|------|--------|
| `extension/popup/popup.css` | Replace token block at top with PRD-00 values (Section 3, manually transcribed); restyle every selector |
| `extension/popup/popup.html` | Tweak markup minimally for new stage-dot left + abbreviation/timestamp right; add empty/unauth icons |
| `extension/popup/popup.js` | Update render logic: dot color from `STAGE_COLORS`, stage abbreviation map (To Apply → "Apl", Phone Screen → "Phn", Technical → "Tec", Onsite → "Ons", Offer → "Ofr", Rejected → "Rej") |
| `extension/content/content.css` | Replace banner surface to dark `#2E2D29`, white text, 8 px radius, smaller padding |
| `extension/content/content.js` | Update copy: "Saved to Pipelined", remove emoji; add the "Open in dashboard" link |
| `extension/content/contact_banner.js` | Same surface; User icon swap |
| `extension/manifest.json` | Bump version (`"version": "1.0.0"` → `"1.1.0"`); no other changes |

### 5.2 Create

| File | Purpose |
|------|---------|
| `extension/shared/tokens.css` | Single source of truth for extension CSS variables — imported by `popup.css` via `@import "../shared/tokens.css";` and pasted (Shadow DOM doesn't support cross-context imports) into the content banner |
| `extension/shared/STAGE_ABBREV.js` | Map of stage → abbreviation; consumed by `popup.js` |

### 5.3 No changes needed

- `extension/background/background.js` — service worker is purely network; no UI.
- `extension/content/boards/*` — DOM extractors; no UI.
- Extension test fixtures.

---

## 6. Tokens (transcribed from PRD-00)

```css
/* extension/shared/tokens.css */
:root {
  --brand-50:  #FDF2F2;
  --brand-100: #FAE0E0;
  --brand-600: #8C1515;  /* Cardinal Red */
  --brand-700: #820000;
  --brand-800: #6E0F0F;
  --surface-0: #FFFFFF;
  --surface-1: #FAFAFA;
  --surface-2: #F4F4F5;
  --surface-3: #EFEFF0;
  --text-1:    #2E2D29;
  --text-2:    #53565A;
  --text-3:    #8E8F94;
  --text-4:    #B4B5B9;
  --border-1:  rgba(0,0,0,0.06);
  --border-2:  rgba(0,0,0,0.10);
  --status-neutral: #71717A;
  --status-info:    #3B82F6;
  --status-violet:  #8B5CF6;
  --status-warn:    #F59E0B;
  --status-orange:  #F97316;
  --status-success: #175E54;
  --status-muted:   #71717A;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 8px;
  --shadow-popover: 0 1px 2px rgba(0,0,0,0.04), 0 2px 8px rgba(0,0,0,0.04);
}

@media (prefers-color-scheme: dark) {
  :root {
    --surface-0: #08090A;
    --surface-1: #0F1011;
    --surface-2: #1A1B1E;
    --surface-3: #212226;
    --text-1:    #F4F4F5;
    --text-2:    #A1A1AA;
    --text-3:    #71717A;
    --text-4:    #52525B;
    --border-1:  rgba(255,255,255,0.06);
    --border-2:  rgba(255,255,255,0.10);
  }
}
```

The extension popup honors the user's OS dark-mode preference via `prefers-color-scheme`. Until/unless we sync the web theme toggle into extension storage, this is the simplest correct behavior.

---

## 7. Popup row markup (after redesign)

```html
<li class="save-item">
  <a class="open-link" href="..." target="_blank" aria-label="Open Anthropic application">
    <span class="card-dot" style="background: var(--status-violet)"></span>
    <div class="card-info">
      <div class="company">Anthropic</div>
      <div class="role">Forward Deployed Engineer</div>
    </div>
    <div class="card-meta">
      <span class="stage-badge">Phn</span>
      <span class="save-time">2h ago</span>
    </div>
  </a>
</li>
```

```css
.save-item { display: block; border-bottom: 1px solid var(--border-1); }
.save-item:hover { background: var(--surface-2); }
.open-link { display: flex; align-items: center; gap: 12px; padding: 10px 12px; text-decoration: none; color: inherit; }
.card-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.card-info { flex: 1; min-width: 0; }
.company { font: 500 13px/1.3 Inter, system-ui, sans-serif; color: var(--text-1); }
.role { font: 400 12px/1.4 Inter, system-ui, sans-serif; color: var(--text-2); margin-top: 1px; }
.card-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; flex-shrink: 0; }
.stage-badge { font: 500 11px/1 Inter, system-ui, sans-serif; padding: 2px 6px; border-radius: 4px; background: var(--surface-2); color: var(--text-2); }
.save-time { font: 400 11px/1 Inter, system-ui, sans-serif; color: var(--text-3); }
```

---

## 8. Acceptance criteria

- [ ] Loading the unpacked extension (`chrome://extensions → Load unpacked → extension/`) shows the new popup design — no indigo, no gradient.
- [ ] Stage dot colors match `STAGE_COLORS` from the web app (Section 3.4 of PRD-00).
- [ ] Empty state shows a 40 px outline briefcase icon in `--text-3` and the new copy.
- [ ] Unauthenticated state shows the Cardinal Red Sign-in button.
- [ ] Auto-save toggle switch matches PRD-00's `Switch` primitive shape (28 × 16 px, Cardinal when on).
- [ ] Sign out moves into the user dropdown (header right).
- [ ] Content banner appears on save with dark surface, white text, check icon, "Open in dashboard" link.
- [ ] Banner auto-dismisses after 4 s with a 220 ms fade-out.
- [ ] Banner respects `prefers-reduced-motion: reduce` — no fade animation when set.
- [ ] OS dark-mode flips popup to dark surfaces automatically.
- [ ] Manifest version bumped.
- [ ] All extension tests in `extension/tests/` pass (they assert text content + DOM structure, not styles).
- [ ] No reference to `--brand-500: #6366F1` or any indigo hex remains.

---

## 9. Out of scope

- Side-panel API (Chrome 114+). Future feature.
- Options page redesign — keep current minimal options if any.
- New job boards. Just visual updates.
- Theme sync between web app and extension. The extension follows OS for now.
- Animated icon (the toolbar icon stays the same PNG).

---

## 10. Notes for the implementing agent

- **No Tailwind in the extension.** Plain CSS only.
- **Inter font loading**: the popup will use the system font stack since loading external fonts inside a Chrome popup adds latency. Body font: `-apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif`. Inter is named but if not present, system font is used. The visual difference is negligible at 11–13 px.
- The content banner is Shadow DOM — the tokens.css must be inlined (or `@import`-ed via constructed stylesheet). Easiest path: paste the variable block into the head of the shadow root's `<style>` element. `content.css` is the source of truth.
- The popup width stays at 360 px. Don't widen it — Chrome popups should fit naturally.
- Manifest changes are minimal. Don't restructure permissions or content_scripts in this PRD.
- The stage abbreviation map keeps to 3-letter codes so the right-aligned column stays narrow. Adjust if a stage doesn't fit.
- Resist adding new copy or features. This is a re-skin, full stop.
