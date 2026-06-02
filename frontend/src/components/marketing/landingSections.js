/** Section data for numbered landing sections 1.0–5.0. */

export const LANDING_SECTIONS = [
  {
    id: "capture",
    number: "1.0",
    eyebrow: "CAPTURE",
    headline: "Capture every job in one click.",
    subhead:
      "The Chrome extension reads LinkedIn, Greenhouse, Lever, Workday, and more. AI parses the JD, contacts, and salary band into a structured row. No copy-paste.",
    bullets: [
      "One-click save across the major boards",
      "AI-parsed JD, contact, and salary band",
      "Captures resume version and tags in one shot",
    ],
    ctaLabel: "Capture",
    ctaHref: "/register",
    imageSide: "right",
    screenshot: {
      src: "/screenshots/section-capture.png",
      alt: "Chrome extension popup saving a job listing",
      width: 800,
      height: 600,
      label: "Extension popup",
    },
  },
  {
    id: "plan",
    number: "2.0",
    eyebrow: "PLAN",
    headline: "Know what to do this morning.",
    subhead:
      "Today ranks every open thread. Interviews to confirm, follow-ups to send, applications to write, all in a single ranked list. Morning Brief arrives in your inbox by 8 AM.",
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
      label: "Today page",
    },
  },
  {
    id: "apply",
    number: "3.0",
    eyebrow: "APPLY",
    headline: "Draft a great application in two minutes.",
    subhead:
      "Apply Pack generates a tailored resume bullet set, cover letter, and \"why this company\" answer from the JD. Co-pilot answers anything else, grounded in your real pipeline.",
    bullets: [
      "No auto-send. You copy, you send.",
      "Cited from your résumé and the JD",
      "Streams in seconds via OpenRouter",
    ],
    ctaLabel: "Apply",
    ctaHref: "/register",
    imageSide: "right",
    screenshot: {
      src: "/screenshots/section-apply.png",
      alt: "Apply Pack tabs in the application detail panel",
      width: 800,
      height: 600,
      label: "Apply Pack",
    },
  },
  {
    id: "prep",
    number: "4.0",
    eyebrow: "PREP",
    headline: "Rehearse before the interview.",
    subhead:
      "Mock Interview runs a live session in your browser. Behavioural or technical, scored against the role. The debrief shows what to fix before the recruiter calls.",
    bullets: [
      "Behavioural and technical banks per role",
      "Real conversation feel, not a static quiz",
      "Debrief with strengths, gaps, and drills",
    ],
    ctaLabel: "Prep",
    ctaHref: "/register",
    imageSide: "left",
    screenshot: {
      src: "/screenshots/section-prep.png",
      alt: "Mock Interview session with question card and transcript",
      width: 800,
      height: 600,
      label: "Mock Interview",
    },
  },
  {
    id: "review",
    number: "5.0",
    eyebrow: "REVIEW",
    headline: "See where your time goes.",
    subhead:
      "Pipeline funnel, ghost rate per company, response time trends. A Weekly Review email arrives every Monday with what moved and what stalled.",
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
      label: "Analytics",
    },
  },
];
