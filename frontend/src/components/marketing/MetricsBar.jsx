/** Metrics bar — quantified social proof above the testimonials. */

import { useMarketingReveal } from "./useMarketingReveal";

const METRICS = [
  { value: "12,400+", label: "Applications tracked" },
  { value: "4.2 hrs", label: "Saved per week, on average" },
  { value: "10", label: "Job boards supported" },
  { value: "< 10s", label: "Apply Pack draft time" },
];

export default function MetricsBar() {
  const revealRef = useMarketingReveal();

  return (
    <section className="border-t border-border-1 bg-surface-0 py-16 md:py-20">
      <div
        ref={revealRef}
        className="marketing-reveal mx-auto grid max-w-6xl grid-cols-2 gap-y-10 px-6 md:grid-cols-4 md:gap-x-8"
      >
        {METRICS.map(({ value, label }) => (
          <div key={label} className="text-center md:text-left">
            <p className="text-display-md tracking-[-0.025em] text-brand-700">{value}</p>
            <p className="mt-1.5 text-xs font-medium uppercase tracking-[0.08em] text-text-3">
              {label}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
