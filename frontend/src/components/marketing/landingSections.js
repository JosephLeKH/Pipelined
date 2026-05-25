/** Section data for numbered landing sections 1.0–5.0. */

export const LANDING_SECTIONS = [
  {
    id: "capture",
    number: "1.0",
    eyebrow: "CAPTURE",
    headline: "Capture every job in one click.",
    subhead:
      "The Chrome extension reads LinkedIn, Greenhouse, Lever, Workday, and 6 more boards. AI parses the JD, contacts, and salary band into a structured row — no copy-paste.",
    bullets: [
      "One-click save across 10 boards",
      "AI-parsed JD, contact, and salary band",
      "Captures resume version + tags in one shot",
    ],
    ctaLabel: "Capture",
    ctaHref: "/register",
    imageSide: "right",
    screenshot: {
      src: "/screenshots/section-capture.png",
      alt: "Chrome extension popup saving a job listing",
      width: 800,
      height: 600,
      label: "Extension popup — screenshot coming with PRD-04",
    },
  },
  {
    id: "plan",
    number: "2.0",
    eyebrow: "PLAN",
    headline: "Know what to do this morning.",
    subhead:
      "Today ranks every open thread — interviews to confirm, follow-ups to send, applications to write — into one calm list. Morning Brief lands in your inbox by 8 AM.",
    bullets: [
      "Mission scorer ranks what matters today",
      "Snooze, complete, or open with j/k/Enter",
      "Morning Brief in your inbox at 8 AM local",
    ],
    ctaLabel: "Plan",
    ctaHref: "/register",
    imageSide: "left",
    screenshot: {
      src: "/screenshots/section-plan.png",
      alt: "Today page with mission list and morning brief",
      width: 800,
      height: 600,
      label: "Today page — screenshot coming with PRD-04",
    },
  },
  {
    id: "apply",
    number: "3.0",
    eyebrow: "APPLY",
    headline: "Draft a great application in two minutes.",
    subhead:
      "Apply Pack generates a tailored resume bullet set, cover letter, and \"Why this company\" answer from the JD. Co-pilot answers anything else — grounded in your real pipeline.",
    bullets: [
      "No auto-send — you copy, you send",
      "Cited from your résumé and the JD",
      "Streams in 8-10 seconds via OpenRouter",
    ],
    ctaLabel: "Apply",
    ctaHref: "/register",
    imageSide: "right",
    screenshot: {
      src: "/screenshots/section-apply.png",
      alt: "Apply Pack tabs in the application detail panel",
      width: 800,
      height: 600,
      label: "Apply Pack — screenshot coming with PRD-04",
    },
  },
  {
    id: "prep",
    number: "4.0",
    eyebrow: "PREP",
    headline: "Rehearse before the real call.",
    subhead:
      "Mock Interview runs a live SSE session in your browser — behavioural or technical, scored against the role. Debrief surfaces what to fix before the recruiter calls.",
    bullets: [
      "Behavioural + technical question banks per role",
      "Streaming via SSE — feels like a real call",
      "Debrief with strengths, gaps, and recommended drills",
    ],
    ctaLabel: "Prep",
    ctaHref: "/register",
    imageSide: "left",
    screenshot: {
      src: "/screenshots/section-prep.png",
      alt: "Mock Interview session with question card and transcript",
      width: 800,
      height: 600,
      label: "Mock Interview — screenshot coming with PRD-04",
    },
  },
  {
    id: "review",
    number: "5.0",
    eyebrow: "REVIEW",
    headline: "See where time goes.",
    subhead:
      "Pipeline funnel, ghost rate per company, response time trends — and a Weekly Review email every Monday with what moved and what stalled.",
    bullets: [
      "Pipeline funnel with stage drop-off",
      "Ghost-rate ranking per company",
      "Weekly Review email every Monday",
    ],
    ctaLabel: "Review",
    ctaHref: "/register",
    imageSide: "right",
    screenshot: {
      src: "/screenshots/section-review.png",
      alt: "Analytics page with funnel and KPI tiles",
      width: 800,
      height: 600,
      label: "Analytics — screenshot coming with PRD-04",
    },
  },
];
