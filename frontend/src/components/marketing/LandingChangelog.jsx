/** Changelog snippet section — zebra stripe bg-surface-1. */

import { toast } from "sonner";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";

import { useMarketingReveal } from "./useMarketingReveal";

const CHANGELOG_ENTRIES = [
  { title: "Resizable Sidebar", description: "Drag to fit your screen", date: "May 31" },
  { title: "Notes WYSIWYG", description: "Inline bold, italic, lists", date: "May 30" },
  { title: "Faster Job Board", description: "4× daily GitHub sync", date: "May 30" },
  { title: "Grounded Co-pilot", description: "Per-user retrieval (RAG)", date: "May 28" },
  { title: "Cardinal Refresh", description: "New palette + Inter type scale", date: "May 26" },
  { title: "Crash Reporting", description: "Sentry on backend and client", date: "May 24" },
  { title: "Pending Inbox", description: "Redesigned Autopilot review", date: "May 21" },
  { title: "Mock Interview", description: "Live SSE rehearsals", date: "May 18" },
  { title: "Settings Overhaul", description: "Two-column with dark mode", date: "May 15" },
  { title: "Stage Palette", description: "12 color presets", date: "May 12" },
  { title: "Watchlist", description: "Daily career-page scans", date: "May 09" },
  { title: "Apply Pack v2", description: "Cited bullets + CL draft", date: "Apr 27" },
];

export default function LandingChangelog() {
  const revealRef = useMarketingReveal();

  const handleViewAll = (event) => {
    event.preventDefault();
    toast.info("Full changelog coming soon");
  };

  return (
    <section id="changelog" className="marketing-section border-t border-border-1 bg-surface-1">
      <div ref={revealRef} className="marketing-reveal mx-auto max-w-6xl px-6">
        <p className="mb-6 text-xs font-medium uppercase tracking-[0.08em] text-brand-700">
          Changelog
        </p>
        <ul className="divide-y divide-border-1 border-y border-border-1">
          {CHANGELOG_ENTRIES.map((entry, index) => (
            <li
              key={entry.title}
              className={`flex h-14 items-center justify-between gap-4 ${index === CHANGELOG_ENTRIES.length - 1 ? "border-b-0" : ""}`}
            >
              <span className="text-sm font-medium text-text-1">
                {entry.title}
                <span className="font-normal text-text-2"> · {entry.description}</span>
              </span>
              <span className="shrink-0 text-xs font-medium text-text-3">{entry.date}</span>
            </li>
          ))}
        </ul>
        <a
          href="/#changelog"
          onClick={handleViewAll}
          className="group marketing-focus mt-6 inline-flex items-center gap-1 text-sm font-medium text-brand-700"
        >
          View changelog
          <ArrowRight className="cta-arrow-hover h-3.5 w-3.5" aria-hidden="true" />
        </a>
      </div>
    </section>
  );
}
