# PRD-03 — Auth Surface

**Status:** Ready (blocked on PRD-00)
**Depends on:** PRD-00
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

The current `AuthLayout.jsx` is a split-screen with a clay-orange gradient brand panel on the left. Linear's auth pages are the opposite: a **single centered column on a white surface**, almost invisible chrome. The visual hierarchy is the form, not a sales pitch — by the time someone is on `/login` or `/register`, they're already converted.

We're swapping the gradient brand panel for a tight, centered form with the Pipelined wordmark above it. Auth becomes a calm waypoint, not another marketing surface.

---

## 2. Sources to read first

- `linear.app/login` (or take a screenshot of any Linear auth screen).
- `vercel.com/login` — even more minimal; same vibe.
- Existing: `frontend/src/components/AuthLayout.jsx`, `frontend/src/pages/Login.jsx`, `frontend/src/pages/Register.jsx`, `frontend/src/pages/ForgotPassword.jsx`, `frontend/src/pages/ResetPassword.jsx`, `frontend/src/pages/VerifyEmailPending.jsx`, `frontend/src/pages/VerifyEmailConfirm.jsx`, `frontend/src/components/LoginForm.jsx`, `frontend/src/components/RegisterForm.jsx`, `frontend/src/components/GoogleAuthButton.jsx`, `frontend/src/components/GithubAuthButton.jsx`.

---

## 3. Target layout

```
                    ◍ Pipelined                ← wordmark, 18 px, link to /
                                                  Cardinal-Red GitBranch glyph + text

                  Welcome back                  ← 24 px, 600, -0.022em
        Log in to keep your search moving       ← 14 px, text-text-2

         [ Continue with Google      ]          ← 36 px, secondary button
         [ Continue with GitHub      ]

         ────────── or with email ──────────    ← 11 px label, text-text-3

         Email
         [_______________________________]      ← 36 px input

         Password                  Forgot?       ← label row with right-aligned link
         [_______________________________]

         [          Log in           ]          ← Cardinal primary

         Don't have an account?  Sign up        ← center, 13 px
```

**Vertical rhythm:**
- Wordmark → headline: 48 px
- Headline → subhead: 8 px
- Subhead → first OAuth button: 32 px
- Between OAuth buttons: 8 px
- Last OAuth → divider: 24 px
- Divider → first input: 24 px
- Between input rows: 16 px
- Last input → submit: 24 px
- Submit → footer link: 24 px

Container: `max-w-[360px]`, centered on `min-h-screen`. Background `bg-surface-0` (no gradient).

---

## 4. Files to modify

### 4.1 Replace

| File | Change |
|------|--------|
| `frontend/src/components/AuthLayout.jsx` | Remove the gradient `<BrandPanel />`. Render only the centered column. Add the wordmark above `{children}`. Drop the `lg:grid-cols-2` layout entirely. |

### 4.2 Edit (re-skin only, no structural changes)

| File | Change |
|------|--------|
| `frontend/src/pages/Login.jsx` | Update headline/subhead copy; remove redundant tagline; keep OAuth buttons, divider, LoginForm, signup link |
| `frontend/src/pages/Register.jsx` | Same pattern: headline "Create your account", subhead "Track your job search in one place" |
| `frontend/src/pages/ForgotPassword.jsx` | Use AuthLayout; headline "Reset your password"; one input + submit + back-to-login link |
| `frontend/src/pages/ResetPassword.jsx` | Use AuthLayout; headline "Choose a new password"; two inputs (new, confirm) + submit |
| `frontend/src/pages/VerifyEmailPending.jsx` | Use AuthLayout; headline "Check your email"; show 16 × 16 Mail icon, subhead with masked email; resend button |
| `frontend/src/pages/VerifyEmailConfirm.jsx` | Use AuthLayout; success or error state; if success, auto-redirect to `/today` after 2 s |
| `frontend/src/components/LoginForm.jsx` | Re-skin inputs per PRD-00 (36 px, 6 px radius); error message `text-brand-700` 12 px below input; submit button Cardinal primary `lg` size, full width |
| `frontend/src/components/RegisterForm.jsx` | Same; password strength meter (existing) restyled as 4-segment bar (each 4 px tall, 4 px gap, status colors per strength level) |
| `frontend/src/components/GoogleAuthButton.jsx` | Wrap Google's GIS button in our shell: full-width 36 px button, `bg-surface-0 border-border-2 text-text-1`, hover `bg-surface-1`, Google logo 16 × 16 left, label "Continue with Google" |
| `frontend/src/components/GithubAuthButton.jsx` | Same shape; GitHub mark 16 × 16 in `text-text-1`, label "Continue with GitHub" |
| `frontend/src/pages/GithubCallback.jsx` | Loading state matches AuthLayout; show wordmark + small spinner + "Signing you in…" |
| `frontend/src/pages/GmailCallback.jsx` | Same |

### 4.3 Delete

- The `BrandPanel`, `FEATURES` array, and gradient classes inside `AuthLayout.jsx`. They go.
- Any leftover "Stanford CS student" italic line — keep it only in the marketing footer (PRD-02), not on auth pages.

---

## 5. Form input spec

