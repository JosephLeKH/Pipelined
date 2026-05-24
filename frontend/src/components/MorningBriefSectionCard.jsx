/** Card listing action items for one morning brief section. */

import { Link } from "react-router-dom";

import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";

function MorningBriefItem({ title, body, actionUrl }) {
  return (
    <li className="border-t border-border first:border-t-0">
      <Link
        to={actionUrl}
        className="flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-foreground">{title}</p>
          {body && (
            <p className="mt-0.5 text-xs text-muted-foreground">{body}</p>
          )}
        </div>
        <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </Link>
    </li>
  );
}

function MorningBriefSectionCard({ label, items }) {
  if (!items?.length) return null;

  return (
    <section
      aria-label={label}
      className="overflow-hidden rounded-card border border-border bg-card shadow-card"
    >
      <h2 className="border-b border-border px-4 py-3 font-display text-sm font-semibold text-foreground">
        {label}
      </h2>
      <ul>
        {items.map((item, index) => (
          <MorningBriefItem
            key={`${item.action_url}-${index}`}
            title={item.title}
            body={item.body}
            actionUrl={item.action_url}
          />
        ))}
      </ul>
    </section>
  );
}

export default MorningBriefSectionCard;
