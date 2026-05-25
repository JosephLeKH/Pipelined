/** Final CTA cluster — three buttons on bg-surface-1. */

import { useState } from "react";
import { Link } from "react-router-dom";

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
    <section className="border-t border-border-1 bg-surface-1 py-16 md:min-h-[320px] md:py-20">
      <div ref={revealRef} className="marketing-reveal mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-display-lg tracking-[-0.025em] text-text-1">
          Built for students.
          <br />
          Available today.
        </h2>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Link
            to="/register"
            className="marketing-focus inline-flex h-9 items-center justify-center rounded-md bg-brand-700 px-4 text-sm font-medium text-white transition-colors duration-120 hover:bg-brand-800"
          >
            Sign up free
          </Link>
          {user && (
            <Link
              to="/today"
              className="marketing-focus inline-flex h-9 items-center justify-center rounded-md border border-border-2 bg-surface-0 px-4 text-sm font-medium text-text-1 transition-colors duration-120 hover:bg-surface-1"
            >
              Open app
            </Link>
          )}
          <button
            type="button"
            className="marketing-focus inline-flex h-9 items-center justify-center rounded-md border border-border-2 bg-surface-0 px-4 text-sm font-medium text-text-1 transition-colors duration-120 hover:bg-surface-1"
            onClick={() => setExtensionOpen(true)}
          >
            Install extension
          </button>
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
