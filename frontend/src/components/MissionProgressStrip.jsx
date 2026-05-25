/** Footer progress strip showing missions cleared today. */

import { CARD_BASE } from "../lib/designTokens";

function MissionProgressStrip({ cleared = 0, total = 0 }) {
  if (total === 0) return null;

  const ratio = total > 0 ? Math.min(cleared / total, 1) : 0;
  const percent = Math.round(ratio * 100);

  return (
    <footer
      className={`${CARD_BASE} p-4`}
      aria-label={`${cleared} of ${total} missions cleared today`}
    >
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-foreground">
          {cleared} of {total} missions cleared today
        </span>
        <span className="text-muted-foreground">{percent}%</span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-surface-1"
        role="progressbar"
        aria-valuenow={cleared}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <div
          className="h-full rounded-full bg-brand-500 transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>
    </footer>
  );
}

export default MissionProgressStrip;
