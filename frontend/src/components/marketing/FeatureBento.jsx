/** Feature bento. Mixed-size product highlight grid (Ramp-style). */

import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import Chrome from "lucide-react/dist/esm/icons/chrome";
import Mail from "lucide-react/dist/esm/icons/mail";
import Calendar from "lucide-react/dist/esm/icons/calendar";
import Target from "lucide-react/dist/esm/icons/target";
import ShieldCheck from "lucide-react/dist/esm/icons/shield-check";

import { useMarketingReveal } from "./useMarketingReveal";

function BentoCard({ children, className = "" }) {
  return (
    <div
      className={[
        "group relative flex flex-col overflow-hidden rounded-2xl border border-border-1 bg-surface-0 p-6",
        "transition-all duration-200 hover:border-border-2 hover:shadow-[0_12px_40px_-20px_rgba(0,0,0,0.12)]",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}

function FeatureLabel({ icon: Icon, label }) {
  return (
    <div className="mb-4 inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-text-3">
      <Icon className="h-3.5 w-3.5 text-brand-700" aria-hidden="true" />
      {label}
    </div>
  );
}

function CopilotPreview() {
  const messages = [
    { from: "you", text: "Which Stripe interviewer should I prep for?" },
    {
      from: "ai",
      text: "Based on your loop, you have Sarah Chen, Senior PM. She tends to dig into product sense and data trade-offs.",
    },
  ];
  return (
    <div className="mt-2 rounded-xl border border-border-1 bg-surface-1 p-3">
      {messages.map(({ from, text }) => (
        <div
          key={text}
          className={[
            "mb-2 last:mb-0 max-w-[85%] rounded-lg px-3 py-2 text-xs leading-relaxed",
            from === "ai"
              ? "ml-auto bg-brand-700 text-white"
              : "bg-surface-0 text-text-2 border border-border-1",
          ].join(" ")}
        >
          {text}
        </div>
      ))}
    </div>
  );
}

export default function FeatureBento() {
  const revealRef = useMarketingReveal();

  return (
    <section className="border-t border-border-1 bg-surface-1 py-20 lg:py-24">
      <div ref={revealRef} className="marketing-reveal mx-auto max-w-6xl px-6">
        <div className="mb-12 max-w-2xl">
          <p className="text-xs font-medium uppercase tracking-[0.1em] text-brand-700">
            The toolkit
          </p>
          <h2 className="mt-3 text-display-lg tracking-[-0.025em] text-text-1">
            Every surface a recruiter sees, covered.
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:auto-rows-[minmax(220px,_auto)]">
          <BentoCard className="md:col-span-2 md:row-span-2">
            <FeatureLabel icon={MessageSquare} label="Co-pilot" />
            <h3 className="text-xl font-semibold tracking-tight text-text-1">
              Ask anything about your pipeline.
            </h3>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-text-2">
              Grounded chat over your real applications, threads, and résumé. Cited answers
              stream in seconds. No hallucinated companies. No made-up dates.
            </p>
            <CopilotPreview />
          </BentoCard>

          <BentoCard>
            <FeatureLabel icon={Chrome} label="Extension" />
            <h3 className="text-base font-semibold leading-snug text-text-1">
              One-click capture, anywhere you apply.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-2">
              Reads structured listings on LinkedIn, Greenhouse, Lever, and Workday. Falls
              back to GPT for anything unstructured.
            </p>
            <div className="mt-auto pt-4">
              <div className="flex flex-wrap gap-1.5">
                {["LinkedIn", "Greenhouse", "Lever", "Workday"].map((label) => (
                  <span
                    key={label}
                    className="inline-flex h-6 items-center rounded-full border border-border-1 bg-surface-1 px-2 text-[0.6875rem] font-medium text-text-2"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </BentoCard>

          <BentoCard>
            <FeatureLabel icon={Calendar} label="Calendar" />
            <h3 className="text-base font-semibold leading-snug text-text-1">
              Interviews and loops in one view.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-2">
              Linked to applications and inboxes. Never lose track of who you&apos;re talking
              to or when.
            </p>
          </BentoCard>

          <BentoCard>
            <FeatureLabel icon={Mail} label="Gmail sync" />
            <h3 className="text-base font-semibold leading-snug text-text-1">
              Threads attach to apps automatically.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-2">
              Read-only ingestion classifies replies, rejections, and offer letters. Surfaces
              ghosts before you do.
            </p>
          </BentoCard>

          <BentoCard>
            <FeatureLabel icon={Target} label="Fit scoring" />
            <h3 className="text-base font-semibold leading-snug text-text-1">
              Know which apps are worth your time.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-2">
              Per-application fit scores against your résumé and target stack. Spend the
              hour on the right job.
            </p>
          </BentoCard>

          <BentoCard>
            <FeatureLabel icon={ShieldCheck} label="Privacy first" />
            <h3 className="text-base font-semibold leading-snug text-text-1">
              No auto-send. Suggest-only by policy.
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-text-2">
              Drafts never leave your clipboard until you say so. Your résumé is never
              modified. Your data is yours.
            </p>
          </BentoCard>
        </div>
      </div>
    </section>
  );
}
