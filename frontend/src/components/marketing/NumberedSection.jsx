/** Reusable numbered landing section (1.0–5.0) with alternating screenshot layout. */

import { Link } from "react-router-dom";

import Check from "lucide-react/dist/esm/icons/check";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";

import MarketingScreenshot from "./MarketingScreenshot";
import { useMarketingReveal } from "./useMarketingReveal";

export default function NumberedSection({
  id,
  number,
  eyebrow,
  headline,
  subhead,
  bullets = [],
  ctaLabel,
  ctaHref,
  screenshot,
  imageSide = "right",
  customScreenshot,
}) {
  const revealRef = useMarketingReveal();
  const textOrder = imageSide === "right" ? "order-1" : "order-1 md:order-2";
  const imageOrder = imageSide === "right" ? "order-2" : "order-2 md:order-1";

  const textBlock = (
    <div className={`flex flex-col gap-4 ${textOrder}`}>
      <p className="text-xs font-medium uppercase tracking-[0.08em] text-brand-700">
        {number}. {eyebrow}
      </p>
      <h2 className="text-display-lg text-text-1 md:text-[2.5rem]">{headline}</h2>
      <p className="max-w-[40rem] text-lg leading-[1.55] text-text-2">{subhead}</p>
      {bullets.length > 0 && (
        <ul className="flex flex-col gap-2">
          {bullets.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-text-2">
              <Check className="mt-0.5 h-3 w-3 shrink-0 text-brand-700" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      )}
      {ctaLabel && ctaHref && (
        <Link
          to={ctaHref}
          className="group marketing-focus inline-flex w-fit items-center gap-1 text-sm font-medium text-brand-700"
        >
          {ctaLabel}
          <ArrowRight className="cta-arrow-hover h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );

  const imageBlock = (
    <div className={imageOrder}>
      {customScreenshot ?? (
        <MarketingScreenshot
          src={screenshot?.src}
          alt={screenshot?.alt ?? headline}
          width={screenshot?.width ?? 800}
          height={screenshot?.height ?? 600}
          label={screenshot?.label}
        />
      )}
    </div>
  );

  return (
    <section id={id} className="marketing-section border-t border-border-1 bg-surface-0">
      <div
        ref={revealRef}
        className="marketing-reveal mx-auto grid max-w-6xl grid-cols-1 items-center gap-10 px-6 md:grid-cols-2 md:gap-16"
      >
        {textBlock}
        {imageBlock}
      </div>
    </section>
  );
}
