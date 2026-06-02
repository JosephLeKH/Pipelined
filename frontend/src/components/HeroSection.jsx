/** Hero section for the marketing landing. AI-native positioning with mock product card. */

import { Link } from "react-router-dom";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Check from "lucide-react/dist/esm/icons/check";
import Clock from "lucide-react/dist/esm/icons/clock";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";

const MOCK_MISSIONS = [
  {
    icon: Briefcase,
    title: "Follow up with Stripe recruiter",
    meta: "Sent a week ago · No reply",
    accent: true,
  },
  {
    icon: Clock,
    title: "Confirm Linear loop, Thursday at 2 PM",
    meta: "Interview · 2 days",
    accent: false,
  },
  {
    icon: Check,
    title: "Apply: Anthropic, SWE Intern",
    meta: "Apply Pack draft ready",
    accent: false,
  },
];

function HeroProductCard() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-x-8 -inset-y-6 -z-10 rounded-[2.25rem] bg-gradient-to-br from-brand-100/40 via-transparent to-brand-50/0 blur-2xl"
      />
      <div className="rounded-2xl border border-border-2 bg-surface-0 shadow-[0_24px_70px_-30px_rgba(140,21,21,0.18),0_2px_6px_-1px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-1.5 border-b border-border-1 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-border-3" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-border-3" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-border-3" aria-hidden="true" />
          <span className="ml-3 text-[0.6875rem] font-medium text-text-3">
            pipelined.app / today
          </span>
        </div>

        <div className="px-6 pb-6 pt-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <p className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-text-3">
                Today
              </p>
              <h3 className="mt-1 text-lg font-semibold text-text-1">
                Your missions, ranked
              </h3>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-[0.6875rem] font-medium text-brand-700">
              <Sparkles className="h-3 w-3" aria-hidden="true" />
              AI ranked
            </span>
          </div>

          <ul className="flex flex-col gap-2">
            {MOCK_MISSIONS.map(({ icon: Icon, title, meta, accent }) => (
              <li
                key={title}
                className={[
                  "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                  accent
                    ? "border-brand-100 bg-brand-50/60"
                    : "border-border-1 bg-surface-0",
                ].join(" ")}
              >
                <span
                  className={[
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md",
                    accent ? "bg-brand-700 text-white" : "bg-surface-2 text-text-2",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-1">{title}</p>
                  <p className="truncate text-xs text-text-3">{meta}</p>
                </div>
                <span aria-hidden="true" className="text-text-4">
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex items-center gap-2 rounded-lg border border-dashed border-border-2 bg-surface-1 px-3 py-2.5">
            <span className="inline-flex h-1.5 w-1.5 animate-pulse-soft rounded-full bg-brand-600" aria-hidden="true" />
            <p className="text-xs text-text-2">
              <span className="font-medium text-text-1">Autopilot</span> is watching your top companies overnight.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="relative isolate overflow-hidden bg-surface-0 pt-20 lg:pt-24">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[40rem] bg-[radial-gradient(80%_50%_at_50%_0%,rgba(140,21,21,0.06),transparent_60%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(to_right,rgba(0,0,0,0.025)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.025)_1px,transparent_1px)] bg-[size:56px_56px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_0%,black_30%,transparent_75%)]"
      />

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 items-center gap-12 px-6 pb-20 lg:grid-cols-[1.05fr_1fr] lg:gap-16 lg:pb-28">
        <div>
          <h1 className="max-w-[40rem] text-[2.5rem] font-semibold leading-[1.04] tracking-[-0.030em] text-text-1 md:text-[3.25rem] lg:text-[3.75rem]">
            Your job hunt,{" "}
            <span className="bg-gradient-to-br from-brand-700 to-brand-500 bg-clip-text text-transparent">
              organized.
            </span>
          </h1>

          <p className="mt-6 max-w-[33.75rem] text-lg leading-[1.55] text-text-2">
            Pipelined tracks every application from save to signed offer. It ranks
            today&apos;s priorities, drafts your Apply Pack, runs mock interviews, and
            shows you what to do next.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/register"
              className="marketing-focus inline-flex h-10 items-center gap-1 rounded-md bg-brand-700 px-5 text-sm font-medium text-white shadow-sm transition-colors duration-120 hover:bg-brand-800"
            >
              Get started
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>

          <ul className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-text-3">
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-brand-600" aria-hidden="true" />
              Capture every job
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-brand-600" aria-hidden="true" />
              Draft every application
            </li>
            <li className="inline-flex items-center gap-1.5">
              <Check className="h-3 w-3 text-brand-600" aria-hidden="true" />
              Review every week
            </li>
          </ul>
        </div>

        <div className="lg:pl-4">
          <HeroProductCard />
        </div>
      </div>
    </section>
  );
}
