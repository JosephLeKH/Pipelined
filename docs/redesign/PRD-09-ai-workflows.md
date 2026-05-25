# PRD-09 — AI Workflows (Co-pilot, Apply Pack, Mock Interview, Resume Insights, etc.)

**Status:** Ready (blocked on PRD-00, PRD-04)
**Depends on:** PRD-00, PRD-04 (DetailPanel section pattern)
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

Pipelined has 9 AI-touch surfaces (Co-pilot, Apply Pack, Mock Interview, Interview Prep, Resume Insights, Follow-up Draft, Thread Summary, Prep Checklist, Mission Prep). They currently feel inconsistent — some are tab-based, some are inline collapsible cards, some open as drawers. We unify them into **one pattern**: AI workflows render inside the DetailPanel as collapsible sections, with one global drawer (Co-pilot) anchored from the AppShell.

Linear inspiration:
- Linear's right-side issue panel sections (Activity, Linked, Sub-issues, Attachments) are the same pattern we want for AI sections inside DetailPanel.
- Linear AI's streaming responses with subtle "thinking" indicator.

Product policy reminder (from CLAUDE.md):
- **No auto-send.** Drafts are copy-only.
- **No PDF edit.** Resume insights are suggest-only.
- **No auto-apply.** Autopilot approve creates "To Apply" stage; user applies externally.

These constraints stay. The redesign affects *how* the UI presents these workflows.

---

## 2. Sources to read first

- Linear AI's "Ask AI" panel (cmd-K → Ask AI).
- Anthropic Claude.ai's message streaming UI for tone.
- Existing:
  - `frontend/src/components/CoPilotPanel.jsx`
  - `frontend/src/components/ApplyPackSection.jsx`
  - `frontend/src/components/InterviewPrepAgent.jsx`
  - `frontend/src/components/MockInterviewPanel.jsx`
  - `frontend/src/components/ResumeSection.jsx`
  - `frontend/src/components/ResumeInsightsSection.jsx`
  - `frontend/src/components/AiSection.jsx`
  - `frontend/src/components/AiFitSection.jsx`
  - `frontend/src/components/AiPanelGroup.jsx`
  - `frontend/src/components/FollowUpDraftSection.jsx`
  - `frontend/src/components/ThreadSummarySection.jsx`
  - `frontend/src/components/PrepChecklist.jsx`
  - `frontend/src/components/PrepSection.jsx`

---

## 3. Pattern: AI section inside DetailPanel

Every AI workflow that's bound to an application renders as a collapsible section in DetailPanel:

```
── ✦ Apply Pack ──────────────────────────────────  Generate
   [collapsed]

── ✦ Mock Interview ──────────────────────────────  Start
   [collapsed]

── ✦ Interview Prep ──────────────────────────────  Generate
   [expanded]
   ┌──────────────────────────────────────────┐
   │ Company snapshot                          │
   │ Anthropic is a safety-first AI company …  │
   │                                           │
   │ Recent news                               │
   │ • Released Claude 4.7 (May 2026)          │
   │ • Hired 50 engineers Q1                   │
   │                                           │
   │ Talking points                            │
   │ 1. Why Anthropic over OpenAI?             │
   │ 2. Your interest in AI safety             │
   │ 3. Recent paper on …                      │
   │                                           │
   │ Generated 2h ago · ✦ via OpenRouter       │
   └──────────────────────────────────────────┘
   [Regenerate]  [Copy as markdown]

── ✦ Resume Insights ─────────────────────────────  Generate
── ✦ Follow-up Draft ─────────────────────────────  Generate
── ✦ Thread Summary ──────────────────────────────  Available
```

### 3.1 Section header

```jsx
<button
  type="button"
  className="
    flex w-full items-center gap-2 py-3
    text-sm font-semibold text-text-1
    hover:bg-surface-1 transition-colors
  "
  aria-expanded={expanded}
>
  <Sparkles size={14} className="text-brand-600" />
  <span>{title}</span>
  <span className="ml-auto text-xs text-text-3">{status}</span>
  <ChevronDown size={14} className={expanded ? "rotate-180" : ""} />
</button>
```

- Status text right-aligned: "Generate" (not yet run), "Available" (cached result ready), "Generating…" (in progress), "Updated 2h ago" (cached + age).
- Cardinal sparkle icon to telegraph "AI section".
- Default closed; persists open/closed per-section in localStorage.

### 3.2 Section body

When expanded:
- Padding 12 px 16 px.
- If no result yet: empty state with "Generate" button (Cardinal primary).
- If generating: shimmer skeleton + "Generating…" status.
- If result: markdown render + footer (Regenerate ghost button + Copy button).

