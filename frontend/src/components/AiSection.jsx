/** Shared shell for AI feature sections — brand left border and icon circle header. */

import { CARD_BASE } from "../lib/designTokens";

function AiSection({ title, icon: Icon, children, className = "", id, headerExtra }) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-heading` : undefined}
      className={`${CARD_BASE} border-l-4 border-brand-500 p-4 flex flex-col gap-3 ${className}`}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30"
            aria-hidden="true"
          >
            <Icon className="h-4 w-4 text-brand-500" />
          </div>
          <h3 id={id ? `${id}-heading` : undefined} className="font-display text-sm font-semibold text-foreground">
            {title}
          </h3>
        </div>
        {headerExtra}
      </header>
      {children}
    </section>
  );
}

export default AiSection;
