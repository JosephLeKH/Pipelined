/** Hero section for the marketing landing. AI-native positioning with mock extension capture. */

import { Link } from "react-router-dom";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Check from "lucide-react/dist/esm/icons/check";
import GitBranch from "lucide-react/dist/esm/icons/git-branch";
import MapPin from "lucide-react/dist/esm/icons/map-pin";
import Lock from "lucide-react/dist/esm/icons/lock";
import X from "lucide-react/dist/esm/icons/x";

const CAPTURED_FIELDS = [
  ["Company", "Anthropic"],
  ["Role", "Software Engineer Intern"],
  ["Location", "San Francisco · Hybrid"],
];

function ExtensionSaveBanner() {
  return (
    <div className="absolute right-4 top-4 w-[14.75rem] rounded-xl border border-border-2 bg-surface-0 p-3 shadow-[0_14px_38px_-12px_rgba(140,21,21,0.28),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <GitBranch className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
          <span className="text-[0.6875rem] font-semibold text-text-1">Pipelined</span>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-50 px-1.5 py-0.5 text-[0.5625rem] font-medium text-brand-700">
            <Sparkles className="h-2.5 w-2.5" aria-hidden="true" />
            Detected
          </span>
        </div>
        <X className="h-3.5 w-3.5 text-text-4" aria-hidden="true" />
      </div>
      <dl className="space-y-2">
        {CAPTURED_FIELDS.map(([label, value]) => (
          <div key={label}>
            <dt className="text-[0.5625rem] font-medium uppercase tracking-[0.08em] text-text-3">{label}</dt>
            <dd className="truncate text-sm font-medium text-text-1">{value}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        className="mt-3 flex h-8 w-full items-center justify-center gap-1 rounded-md bg-brand-700 text-xs font-medium text-white shadow-sm"
      >
        Save to Pipelined
        <ArrowRight className="h-3 w-3" aria-hidden="true" />
      </button>
    </div>
  );
}

function HeroExtensionMock() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-x-8 -inset-y-6 -z-10 rounded-[2.25rem] bg-gradient-to-br from-brand-100/40 via-transparent to-brand-50/0 blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-border-2 bg-surface-0 shadow-[0_24px_70px_-30px_rgba(140,21,21,0.18),0_2px_6px_-1px_rgba(0,0,0,0.04)]">
        <div className="flex items-center gap-1.5 border-b border-border-1 bg-surface-1 px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-border-3" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-border-3" aria-hidden="true" />
          <span className="h-2.5 w-2.5 rounded-full bg-border-3" aria-hidden="true" />
          <div className="ml-3 flex min-w-0 flex-1 items-center gap-1.5 rounded-md border border-border-1 bg-surface-0 px-2.5 py-1 text-[0.6875rem] font-medium text-text-3">
            <Lock className="h-3 w-3 shrink-0 text-text-4" aria-hidden="true" />
            <span className="truncate">boards.greenhouse.io/anthropic/swe-intern</span>
          </div>
        </div>
        <div className="relative px-6 pb-6 pt-5">
          <div className="flex items-center gap-3">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-md bg-text-1 text-sm font-semibold text-white"
              aria-hidden="true"
            >
              A
            </span>
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-medium text-text-3">Anthropic</p>
              <h4 className="truncate text-base font-semibold text-text-1">
                Software Engineer Intern, Summer 2026
              </h4>
            </div>
          </div>
          <p className="mt-2 inline-flex items-center gap-1.5 text-[0.6875rem] text-text-3">
            <MapPin className="h-3 w-3" aria-hidden="true" />
            San Francisco, CA · Hybrid · Internship
          </p>
          <div className="mt-5 space-y-2">
            <div className="h-2 w-full rounded bg-surface-2" />
            <div className="h-2 w-11/12 rounded bg-surface-2" />
            <div className="h-2 w-2/3 rounded bg-surface-2" />
          </div>
          <div className="mt-5 space-y-2">
            <div className="h-2.5 w-24 rounded bg-surface-2" />
            <div className="h-2 w-full rounded bg-surface-2" />
            <div className="h-2 w-3/4 rounded bg-surface-2" />
          </div>
          <div className="mt-5 space-y-2.5">
            <div className="h-2.5 w-28 rounded bg-surface-2" />
            {["w-3/4", "w-4/5", "w-2/3"].map((width) => (
              <div key={width} className="flex items-center gap-2">
                <div className="h-1 w-1 shrink-0 rounded-full bg-text-4" />
                <div className={`h-2 rounded bg-surface-2 ${width}`} />
              </div>
            ))}
          </div>
          <ExtensionSaveBanner />
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
          <HeroExtensionMock />
        </div>
      </div>
    </section>
  );
}
