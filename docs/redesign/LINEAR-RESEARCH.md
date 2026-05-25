# LINEAR-RESEARCH — Required reading for every PRD agent

**Status:** Mandatory pre-read before opening any redesign PRD.
**Owner:** Joseph
**Purpose:** Capture the canonical research sources so every implementing agent starts from the same understanding of Linear's design philosophy.

---

## 1. Why this exists

The 13 PRDs in this directory describe *what* to build (specific tokens, dimensions, component patterns). They do **not** fully describe *why* Linear's choices work — that lives in Linear's own writing and on the live product.

Fresh agents who only read a PRD will get the surface pattern right but may fail on edge cases. Edge cases get resolved by *principles*, not specs. This document points agents to the sources where Linear has published those principles.

**This is not a summary.** It is a research checklist. You must actually read the sources.

---

## 2. Required sources

### 2.1 Linear's own writing — primary

| URL | What to extract | Why it matters |
|-----|-----------------|----------------|
| `linear.app/method` | Design and engineering principles essays. The full "why opinionated software" thesis. | Source of truth for Linear's design philosophy. Read every essay listed. |
| `linear.app/blog` | Posts on typography, motion, color system, icons, density, command palette. Search for: `design system`, `typography`, `motion`, `craft`, `icon`. | Concrete reasoning behind specific choices (e.g., why Inter Display, why 220 ms drawer slide). |
| `linear.app/now` | Changelog format, dated entries, copy voice. | Use when writing the changelog snippet on the landing (PRD-02) or any product changelog UI. |
| `linear.app/customers` | Testimonial card composition, quote length, attribution style. | Use when writing the testimonial grid on the landing (PRD-02). |
| `linear.app/` (live home) | Current visual language: top nav height, footer columns, section vertical rhythm, hover transitions, scroll-reveal cadence. | The live site is the ground truth for visual decisions. Inspect element to read computed styles. |

### 2.2 Linear app itself

| Where | What to extract | Notes |
|-------|-----------------|-------|
| `linear.app` signed-in dashboard | Sidebar (240 px), top header (44 px), dense rows (32–40 px), dot status indicators, right-side detail drawer (520 px), cmd-K palette, `g` chord shortcuts. | If you don't have an account, the marketing screenshots on `linear.app/` and `linear.app/method` show enough. |
| `cmd-K` palette open | Section grouping, fuzzy search, action verbs, keyboard hints (e.g., `⌘ ↵`). | Mirror this exactly for our cmd-K (PRD-01, PRD-10). |
| Issue detail drawer | Header, status pill, two-column body (description + activity), hover-only row actions. | Mirror for our DetailPanel (PRD-04). |

### 2.3 Third-party Linear style extractions

| URL | What to extract | Caveat |
|-----|-----------------|--------|
| `windframe.dev/styles/linear` | Concrete token extraction: **Inter Variable** at `tracking-[-0.022em]`, max-w-[1024px] containers, `h-8` / `h-10` buttons, 8–10 px radius, `bg-white/80 backdrop-blur-[20px]` on nav, custom shadow stack on buttons with inset top highlight + stacked drop shadows. | No hex values exposed — cross-check Cardinal vs. Linear's purple against `linear.app` directly. |

### 2.4 Karri Saarinen and other Linear design voices

Linear's design is largely shaped by co-founder Karri Saarinen and the design team. Useful supplementary reading if you have time:

- Karri Saarinen's personal site and writing (search his name + "Linear" or "design system").
- Talks recorded at Config (Figma's conference) and Beyond Tellerrand on opinionated product design.
- The "Building Linear" blog series — long-form posts on craft.

---

## 3. Extraction targets — what every agent should walk away knowing

After reading the sources, you should be able to answer these without re-checking:

1. **Why Inter Display (not Inter)?** Display variant has tighter spacing and a more compressed feel suitable for product UI.
2. **Why `-0.022em` tracking?** Inter at small sizes needs negative tracking to feel optical-rather-than-mechanical at 13 px.
3. **Why 220 ms cubic-bezier(0.22, 0.61, 0.36, 1) for drawers?** Custom curve feels purposeful — fast start, gentle settle.
4. **Why dot indicators, not pill backgrounds?** Density. A 6 px dot reads at any zoom; a tinted pill steals row real estate.
5. **Why almost no shadows?** Linear treats shadows as a signal of elevation, reserved for popovers/modals only. Cards are flat.
6. **Why 4-column-ish footer (we expanded to 6)?** Information architecture is dense but scannable — readers know where to look.
7. **Why a single accent color, used sparingly?** A focused product needs a focused palette. The accent says "this is important"; if everything is accent, nothing is.

If you can't answer these confidently after reading, read more before writing code.

---

## 4. Conflict resolution rules

Inevitable: a PRD will specify something that contradicts a stated Linear principle. When this happens:

1. **Stop.** Don't just implement the PRD or just follow the principle.
2. **Flag the conflict in the PR description** with: which PRD section, which principle, which source URL.
3. **Propose a resolution.** Default: prefer Linear's principle unless the PRD's deviation is explicitly justified (e.g., "we deviate here because Pipelined-specific reason X").
4. **Stanford palette override:** Cardinal Red `#8C1515` and the Cardinal hover/pressed variants are the **only** Linear color overrides we accept. Linear's purple `#5E6AD2` is gone. Every other Linear token — neutrals, surfaces, borders, text — stands.

---

## 5. Citation requirement

Every PR opened against a PRD must cite **at least one** Linear source in its description, in the form:

```
Followed Linear's typography principle from linear.app/blog/post-on-typography:
"Inter Display at -0.022em tracking is used because [extracted reasoning]."
```

This forces the agent to have actually read the source, not just claimed to.

---

## 6. What is *not* required research

The following are **out of scope** for this redesign and you should not waste time reading them:

- Linear's mobile app (we are web + extension only).
- Linear's API and developer documentation.
- Linear's pricing tiers (we have our own pricing model).
- Linear's specific features (Cycles, Roadmaps, Triage) — we are not copying features, only design language.
- Competitor product writing (Jira, Asana, Height). Linear is the only reference.

---

## 7. Memory aid — the one-line summary

> **Linear is the design language. Stanford Cardinal is the only color override. Everything else — fonts, spacing, motion, density, radii, shadows, hover states, drawer patterns, keyboard shortcuts — comes from Linear, and if a PRD spec contradicts a Linear principle, the principle wins and the conflict gets flagged in the PR.**

Tape that to your monitor before writing code.
