/** Hero section for the landing page: editorial headline and single CTA. */

import { Link } from "react-router-dom";

import { Button } from "./ui/button";

export default function HeroSection() {
  return (
    <section className="bg-muted py-24">
      <div className="mx-auto max-w-3xl px-6 text-center">
        <h1 className="mb-6 text-4xl font-display font-semibold tracking-tight text-foreground md:text-5xl">
          Track your job search,{" "}
          <span className="text-primary">end to end.</span>
        </h1>
        <p className="mx-auto mb-10 max-w-2xl font-sans text-lg leading-relaxed text-muted-foreground">
          Pipelined keeps every application, interview, and follow-up organized.
          One-click Chrome extension, AI fit scoring, and a built-in calendar.
        </p>
        <Button asChild className="inline-flex items-center">
          <Link to="/register">Get Started Free</Link>
        </Button>
        <p className="mt-4 font-sans text-sm text-muted-foreground">
          Free forever. No credit card required.
        </p>
      </div>
    </section>
  );
}
