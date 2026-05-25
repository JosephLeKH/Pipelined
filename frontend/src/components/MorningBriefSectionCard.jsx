/** Morning brief subsection — heading plus flat two-line rows (no nested cards). */

import { Link } from "react-router-dom";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";

import FitBadge from "./FitBadge";
import { parseBriefItemScore } from "../lib/briefConstants";

function MorningBriefItem({ title, body, actionUrl, fitScore }) {
  return (
    <li className="border-b border-border-1 last:border-b-0">
      <Link
        to={actionUrl}
        className={[
          "flex items-start gap-3 px-3 py-3 text-left",
          "hover:bg-surface-1 focus-visible:outline focus-visible:outline-2",
          "focus-visible:outline-brand-600 focus-visible:outline-offset-[-2px]",
          "dark:focus-visible:outline-1",
          "motion-safe:transition-colors motion-safe:duration-hover",
        ].join(" ")}
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-text-1">{title}</p>
            {fitScore != null && <FitBadge score={fitScore} />}
          </div>
          {body && <p className="mt-0.5 text-xs text-text-3">{body}</p>}
        </div>
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-text-3" aria-hidden="true" />
      </Link>
    </li>
  );
}

function MorningBriefSectionCard({ sectionKey, label, items }) {
  if (!items?.length) return null;

  const showFitBadge = sectionKey === "pending_approvals" || sectionKey === "high_matches";

  return (
    <section aria-label={label} className="space-y-2">
      <h3 className="text-xs font-medium uppercase tracking-wider text-text-3">
        {label}
      </h3>
      <ul className="overflow-hidden rounded-lg border border-border-1 bg-surface-0">
        {items.map((item, index) => (
          <MorningBriefItem
            key={`${label}-${item.title}-${index}`}
            title={item.title}
            body={item.body}
            actionUrl={item.action_url}
            fitScore={showFitBadge ? parseBriefItemScore(item.body) : null}
          />
        ))}
      </ul>
    </section>
  );
}

export default MorningBriefSectionCard;