### 3.3 Streaming generation

For sections that stream (Mock Interview SSE, Apply Pack, Co-pilot):
- Stream into a div with `data-streaming="true"`.
- Cursor: 1 px Cardinal Red bar, blinks every 530 ms (only when streaming).
- "Stop" button replaces "Generate" while streaming.

---

## 4. Co-pilot drawer (global)

Co-pilot is the **only AI surface anchored outside DetailPanel**. It opens from the sidebar (PRD-01) as a 520 px right drawer. The drawer survives navigation.

```
┌─ Co-pilot ─────────────────────────────────── ×─┐
│                                                 │
│  Suggestions                                    │
│  ▸ Today's priorities                           │
│  ▸ Why did Anthropic ghost me?                  │
│  ▸ How to follow up with Stripe?                │
│                                                 │
│  ──────────── messages ─────────────            │
│                                                 │
│  ▢ How should I prep for the Stripe technical?  │
│                                                 │
│  ✦ Based on your application from Dec 12, the   │
│    role focuses on payments infrastructure …    │
│                                                 │
│    Open Stripe →                                │
│                                                 │
│ ───────────────────────────────────────────────-│
│  [Ask anything…                              ↑] │
└─────────────────────────────────────────────────┘
```

- Header: 48 px, "Co-pilot" + ×.
- Suggestions: chip-style list shown when input is empty. Click → fills input.
- Messages: user on right (Cardinal-tinted bubble), AI on left (no bubble, just markdown + Cardinal sparkle icon).
- "Open Stripe →" inline link in AI message: clicking navigates to that application.
- Input: 36 px tall, full-width, Cardinal send button right (Up-arrow icon, disabled when empty).
- Streaming: same cursor pattern as §3.3.
- Empty state (no messages): suggestions visible only.

### 4.1 Privacy note

Footer of drawer: `text-xs text-text-3` "Grounded on your data. Never shared with third parties."

---

## 5. Apply Pack

`ApplyPackSection.jsx` generates: cover letter, "Why us?" answer, LinkedIn note, talking points.

UI:
- 4 tabs (Cover letter / Why us? / LinkedIn / Talking points).
- Tab strip: 32 px tall, underline-active.
- Body: markdown of the selected tab.
- Each tab has its own Regenerate button + Copy button.
- Variables in cover letter (`{{role}}`, `{{company}}`) auto-substituted.

---

## 6. Mock Interview

`MockInterviewPanel.jsx` runs a streaming SSE session.

Pre-session:
```
   Ready to practice?

   We'll simulate a 15-minute phone screen for FDE Intern at Anthropic.
   You'll see the AI's questions; type or speak your answers.
   At the end, you'll get a structured debrief.

   [Start mock interview]
```

During session:
- 2-column layout: turn history (left scroll) + current AI message (right, large).
- "End interview" button.
- Mic button for voice input (uses Web Speech API if available; else hidden).

Post-session debrief:
- Stars (1–5) for: structure, content, clarity, vocabulary.
- Markdown debrief.
- "Save to application" + "Start another".

---

## 7. Interview Prep

`InterviewPrepAgent.jsx` — research agent for a company + role.

UI:
- Tabs: Company snapshot · Recent news · Talking points · Likely questions.
- Each tab has its own content (markdown).
- Loading: shimmer skeleton rows.
- Footer: "Generated using Exa + OpenRouter · 2h ago" — `text-xs text-text-3`.

---

## 8. Resume Insights

`ResumeInsightsSection.jsx` — tailored tips for one job.

UI:
- Section: "Tailoring suggestions" + markdown bullets.
- Each bullet has a copy button on hover (clipboard icon, 14 px ghost).
- Footer: "Generated 2h ago · ✦ OpenRouter" and "Insights are suggestions — your stored resume is never modified."

---

## 9. Follow-up Draft

`FollowUpDraftSection.jsx` — generates an email body the user copies into Gmail/etc.

UI:
- "To" field auto-filled with recruiter email if known.
- "Subject" + "Body" fields editable, default-generated.
- "Copy email" button.
- Microcopy: "We don't send on your behalf. Copy the draft and send from your inbox."

The user explicitly asked us to expand this from the Dashboard URL `?action=follow-up`. Keep that deep link working — it opens DetailPanel with this section pre-expanded.

---

## 10. Thread Summary

`ThreadSummarySection.jsx` — TL;DR of an email thread tied to this application.

