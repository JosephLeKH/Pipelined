/** Card listing action items for one morning brief section with accent border. */

import { Link } from "react-router-dom";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";

import FitBadge from "./FitBadge";
import { BRIEF_SECTION_ACCENTS, parseBriefItemScore } from "../lib/briefConstants";
import { CARD_BASE } from "../lib/designTokens";

function MorningBriefItem({ title, body, actionUrl, fitScore }) {
  return (
    <li className="border-t border-border-default first:border-t-0">
      <Link
        to={actionUrl}
        className="flex items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-surface-secondary/60"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground">{title}</p>
            {fitScore != null && <FitBadge score={fitScore} />}
          </div>
          {body && (
            <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
          )}
        </div>
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}

function MorningBriefSectionCard({ sectionKey, label, items }) {
  if (!items?.length) return null;

  const accentClass = BRIEF_SECTION_ACCENTS[sectionKey] ?? "border-l-brand-500";
  const showFitBadge = sectionKey === "pending_approvals" || sectionKey === "high_matches";

  return (
    <section
      aria-label={label}
      className={`${CARD_BASE} border-l-4 ${accentClass} overflow-hidden`}
    >
      <h2 className="border-b border-border-default px-4 py-3.5 font-display text-sm font-semibold text-foreground">
        {label}
      </h2>
      <ul>
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
