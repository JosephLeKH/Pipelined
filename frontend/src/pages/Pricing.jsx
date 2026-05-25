/** Pricing page — Free vs Pro cards with marketing chrome and FAQ. */

import { useEffect } from "react";

import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";

import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import PricingCard from "../components/marketing/PricingCard";

const FREE_FEATURES = [
  "50 applications",
  "Kanban + list views",
  "Chrome extension",
  "Today + Morning Brief",
  "10 Co-pilot msgs/day",
];

const PRO_FEATURES = [
  "Unlimited applications",
  "Unlimited Co-pilot",
  "Apply Pack + Mock Interview",
  "Autopilot + Watchlist",
  "Resume Insights",
  "Priority support",
];

const FAQ_ITEMS = [
  {
    question: "Can I cancel anytime?",
    answer:
      "Yes. Pro is month-to-month — cancel from Settings and you keep access through the end of your billing period.",
  },
  {
    question: "Do you store my resume?",
    answer:
      "Your résumé file stays in your account for parsing and Apply Pack. We never modify the stored PDF — suggestions are copy-only.",
  },
  {
    question: "How is my data used?",
    answer:
      "Pipeline data powers your dashboard and agent features. We do not sell your data. LLM calls use OpenRouter with your application context only when you request a feature.",
  },
  {
    question: "What boards work with the extension?",
    answer:
      "LinkedIn, Greenhouse, Lever, Workday, and six more boards — the extension parses structured fields and falls back to AI on unstructured pages.",
  },
  {
    question: "Is the Stanford branding affiliated?",
    answer:
      "No — Pipelined is built by a Stanford CS student but is not affiliated with or endorsed by Stanford University. Cardinal Red is used as a personal brand homage.",
  },
];

function PricingFaq() {
  return (
    <section className="mx-auto mt-16 max-w-2xl border-t border-border-1 pt-12" aria-labelledby="pricing-faq">
      <h2 id="pricing-faq" className="mb-6 text-center text-sm font-medium uppercase tracking-[0.08em] text-text-3">
        FAQ
      </h2>
      <div className="divide-y divide-border-1 border-y border-border-1">
        {FAQ_ITEMS.map(({ question, answer }) => (
          <details key={question} className="group">
            <summary className="marketing-focus flex cursor-pointer list-none items-center justify-between gap-4 py-4 text-sm font-medium text-text-1 [&::-webkit-details-marker]:hidden">
              <span>{question}</span>
              <ChevronDown
                aria-hidden="true"
                className="h-3 w-3 flex-shrink-0 text-text-3 transition-transform duration-120 group-open:rotate-180 motion-reduce:transition-none"
              />
            </summary>
            <p className="pb-4 text-sm leading-relaxed text-text-2">{answer}</p>
          </details>
        ))}
      </div>
    </section>
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
    <div className="flex min-h-screen flex-col bg-surface-0 font-sans">
      <MarketingNav />

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 md:py-20">
        <header className="mb-12 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.08em] text-text-3">Pricing</p>
          <h1 className="mt-3 text-display-lg tracking-[-0.025em] text-text-1">
            Built for students.
            <br />
            Priced for students.
          </h1>
        </header>

        <div className="grid gap-8 md:grid-cols-2 md:gap-6">
          <PricingCard
            name="Free"
            price="$0"
            description="Everything you need to track an active search"
            features={FREE_FEATURES}
            ctaLabel="Get started"
            ctaTo="/register"
          />
          <PricingCard
            name="Pro"
            price="$5"
            description="For an active job-search season"
            features={PRO_FEATURES}
            ctaLabel="Upgrade"
            ctaTo="/register"
            highlighted
          />
        </div>

        <PricingFaq />
      </main>

      <MarketingFooter />
    </div>
  );
}

export default Pricing;
