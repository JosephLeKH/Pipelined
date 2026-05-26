/** Reusable pricing tier card — Linear-inspired, Cardinal accent on Pro. */

import { Link } from "react-router-dom";

import Check from "lucide-react/dist/esm/icons/check";

const CTA_BASE =
  "marketing-focus inline-flex h-9 w-full items-center justify-center rounded-md text-sm font-medium transition-colors duration-120";

function PricingCard({
  name,
  price,
  description,
  features,
  ctaLabel,
  ctaTo,
  highlighted = false,
}) {
  const cardClass = highlighted
    ? "relative rounded-xl border-2 border-brand-700 bg-surface-0 p-8"
    : "rounded-xl border border-border-1 bg-surface-0 p-8";

  const ctaClass = highlighted
    ? `${CTA_BASE} bg-brand-700 text-white hover:bg-brand-800`
    : `${CTA_BASE} border border-border-2 bg-surface-0 text-text-1 hover:bg-surface-1`;

  return (
    <article className={cardClass}>
      {highlighted && (
        <span className="absolute right-4 top-4 inline-flex h-6 items-center rounded-md bg-brand-700 px-2 text-[0.6875rem] font-semibold uppercase tracking-[0.04em] text-white">
          Best for full season
        </span>
      )}

      <header className="mb-6">
        <h2 className="text-lg font-semibold text-text-1">{name}</h2>
        <div className="mt-2 flex items-baseline gap-1">
          <span className="text-display-md text-text-1">{price}</span>
          <span className="text-sm font-medium text-text-3">/mo</span>
        </div>
        <p className="mt-2 text-sm text-text-2">{description}</p>
      </header>

      <Link to={ctaTo} className={ctaClass}>
        {ctaLabel}
      </Link>

      <ul className="mt-8 flex flex-col gap-3">
        {features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check
              aria-hidden="true"
              className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-brand-700"
              strokeWidth={2.5}
            />
            <span className="text-sm text-text-1">{feature}</span>
          </li>
        ))}
      </ul>
    </article>
  );
}

export default PricingCard;