UI:
- "Latest message" date.
- 3-bullet TL;DR.
- "Open full thread →" link to email if Gmail integration is wired.

---

## 11. Prep Checklist

`PrepChecklist.jsx` + `PrepSection.jsx` — used on interview events and DetailPanel.

UI:
- 32 px rows with 14 × 14 checkbox.
- Reorderable via drag handles on hover.
- "Add item" inline at the bottom.

---

## 12. AiFitSection / AiSection / AiPanelGroup

These are the older wrappers. Consolidate:
- `AiFitSection` → just renders FitBadge + a 1-line tooltip explanation. Inline in DetailPanel meta row.
- `AiSection` → replaced by the §3 pattern. Delete this wrapper after migrating its callers.
- `AiPanelGroup` → groups the AI section headers visually (just a `<div>` with section dividers between). Keep but re-skin per Section 3.

---

## 13. File manifest

### 13.1 Edit (every AI component)

| File | Change |
|------|--------|
| `frontend/src/components/CoPilotPanel.jsx` | Drawer per Section 4 |
| `frontend/src/components/ApplyPackSection.jsx` | Tabs + per Section 5 |
| `frontend/src/components/MockInterviewPanel.jsx` | Per Section 6 |
| `frontend/src/components/InterviewPrepAgent.jsx` | Per Section 7 |
| `frontend/src/components/ResumeSection.jsx` | Wrapper for InsightsSection |
| `frontend/src/components/ResumeInsightsSection.jsx` | Per Section 8 |
| `frontend/src/components/FollowUpDraftSection.jsx` | Per Section 9 |
| `frontend/src/components/ThreadSummarySection.jsx` | Per Section 10 |
| `frontend/src/components/PrepChecklist.jsx` | Per Section 11 |
| `frontend/src/components/PrepSection.jsx` | Wrapper for checklist |
| `frontend/src/components/AiPanelGroup.jsx` | Section divider + Sparkle icon header per Section 3.1 |
| `frontend/src/components/AiFitSection.jsx` | Inline FitBadge only |

### 13.2 Create

| File | Purpose |
|------|---------|
| `frontend/src/components/ai/AiSectionHeader.jsx` | Reusable header per §3.1 |
| `frontend/src/components/ai/StreamingCursor.jsx` | 1 px Cardinal blink |
| `frontend/src/components/ai/GenerateButton.jsx` | Standardizes Generate / Regenerate / Stop button |

### 13.3 Delete

- `frontend/src/components/AiSection.jsx` if no longer used after refactor. Update callers to use new pattern.

---

## 14. Acceptance criteria

- [ ] Every AI section inside DetailPanel uses the same header pattern (sparkle + title + status + chevron).
- [ ] Cached sections show "Updated Xh ago"; uncached show "Generate"; in-progress shows "Generating…".
- [ ] Co-pilot drawer is 520 px, slides in 220 ms, persists across navigation.
- [ ] Co-pilot suggestions appear only when input is empty.
- [ ] Streaming responses show the Cardinal cursor while generating.
- [ ] Apply Pack tabs work; Copy + Regenerate buttons work.
- [ ] Mock Interview shows pre/during/post phases.
- [ ] Interview Prep tabs render 4 categories.
- [ ] Resume Insights copy button works per-bullet.
- [ ] Follow-up Draft expansion preserves deep link `?action=follow-up`.
- [ ] No section silently fails — every error shows ApiErrorMessage inline.
- [ ] All component tests pass.
- [ ] Dark theme verified.

---

## 15. Out of scope

- New AI features.
- Model selection UI (user can't pick model — OpenRouter routing decides).
- Voice input for Co-pilot (only Mock Interview).
- Diff views for resume edits (per product policy, no edits).
- Auto-send buttons of any kind.

---

## 16. Notes for the implementing agent

- The streaming cursor is a tiny detail that does a lot of visual lifting. Implement it as a span with `animation: blink 1.06s steps(2, end) infinite` and a `bg-brand-600 w-px h-3 inline-block ml-0.5`.
- Don't reach for a chat library (`assistant-ui`, etc.). The existing `CoPilotPanel.jsx` already handles streaming — re-skin only.
- The privacy footer is **non-negotiable** — every AI surface should somewhere display the message that we don't auto-send / auto-edit / auto-apply.
- Consider that the user may not want to install AI patterns in the Job Board (PRD-06) for now — keep Job Board's "Recommendations" inline, no new sections there.
- Don't add a "thumbs up / thumbs down" feedback UI to AI output here. Feedback goes through the FeedbackWidget (PRD-10).
