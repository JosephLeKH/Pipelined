/** Three-up testimonial grid for the Students section. */

import TestimonialCard from "./TestimonialCard";
import { useMarketingReveal } from "./useMarketingReveal";

const TESTIMONIALS = [
  {
    quote:
      "Pipelined cut my Sunday job-search session from 4 hours to 40 minutes.",
    name: "Maya R.",
    school: "Stanford CS '27",
  },
  {
    quote: "Today is the only thing that kept me sane during fall recruiting.",
    name: "Daniel K.",
    school: "MIT EECS '26",
  },
  {
    quote:
      "Apply Pack saved me 30 min per application. Recruiters keep asking what tool I use.",
    name: "Priya S.",
    school: "Berkeley EECS '26",
  },
];

export default function TestimonialGrid() {
  const revealRef = useMarketingReveal();

  return (
    <section id="testimonials" className="marketing-section border-t border-border-1 bg-surface-0">
      <div ref={revealRef} className="marketing-reveal mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-display-md text-text-1">
          Loved by students at top CS programs
        </h2>
        <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3 md:gap-10">
          {TESTIMONIALS.map((item) => (
            <TestimonialCard key={item.name} {...item} />
          ))}
        </div>
        <p className="mt-10 text-sm font-medium text-text-2">
          Trusted by students from Stanford, MIT, Berkeley, CMU, Waterloo.
        </p>
      </div>
    </section>
  );
}
