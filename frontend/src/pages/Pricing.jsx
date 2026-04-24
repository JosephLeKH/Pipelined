/** Pricing page: Free vs Pro comparison table. */

import { useEffect } from "react";
import { Link } from "react-router-dom";

import Check from "lucide-react/dist/esm/icons/check";
import X from "lucide-react/dist/esm/icons/x";
import Zap from "lucide-react/dist/esm/icons/zap";

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
        <Check className="h-4 w-4 flex-shrink-0 text-brand-500" />
      ) : (
        <X className="h-4 w-4 flex-shrink-0 text-gray-300 dark:text-gray-600" />
      )}
      <span
        className={
          included
            ? "text-sm text-gray-700 dark:text-gray-300"
            : "text-sm text-gray-400 dark:text-gray-500"
        }
      >
        {label}
      </span>
    </li>
  );
}

function PricingHeader() {
  return (
    <header className="border-b border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Link to="/" className="text-lg font-bold text-brand-600 dark:text-brand-400">
          Pipelined
        </Link>
        <nav className="flex items-center gap-4 text-sm">
          <Link to="/login" className="text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white">
            Sign in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-brand-600 px-4 py-2 font-medium text-white hover:bg-brand-700"
          >
            Get started free
          </Link>
        </nav>
      </div>
    </header>
  );
}

function FreeTierCard() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-8 dark:border-gray-700 dark:bg-gray-900">
      <div className="mb-6">
        <h2 className="mb-1 font-display text-xl font-bold text-gray-900 dark:text-white">Free</h2>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$0</span>
          <span className="mb-1 text-gray-500 dark:text-gray-400">/ month</span>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          Everything you need to get started.
        </p>
      </div>

      <Link
        to="/register"
        className="mb-8 block w-full rounded-xl border border-brand-500 px-6 py-3 text-center text-sm font-semibold text-brand-600 hover:bg-brand-50 dark:border-brand-400 dark:text-brand-400 dark:hover:bg-brand-950"
      >
        Get started free
      </Link>

      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
        {FREE_FEATURES.map((f) => (
          <FeatureRow key={f.label} {...f} />
        ))}
      </ul>
    </div>
  );
}

function ProTierCard() {
  return (
    <div className="relative rounded-2xl border-2 border-brand-500 bg-white p-8 dark:bg-gray-900">
      <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
        <span className="flex items-center gap-1.5 rounded-full bg-brand-500 px-4 py-1 text-xs font-bold uppercase tracking-wide text-white">
          <Zap className="h-3 w-3" />
          Most popular
        </span>
      </div>

      <div className="mb-6">
        <h2 className="mb-1 font-display text-xl font-bold text-gray-900 dark:text-white">Pro</h2>
        <div className="flex items-end gap-1">
          <span className="text-4xl font-extrabold text-gray-900 dark:text-white">$9</span>
          <span className="mb-1 text-gray-500 dark:text-gray-400">/ month</span>
        </div>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          For serious job seekers who want it all.
        </p>
      </div>

      <button
        type="button"
        className="mb-8 w-full rounded-xl bg-brand-500 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
      >
        Upgrade to Pro — coming soon
      </button>

      <ul className="divide-y divide-gray-100 dark:divide-gray-800">
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <PricingHeader />

      <main className="mx-auto max-w-5xl px-6 py-16">
        <div className="mb-12 text-center">
          <h1 className="mb-3 font-display text-4xl font-extrabold text-gray-900 dark:text-white">
            Simple, transparent pricing
          </h1>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Start free. Upgrade when you need more.
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          <FreeTierCard />
          <ProTierCard />
        </div>

        <p className="mt-12 text-center text-sm text-gray-400 dark:text-gray-500">
          Questions?{" "}
          <a href="mailto:support@pipelined.app" className="text-brand-600 hover:underline dark:text-brand-400">
            Contact us
          </a>
        </p>
      </main>
    </div>
  );
}

export default Pricing;
