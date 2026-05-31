/** Custom horizontal pipeline funnel — PRD-07 §3.3 (no recharts). */

import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";

const PIPELINE_FUNNEL_STAGES = ["Applied", "Phone Screen", "Technical", "Onsite", "Offer"];
const BAR_HEIGHT_PX = 24;
const STAGE_LABEL_WIDTH = "6.5rem";

function stageDotColor(stage) {
  return (STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR).dotColor;
}

function rowsForDisplay(funnelData) {
  const byStage = Object.fromEntries(funnelData.map((row) => [row.stage, row]));
  return PIPELINE_FUNNEL_STAGES.map((stage) => {
    const row = byStage[stage];
    return {
      stage,
      entered_count: row?.entered_count ?? 0,
      dropped_count: row?.dropped_count ?? 0,
    };
  });
}

function dropOffLabel(current, next) {
  const from = current.entered_count;
  const to = next?.entered_count ?? 0;
  if (from <= 0 || to >= from) return null;
  const lost = from - to;
  const pct = Math.round((lost / from) * 100);
  const conversionPct = Math.round((to / from) * 100);
  return `${conversionPct}% → next stage · −${pct}% drop-off (${lost} lost)`;
}

function FunnelBar({ stage, count, widthPct, dotColor }) {
  return (
    <div className="flex min-h-[2.5rem] items-center gap-3">
      <span
        className="shrink-0 text-sm text-text-1"
        style={{ width: STAGE_LABEL_WIDTH }}
      >
        {stage}
      </span>
      <div
        className="flex-1 overflow-hidden rounded-md bg-surface-1"
        style={{ height: BAR_HEIGHT_PX }}
        role="presentation"
      >
        <div
          data-testid={`funnel-bar-${stage}`}
          className="motion-safe:transition-[width] motion-safe:duration-300 h-full rounded-md"
          style={{
            width: `${widthPct}%`,
            backgroundColor: dotColor,
            minWidth: count > 0 ? "4px" : 0,
          }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-sm font-medium tabular-nums text-text-1">
        {count}
      </span>
    </div>
  );
}

function PipelineFunnel({ funnelData }) {
  const rows = rowsForDisplay(funnelData);
  const maxCount = Math.max(...rows.map((r) => r.entered_count), 1);

  return (
    <div
      className="rounded-lg border border-border-1 bg-surface-0 p-6"
      aria-label="Pipeline funnel"
    >
      <div className="mb-4">
        <h2 className="text-sm font-medium text-text-1">Pipeline funnel</h2>
        <p className="mt-0.5 text-xs text-text-3">
          Applications at each stage, with drop-off to the next
        </p>
      </div>
      <div className="flex flex-col gap-1">
        {rows.map((row, index) => {
          const widthPct = (row.entered_count / maxCount) * 100;
          const dropOff = index < rows.length - 1 ? dropOffLabel(row, rows[index + 1]) : null;
          return (
            <div key={row.stage}>
              <FunnelBar
                stage={row.stage}
                count={row.entered_count}
                widthPct={widthPct}
                dotColor={stageDotColor(row.stage)}
              />
              {dropOff && (
                <p
                  data-testid={`funnel-dropoff-${row.stage}`}
                  className="mb-2 mt-0.5 text-xs text-text-3"
                  style={{ marginLeft: `calc(${STAGE_LABEL_WIDTH} + 0.75rem)` }}
                >
                  {dropOff}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export { PIPELINE_FUNNEL_STAGES, PipelineFunnel, dropOffLabel, rowsForDisplay, stageDotColor };
