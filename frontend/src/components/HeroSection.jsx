/** Hero section for the landing page: editorial headline and single CTA. */

import { Link } from "react-router-dom";

import { BUTTON_PRIMARY } from "../lib/designTokens";

export default function HeroSection() {
  return (
    <section className="bg-surface-secondary py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h1 className="mb-6 text-4xl font-display font-semibold tracking-tight text-gray-900 md:text-5xl">
          Track your job search,{" "}
          <span className="text-brand-500">end to end.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl font-sans text-lg leading-relaxed text-gray-500">
          Pipelined keeps every application, interview, and follow-up organized.
          One-click Chrome extension, AI fit scoring, and a built-in calendar.
        </p>
        <Link to="/register" className={`${BUTTON_PRIMARY} inline-flex items-center`}>
          Get Started Free
        </Link>
        <p className="mt-4 font-sans text-sm text-gray-400">
          Free forever. No credit card required.
        </p>
      </div>
    </section>
  );
}
