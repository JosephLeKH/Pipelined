/** Pricing page: Free vs Pro comparison table. */

import { useEffect } from "react";
import { Link } from "react-router-dom";

import Check from "lucide-react/dist/esm/icons/check";
import X from "lucide-react/dist/esm/icons/x";
import Zap from "lucide-react/dist/esm/icons/zap";
import { Button } from "../components/ui/button";

const FREE_FEATURES = [
  { label: "Up to 100 applications", included: true },
  { label: "Up to 50 contacts", included: true },
  { label: "Up to 5 saved searches", included: true },
  { label: "Chrome extension", included: true },
  { label: "Interview calendar", included: true },
  { label: "10 AI fit scores / day", included: true },
  { label: "CSV export", included: true },
  { label: "CSV import (100 rows)", included: true },
  { label: "Public pipeline sharing", included: true },
  { label: "Unlimited applications", included: false },
  { label: "Unlimited contacts", included: false },
  { label: "Priority support", included: false },
];

const PRO_FEATURES = [
  { label: "Unlimited applications", included: true },
  { label: "Unlimited contacts", included: true },
  { label: "25 saved searches", included: true },
  { label: "Chrome extension", included: true },
  { label: "Interview calendar", included: true },
  { label: "100 AI fit scores / day", included: true },
  { label: "CSV export", included: true },
  { label: "CSV import (1 000 rows)", included: true },
  { label: "Public pipeline sharing", included: true },
  { label: "Priority support", included: true },
];

function FeatureRow({ label, included }) {
  return (
    <li className="flex items-center gap-3 py-2">
      {included ? (
        <Check aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-primary" />
      ) : (
        <X aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-muted-foreground/40" />
      )}
      <span className={included ? "text-sm text-foreground" : "text-sm text-muted-foreground"}>
        {included ? label : <><span className="sr-only">Not included: </span>{label}</>}
      </span>
    </li>
  );
}

function PricingHeader() {
  return (
    <header className="border-b border-border bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-lg font-bold text-primary">
          Pipelined
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/login" className="text-muted-foreground hover:text-foreground">
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link to="/register">Get started free</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

function FreeTierCard() {
  return (
    <div className="rounded-2xl border border-border bg-card p-8">
      <div className="mb-6">
        <h2 className="mb-1 font-display text-xl font-bold text-foreground">Free</h2>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-extrabold text-foreground">$0</span>
          <span className="mb-1 text-muted-foreground">/ month</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Everything you need to get started.
        </p>
      </div>

      <Button asChild variant="outline" className="mb-8 w-full">
        <Link to="/register">Get started free</Link>
      </Button>

      <ul className="divide-y divide-border">
        {FREE_FEATURES.map((f) => (
          <FeatureRow key={f.label} {...f} />
        ))}
      </ul>
    </div>
  );
}

function ProTierCard() {
  return (
    <div className="relative rounded-2xl border-2 border-primary bg-card p-8">
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
        <span className="flex items-center gap-1.5 rounded-full bg-primary px-4 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
          <Zap aria-hidden="true" className="h-3 w-3" />
          Most popular
        </span>
      </div>

      <div className="mb-6">
        <h2 className="mb-1 font-display text-xl font-bold text-foreground">Pro</h2>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-extrabold text-foreground">$9</span>
          <span className="mb-1 text-muted-foreground">/ month</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          For serious job seekers who want it all.
        </p>
      </div>

      <Button asChild className="mb-8 w-full">
        <a href="mailto:support@pipelined.app?subject=Pro%20waitlist%20request">Join the waitlist</a>
      </Button>

      <ul className="divide-y divide-border">
        {PRO_FEATURES.map((f) => (
          <FeatureRow key={f.label} {...f} />
        ))}
      </ul>
    </div>
  );
}

function Pricing() {
  useEffect(() => {
    document.title = "Pricing — Pipelined";
    return () => {
      document.title = "Pipelined — Job Application Tracker for Students & Engineers";
    };
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <PricingHeader />

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="mb-3 font-display text-4xl font-extrabold text-foreground">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-muted-foreground">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <FreeTierCard />
          <ProTierCard />
        </div>

        <section className="mt-12 mx-auto max-w-2xl">
          <h2 className="mb-6 text-center font-display text-xl font-semibold text-foreground">
            Frequently Asked Questions
          </h2>
          <div className="flex flex-col gap-3">
            <details className="rounded-xl border border-border bg-card px-5 py-4 open:pb-4">
              <summary className="cursor-pointer font-medium text-foreground">
                When does Pro launch?
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">
                We&apos;re actively developing Pro features. Join the waitlist to get notified and
                receive early-bird pricing when we launch.
              </p>
            </details>
            <details className="rounded-xl border border-border bg-card px-5 py-4 open:pb-4">
              <summary className="cursor-pointer font-medium text-foreground">
                Can I switch plans?
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">
                Yes. You can upgrade or downgrade at any time. Changes take effect immediately.
              </p>
            </details>
            <details className="rounded-xl border border-border bg-card px-5 py-4 open:pb-4">
              <summary className="cursor-pointer font-medium text-foreground">
                Is there a student discount?
              </summary>
              <p className="mt-3 text-sm text-muted-foreground">
                We offer a free tier that covers everything most students need. Pro discounts for
                verified students are planned — join the waitlist to stay updated.
              </p>
            </details>
          </div>
        </section>

        <p className="mt-12 text-center text-sm text-muted-foreground">
          Questions?{" "}
          <a href="mailto:support@pipelined.app" className="text-primary hover:underline">
            Contact us
          </a>
        </p>
      </main>
    </div>
  );
}

export default Pricing;