```jsx
<label className="block text-xs font-medium text-text-2">
  {labelText}
</label>
<input
  className="
    mt-1.5 block h-9 w-full rounded-md
    border border-border-2 bg-surface-0 px-3
    text-sm text-text-1 placeholder:text-text-3
    transition-colors duration-100 ease-out
    focus:outline-none focus:border-brand-600 focus:ring-1 focus:ring-brand-600
    disabled:opacity-50 disabled:bg-surface-1
    invalid:border-brand-700 invalid:focus:ring-brand-700
  "
/>
<p className="mt-1.5 text-xs text-brand-700 hidden data-[error=true]:block">
  {errorMessage}
</p>
```

- Height: 36 px (`h-9`).
- Border: `--border-2` default, focus `--brand-600` + 1 px ring same color.
- Placeholder: `--text-3` (`#8E8F94`).
- Error state: `--brand-700` border + inline message below.

Password input pairs with a 14 × 14 eye toggle inside the right edge (`absolute right-3 top-1/2 -translate-y-1/2`).

---

## 6. Password strength meter (Register only)

Currently inside `RegisterForm.jsx`. New design:

```
[ █████ ████  ▓▓▓▓  ▓▓▓▓ ]  Strong
```

- 4 segments, each `h-1 w-full rounded-sm`, gap `gap-1`.
- Filled = `bg-status-success` (or `bg-status-warn` / `bg-status-orange` per level).
- Empty = `bg-surface-2`.
- Label right of the bar, 12 px, color matches highest-filled segment.

Levels (from existing logic):
1. Weak: 1 segment, `--status-orange`.
2. Fair: 2 segments, `--status-warn` (amber).
3. Good: 3 segments, `--status-info` (blue).
4. Strong: 4 segments, `--status-success` (Palo Alto).

---

## 7. Verify-email pending state

This page is currently text-heavy. New version:

```
                ◍ Pipelined

              ✉  (Mail icon, 24 × 24, text-brand-600)

           Check your email

  We sent a verification link to
  jo***@stanford.edu

  [ Resend verification email ]    ← secondary button

  Wrong email?  Sign out  ← 12 px, text-text-3
```

The Mail icon should pulse softly (1.4 s opacity 0.7 → 1) — using `motion-safe:animate-pulse-soft`.

---

## 8. Verify-email confirm states

Token present + valid:
```
                ◍ Pipelined

              ✓  (Check icon, 24 × 24, text-status-success)

         You're all set.
  Your email is verified. Redirecting to Today…
```

Token invalid/expired:
```
                ◍ Pipelined

              ⊘  (X icon, 24 × 24, text-brand-700)

         This link expired.
  Request a new verification email below.

  [ Send a new link ]   ← primary
```

---

## 9. Acceptance criteria

- [ ] No file imports `BrandPanel` or references the gradient classes.
- [ ] `AuthLayout.jsx` is ≤ 60 lines; renders a single centered column with wordmark.
- [ ] Login, Register, ForgotPassword, ResetPassword, VerifyEmailPending, VerifyEmailConfirm all use the same `AuthLayout`.
- [ ] All form inputs are 36 px tall with 6 px radius and Cardinal focus ring.
- [ ] OAuth buttons (Google + GitHub) are full-width `secondary` buttons with brand-correct logos.
- [ ] Primary submit buttons are full-width Cardinal Red `lg` buttons.
- [ ] Password strength meter renders as 4 segments with the correct color per level.
- [ ] Tests `Login.test.jsx`, `Register.test.jsx`, `ForgotPassword.test.jsx`, `ResetPassword.test.jsx`, `VerifyEmailPending.test.jsx`, `VerifyEmailConfirm.test.jsx`, `LoginForm.test.jsx`, `RegisterForm.test.jsx`, `AuthLayout.test.jsx`, `GoogleAuthButton.test.jsx`, `GithubAuthButton.test.jsx` all pass (they query by label/role).
- [ ] Light + dark both render correctly; wordmark logo glyph is Cardinal Red in both modes.
- [ ] Keyboard tab order: email → password → forgot link → submit → OAuth → footer link. Focus rings visible everywhere.
- [ ] Submit button shows loading state (spinner + "Logging in…") when pending; disabled during submit.

---

## 10. Out of scope

- Magic-link login (passwordless). Future feature.
- 2FA flows.
- Social login providers beyond Google + GitHub.
- Apple Sign-in (would need Apple Developer setup — not now).
- SAML/SSO for enterprises.

---

## 11. Notes for the implementing agent

- The Google button is a special case — Google's GIS library wants to render its own button. Wrap their button visually but don't try to render a custom one (you'll lose the Google branding compliance). Use their `data-type="standard" data-shape="rectangular" data-theme="filled_black"` for dark mode and `outline` for light. The CSS overrides should make the button match our 36 px height.
- The GitHub button is fully custom — render an `<a href={githubOAuthUrl}>` styled as our secondary button.
- Currently `AuthLayout.jsx` is 99 lines with the brand panel. After this PRD it should be ~50 lines.
- Don't try to be clever with the password input's eye-toggle — use the existing implementation from `LoginForm.jsx` / `RegisterForm.jsx` if it exists, else add a tiny `<button type="button" onClick={() => setVisible(!visible)}>` with the Eye / EyeOff lucide icons.
- Email masking on the pending page: keep the first 2 characters, mask the rest of the local part, keep the domain. `joseph@stanford.edu` → `jo***@stanford.edu`.
- The `auto-redirect after 2s` on VerifyEmailConfirm success should respect `prefers-reduced-motion` by also displaying a "Continue" button so users on screen readers don't get whisked away.
