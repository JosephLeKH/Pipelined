/** Hero section for the marketing landing — light background, single product screenshot. */

import { useState } from "react";
import { Link } from "react-router-dom";

import ArrowUpRight from "lucide-react/dist/esm/icons/arrow-up-right";

import MarketingScreenshot from "./marketing/MarketingScreenshot";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";

export default function HeroSection() {
  const [demoOpen, setDemoOpen] = useState(false);

  return (
    <section className="marketing-section flex min-h-[560px] flex-col justify-center bg-surface-0 pt-24 lg:min-h-[720px]">
      <div className="mx-auto w-full max-w-6xl px-6">
        <div
          className="mb-4 inline-flex h-6 items-center gap-1.5 rounded-full border border-border-1 bg-surface-1 px-3 text-xs font-medium text-text-2"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand-700" aria-hidden="true" />
          Built for Stanford CS students
        </div>

        <h1 className="max-w-[880px] text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.030em] text-text-1 md:text-display-xl">
          The pipeline for
          <br />
          your job search.
        </h1>

        <p className="mt-6 max-w-[560px] text-lg leading-[1.55] text-text-2">
          Capture every application from one-click save to signed offer. Designed for the AI era
          of recruiting.
        </p>

        <div className="mt-10 flex flex-wrap items-center gap-3">
          <Link
            to="/register"
            className="marketing-focus inline-flex h-9 items-center rounded-md bg-brand-700 px-4 text-sm font-medium text-white transition-colors duration-120 hover:bg-brand-800"
          >
            Sign up — free
          </Link>
          <button
            type="button"
            className="marketing-focus inline-flex items-center gap-1 text-sm font-medium text-text-2 transition-colors duration-120 hover:text-text-1"
            onClick={() => setDemoOpen(true)}
          >
            Watch the demo
            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-20">
          <MarketingScreenshot
            src="/screenshots/hero-today.png"
            alt="Today page showing ranked missions"
            width={1280}
            height={720}
            label="Today page — screenshot coming with PRD-04"
            eager
          />
        </div>
      </div>

      <Dialog open={demoOpen} onOpenChange={setDemoOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demo coming soon</DialogTitle>
            <DialogDescription>
              We&apos;re recording a walkthrough of Pipelined. Check back soon.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </section>
  );
}
