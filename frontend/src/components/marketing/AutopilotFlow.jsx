/** Autopilot flow. Visual narrative of the agentic loop (scan, draft, rehearse, review). */

import Radar from "lucide-react/dist/esm/icons/radar";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Mic from "lucide-react/dist/esm/icons/mic";
import LineChart from "lucide-react/dist/esm/icons/line-chart";

import { useMarketingReveal } from "./useMarketingReveal";

const FLOW_STEPS = [
  {
    icon: Radar,
    label: "01 · Scan",
    title: "Watchlist scans the major boards nightly.",
    description:
      "While you sleep, Autopilot crawls LinkedIn, Greenhouse, Lever, Workday and more. It filters by your profile, tags, and salary band.",
  },
  {
    icon: FileText,
    label: "02 · Draft",
    title: "Apply Pack writes a tailored draft.",
    description:
      "Resume bullets, cover letter, and \"why this company,\" cited from your résumé and the JD. You copy. You send.",
  },
  {
    icon: Mic,
    label: "03 · Rehearse",
    title: "Mock Interview runs in your browser.",
    description:
      "Behavioural or technical, scored against the actual role. Live conversation feel. The debrief tells you exactly what to fix.",
  },
  {
    icon: LineChart,
    label: "04 · Review",
    title: "Weekly Review lands every Monday.",
    description:
      "Pipeline funnel, ghost rate, response times, and what moved this week. You see what to double down on.",
  },
];

export default function AutopilotFlow() {
  const revealRef = useMarketingReveal();

  return (
    <section
      id="autopilot"
      className="relative overflow-hidden border-t border-border-1 bg-surface-0 py-20 lg:py-28"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-200/60 to-transparent"
      />

      <div ref={revealRef} className="marketing-reveal mx-auto max-w-6xl px-6">
        <div className="mx-auto max-w-2xl text-center">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-brand-700">
            Agentic by design
          </p>
          <h2 className="mt-4 text-display-lg tracking-[-0.025em] text-text-1">
            An AI-native loop, working in the background.
          </h2>
          <p className="mt-4 text-base leading-[1.6] text-text-2">
            Pipelined isn&apos;t a spreadsheet with autocomplete. It&apos;s a system of agents
            that scout, draft, rehearse, and review. Your job search compounds while you
            sleep.
          </p>
        </div>

        <div className="relative mt-16">
          <div
            aria-hidden="true"
            className="absolute left-0 right-0 top-[28px] hidden h-px bg-gradient-to-r from-transparent via-brand-200 to-transparent lg:block"
          />

          <ol className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-4 lg:gap-6">
            {FLOW_STEPS.map(({ icon: Icon, label, title, description }, idx) => (
              <li key={label} className="relative flex flex-col">
                <div className="relative z-10 mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-border-1 bg-surface-0 shadow-[0_8px_24px_-12px_rgba(140,21,21,0.25),0_1px_3px_-1px_rgba(0,0,0,0.04)]">
                  <Icon
                    className="h-5 w-5 text-brand-700"
                    strokeWidth={1.8}
                    aria-hidden="true"
                  />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-[10px] font-semibold text-white">
                    {idx + 1}
                  </span>
                </div>

                <p className="text-xs font-medium uppercase tracking-[0.08em] text-text-3">
                  {label}
                </p>
                <h3 className="mt-2 text-base font-semibold leading-snug text-text-1">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-2">{description}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mx-auto mt-16 max-w-3xl rounded-2xl border border-border-1 bg-surface-1 p-6 md:p-7">
          <p className="text-center text-sm leading-relaxed text-text-2">
            <span className="font-semibold text-text-1">Suggest-only by policy.</span>{" "}
            Autopilot drafts and Mock Interviews <em>never</em> auto-send. You review, edit,
            and ship. Pipelined just removes the friction in between.
          </p>
        </div>
      </div>
    </section>
  );
}
