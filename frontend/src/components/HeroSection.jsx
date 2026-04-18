/** Hero section for the landing page: headline, CTA buttons, and mockup graphic. */

import { Link } from "react-router-dom";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import CheckIcon from "lucide-react/dist/esm/icons/check";
import PuzzleIcon from "lucide-react/dist/esm/icons/puzzle";

const CHROME_EXTENSION_URL = "https://chrome.google.com/webstore/detail/pipelined";

function HeroMockup() {
  return (
    <div className="relative hidden lg:flex lg:flex-1 lg:items-center lg:justify-center">
      <div className="absolute inset-0 -z-10 flex items-center justify-center">
        <div className="h-72 w-72 rounded-full bg-brand-500/10 blur-3xl" aria-hidden="true" />
      </div>
      <div
        aria-hidden="true"
        style={{ transform: "perspective(1200px) rotateY(-8deg) rotateX(2deg)" }}
        className="w-full max-w-sm overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-800"
      >
        <div className="flex h-7 items-center gap-1.5 border-b border-slate-100 bg-slate-50 px-3 dark:border-slate-700 dark:bg-slate-900">
          {["bg-rose-400", "bg-amber-400", "bg-emerald-400"].map((c) => (
            <div key={c} className={`h-2.5 w-2.5 rounded-full ${c}`} />
          ))}
        </div>
        <div className="flex gap-2.5 border-b border-slate-100 p-3 dark:border-slate-700">
          {[["bg-brand-50 text-brand-700", "Applied", "w-16"], ["bg-violet-50 text-violet-700", "Screening", "w-20"], ["bg-emerald-50 text-emerald-700", "Offer", "w-14"]].map(([cls, label, w]) => (
            <span key={label} className={`rounded-badge px-2 py-0.5 text-[10px] font-medium ${cls} ${w}`}>{label}</span>
          ))}
        </div>
        <div className="space-y-2 p-3">
          {[["Google", "SWE Intern", "Applied"], ["Stripe", "Platform Eng", "Phone Screen"], ["Figma", "SWE L4", "Offer"]].map(([co, role, stage]) => (
            <div key={co} className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2 dark:border-slate-700 dark:bg-slate-800/50">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-slate-200 text-[10px] font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">{co[0]}</div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-slate-800 dark:text-slate-200">{co}</div>
                <div className="text-[10px] text-slate-500">{role}</div>
              </div>
              <span className="rounded-full bg-brand-50 px-2 py-0.5 text-[9px] font-medium text-brand-700">{stage}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HeroSection() {
  return (
    <section className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-6 py-20 md:px-10 md:py-28 lg:flex-row lg:gap-16">
      <div className="flex max-w-xl flex-col gap-6">
        <h1 className="text-5xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
          Track your job search{" "}
          <span className="bg-gradient-to-r from-brand-600 to-violet-500 bg-clip-text text-transparent">
            like a pro
          </span>
        </h1>
        <p className="text-lg leading-relaxed text-slate-600 dark:text-slate-400">
          Pipelined keeps your job search organized from the first click to the final offer.
          One-click capture, AI resume scoring, and a calendar for every interview round.
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/register"
            className="inline-flex items-center gap-2 rounded-button bg-gradient-to-r from-brand-600 to-brand-500 px-8 py-3.5 text-base font-semibold text-white shadow-sm hover:from-brand-700 hover:to-brand-600 active:scale-[0.98] transition-all duration-150"
          >
            Get Started Free <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
          <a
            href={CHROME_EXTENSION_URL}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-button border border-slate-300 bg-white px-8 py-3.5 text-base font-semibold text-slate-700 hover:bg-slate-50 active:scale-[0.98] transition-all duration-150 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Add to Chrome"
          >
            <PuzzleIcon className="h-5 w-5" aria-hidden="true" />
            Install Extension
          </a>
        </div>
        <div className="flex items-center gap-4 text-sm text-slate-500">
          {["Free forever", "No credit card", "Works on 10+ boards"].map((t) => (
            <span key={t} className="flex items-center gap-1">
              <CheckIcon className="h-3.5 w-3.5 text-emerald-500" aria-hidden="true" /> {t}
            </span>
          ))}
        </div>
      </div>
      <HeroMockup />
    </section>
  );
}
