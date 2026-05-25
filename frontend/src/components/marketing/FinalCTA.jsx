/** Final CTA — full-bleed Cardinal Red gradient with white CTA cluster. */

import { useState } from "react";
import { Link } from "react-router-dom";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";

import { useAuth } from "../../context/AuthContext";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { useMarketingReveal } from "./useMarketingReveal";

export default function FinalCTA() {
  const { user } = useAuth();
  const revealRef = useMarketingReveal();
  const [extensionOpen, setExtensionOpen] = useState(false);

  return (
    <section className="border-t border-border-1 bg-surface-0 py-16 md:py-24">
      <div ref={revealRef} className="marketing-reveal mx-auto max-w-6xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-700 via-brand-700 to-brand-900 px-6 py-16 text-center md:px-10 md:py-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(255,255,255,0.15),transparent_70%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:radial-gradient(ellipse_80%_60%_at_50%_50%,black_30%,transparent_75%)]"
          />

          <div className="relative">
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-white/70">
              Start today
            </p>
            <h2 className="mt-4 text-display-lg tracking-[-0.025em] text-white md:text-[2.75rem]">
              Built for students.
              <br />
              Available today.
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base leading-[1.6] text-white/80">
              Free for students. No credit card. Sign up in 30 seconds and capture your next
              application with one click.
            </p>

            <div className="mt-9 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
              <Link
                to="/register"
                className="marketing-focus inline-flex h-11 items-center justify-center gap-1.5 rounded-md bg-white px-6 text-sm font-semibold text-brand-700 shadow-sm transition-colors duration-120 hover:bg-white/95"
              >
                Sign up free
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
              {user && (
                <Link
                  to="/today"
                  className="marketing-focus inline-flex h-11 items-center justify-center rounded-md border border-white/20 bg-transparent px-5 text-sm font-medium text-white transition-colors duration-120 hover:bg-white/10"
                >
                  Open app
                </Link>
              )}
              <button
                type="button"
                className="marketing-focus inline-flex h-11 items-center justify-center rounded-md border border-white/20 bg-transparent px-5 text-sm font-medium text-white transition-colors duration-120 hover:bg-white/10"
                onClick={() => setExtensionOpen(true)}
              >
                Install extension
              </button>
            </div>

            <p className="mt-8 text-xs font-medium text-white/60">
              Built at Stanford · No auto-send · Suggest-only AI
            </p>
          </div>
        </div>
      </div>

      <Dialog open={extensionOpen} onOpenChange={setExtensionOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Coming to the Chrome Web Store</DialogTitle>
            <DialogDescription>
              The Pipelined extension will be published soon. Load unpacked from the repo for now.
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </section>
  );
}
