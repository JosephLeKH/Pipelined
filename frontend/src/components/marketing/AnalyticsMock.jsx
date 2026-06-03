/** Mock Analytics page with KPI tiles and pipeline funnel — used in marketing. */

import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import TrendingDown from "lucide-react/dist/esm/icons/trending-down";
import Ghost from "lucide-react/dist/esm/icons/ghost";
import Mail from "lucide-react/dist/esm/icons/mail";

const KPI_TILES = [
  { label: "Applied", value: "47", delta: "+12", trend: "up" },
  { label: "Reply rate", value: "31%", delta: "+4pp", trend: "up" },
  { label: "Ghost rate", value: "18%", delta: "-6pp", trend: "down" },
];

const FUNNEL_STAGES = [
  { label: "Applied", count: 47, width: "100%", color: "bg-brand-700" },
  { label: "Phone screen", count: 22, width: "47%", color: "bg-brand-600" },
  { label: "Onsite", count: 9, width: "19%", color: "bg-brand-500" },
  { label: "Offer", count: 3, width: "6.4%", color: "bg-brand-400" },
];

const GHOST_COMPANIES = [
  { name: "Datadog", days: 21 },
  { name: "Cloudflare", days: 17 },
  { name: "Figma", days: 14 },
];

function KpiTile({ label, value, delta, trend }) {
  const TrendIcon = trend === "up" ? TrendingUp : TrendingDown;
  const trendColor = trend === "up" ? "text-status-good" : "text-status-good";
  return (
    <div className="rounded-lg border border-border-1 bg-surface-0 p-3">
      <p className="text-[0.5625rem] font-medium uppercase tracking-[0.08em] text-text-3">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-xl font-semibold text-text-1">{value}</span>
        <span className={`inline-flex items-center gap-0.5 text-[0.625rem] font-medium ${trendColor}`}>
          <TrendIcon className="h-2.5 w-2.5" aria-hidden="true" />
          {delta}
        </span>
      </div>
    </div>
  );
}

function WeeklyReviewCard() {
  return (
    <div className="absolute -bottom-5 -right-4 w-[15rem] rounded-xl border border-border-2 bg-surface-0 p-3 shadow-[0_14px_38px_-12px_rgba(140,21,21,0.28),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Mail className="h-3 w-3 text-brand-600" aria-hidden="true" />
        <span className="text-[0.6875rem] font-semibold text-text-1">Weekly Review</span>
        <span className="ml-auto text-[0.5625rem] text-text-3">Mon · 8 AM</span>
      </div>
      <p className="text-[0.6875rem] leading-relaxed text-text-2">
        12 apps moved forward, 3 stalled. Reply rate up 4pp week-over-week.
      </p>
    </div>
  );
}

export default function AnalyticsMock() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-x-8 -inset-y-6 -z-10 rounded-[2.25rem] bg-gradient-to-br from-brand-100/40 via-transparent to-brand-50/0 blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-border-2 bg-surface-0 shadow-[0_24px_70px_-30px_rgba(140,21,21,0.18),0_2px_6px_-1px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-border-1 bg-surface-1 px-4 py-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-text-1">Analytics</span>
          </div>
          <span className="text-[0.6875rem] text-text-3">Last 30 days</span>
        </div>

        <div className="relative px-5 pb-10 pt-4">
          <div className="grid grid-cols-3 gap-2">
            {KPI_TILES.map((tile) => (
              <KpiTile key={tile.label} {...tile} />
            ))}
          </div>

          <div className="mt-4 rounded-lg border border-border-1 bg-surface-1/40 p-3">
            <p className="mb-2.5 text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-text-3">
              Pipeline funnel
            </p>
            <div className="space-y-2">
              {FUNNEL_STAGES.map((stage) => (
                <div key={stage.label} className="flex items-center gap-3">
                  <span className="w-20 shrink-0 text-[0.625rem] font-medium text-text-2">
                    {stage.label}
                  </span>
                  <div className="flex h-5 flex-1 items-center rounded bg-surface-2">
                    <div
                      className={`flex h-full items-center justify-end rounded px-1.5 ${stage.color}`}
                      style={{ width: stage.width }}
                    >
                      <span className="text-[0.5625rem] font-semibold text-white">{stage.count}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 rounded-lg border border-border-1 bg-surface-1/40 p-3">
            <div className="mb-2 flex items-center gap-1.5">
              <Ghost className="h-3 w-3 text-text-3" aria-hidden="true" />
              <span className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-text-3">
                Ghost rate · top 3
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {GHOST_COMPANIES.map((company) => (
                <span
                  key={company.name}
                  className="inline-flex items-center gap-1 rounded-full border border-border-1 bg-surface-0 px-2 py-0.5 text-[0.625rem] text-text-2"
                >
                  {company.name}
                  <span className="text-text-3">· {company.days}d</span>
                </span>
              ))}
            </div>
          </div>
          <WeeklyReviewCard />
        </div>
      </div>
    </div>
  );
}
