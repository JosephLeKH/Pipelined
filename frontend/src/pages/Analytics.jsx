/** Analytics page: charts showing job search patterns. */

import { useState } from "react";

import BarChart3 from "lucide-react/dist/esm/icons/bar-chart-3";
import { BarChart } from "recharts/es6/chart/BarChart";
import { LineChart } from "recharts/es6/chart/LineChart";
import { Bar } from "recharts/es6/cartesian/Bar";
import { Line } from "recharts/es6/cartesian/Line";
import { XAxis } from "recharts/es6/cartesian/XAxis";
import { YAxis } from "recharts/es6/cartesian/YAxis";
import { CartesianGrid } from "recharts/es6/cartesian/CartesianGrid";
import { Tooltip } from "recharts/es6/component/Tooltip";
import { Legend } from "recharts/es6/component/Legend";
import { ResponsiveContainer } from "recharts/es6/component/ResponsiveContainer";

import { CARD_BASE } from "../lib/designTokens";
import { useAnalytics, useApplicationStats, useFunnel } from "../hooks/useApplications";
import EmptyState from "../components/EmptyState";
import NavBar from "../components/NavBar";

const EMPTY_STATE_THRESHOLD = 3;
const AVG_DAYS_HIGHLIGHT_THRESHOLD = 21;
const CONVERSION_HIGH_THRESHOLD = 0.6;
const CONVERSION_LOW_THRESHOLD = 0.3;

function rateColorClass(rate) {
  if (rate > CONVERSION_HIGH_THRESHOLD) return "text-emerald-600 dark:text-emerald-400 font-medium";
  if (rate >= CONVERSION_LOW_THRESHOLD) return "text-amber-600 dark:text-amber-400 font-medium";
  return "text-rose-600 dark:text-rose-400 font-medium";
}

function avgDaysColorClass(days) {
  if (days == null) return "";
  return days > AVG_DAYS_HIGHLIGHT_THRESHOLD ? "text-rose-600 dark:text-rose-400" : "";
}

const CHART_COLORS = ["#6366F1", "#8B5CF6", "#10B981", "#F59E0B", "#F43F5E", "#0EA5E9"];

const DATE_RANGES = [
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 180 days", value: 180 },
  { label: "All time", value: null },
];

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg bg-slate-900 px-3 py-2 shadow-lg text-sm">
      {label != null && <p className="mb-1 text-xs text-slate-400">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-white">
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <div className={`${CARD_BASE} p-5`}>
      <div className="mb-4">
        <h2 className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function Analytics() {
  const [days, setDays] = useState(90);
  const { data: analytics, isLoading, error } = useAnalytics(days);
  const { data: funnelData = [] } = useFunnel();
  const { data: statsData } = useApplicationStats();
  const tagOfferRates = statsData?.tag_offer_rates ?? [];

  const totalApps = analytics
    ? analytics.stage_funnel.reduce((sum, s) => sum + s.count, 0)
    : 0;

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
        <NavBar />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
        <NavBar />
        <main className="p-6 text-center text-rose-600">Failed to load analytics.</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900">
      <NavBar />
      <main className="flex-1 p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Analytics</h1>
          <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1 dark:border-slate-700 dark:bg-slate-800">
            {DATE_RANGES.map(({ label, value }) => (
              <button
                key={label}
                type="button"
                onClick={() => setDays(value)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  days === value
                    ? "bg-brand-600 text-white"
                    : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {totalApps < EMPTY_STATE_THRESHOLD ? (
          <EmptyState
            title="Not enough data yet"
            description="Add at least 3 applications to unlock analytics and insights."
            icon={BarChart3}
          />
        ) : (
          <div className="flex flex-col gap-6">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard
              title="Applications per Week"
              description="How many applications you submitted each week"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.applications_by_week}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Applications" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Stage Funnel"
              description="Distribution of applications across pipeline stages"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.stage_funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Applications" fill={CHART_COLORS[1]} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Response Rate by Month"
              description="Percentage of applications that received a response"
            >
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={analytics.response_rate_by_month}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11 }} />
                  <Tooltip content={<CustomTooltip formatter={(v) => `${Math.round(v * 100)}%`} />} />
                  <Legend />
                  <Line type="monotone" dataKey="rate" name="Response Rate" stroke={CHART_COLORS[2]} dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Top 10 Companies Applied To"
              description="Companies you've applied to most frequently"
            >
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.top_companies} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="company" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Applications" fill={CHART_COLORS[3]} radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>

            {tagOfferRates.length > 0 && (
              <ChartCard
                title="Tags"
                description="Offer rate for each tag across your applications"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-700">
                        <th className="pb-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Tag</th>
                        <th className="pb-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Applications</th>
                        <th className="pb-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Offers</th>
                        <th className="pb-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Offer Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tagOfferRates.map((row) => (
                        <tr key={row.tag} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{row.tag}</td>
                          <td className="py-2 text-right text-slate-700 dark:text-slate-300">{row.application_count}</td>
                          <td className="py-2 text-right text-slate-500 dark:text-slate-400">{row.offer_count}</td>
                          <td className={`py-2 text-right ${rateColorClass(row.offer_rate)}`}>
                            {`${Math.round(row.offer_rate * 100)}%`}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </ChartCard>
            )}

            {funnelData.length > 0 && (
              <>
                <ChartCard
                  title="Stage Conversion Funnel"
                  description="Applications entering each stage"
                >
                  <ResponsiveContainer width="100%" height={Math.max(180, funnelData.length * 40)}>
                    <BarChart data={funnelData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                      <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={110} />
                      <Tooltip content={<CustomTooltip />} />
                      <Bar dataKey="entered_count" name="Applications Entered" fill={CHART_COLORS[4]} radius={[0, 3, 3, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartCard>

                <ChartCard
                  title="Conversion Rates by Stage"
                  description="Progression rate from each stage to the next, and average time spent"
                >
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-700">
                          <th className="pb-2 text-left text-xs font-medium text-slate-500 dark:text-slate-400">Stage</th>
                          <th className="pb-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Entered</th>
                          <th className="pb-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Converted</th>
                          <th className="pb-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Rate</th>
                          <th className="pb-2 text-right text-xs font-medium text-slate-500 dark:text-slate-400">Avg Days</th>
                        </tr>
                      </thead>
                      <tbody>
                        {funnelData.map((row, i) => {
                          const isLast = i === funnelData.length - 1;
                          return (
                            <tr key={row.stage} className="border-b border-slate-100 dark:border-slate-800 last:border-0">
                              <td className="py-2 pr-4 text-slate-700 dark:text-slate-300">{row.stage}</td>
                              <td className="py-2 text-right text-slate-700 dark:text-slate-300">{row.entered_count}</td>
                              <td className="py-2 text-right text-slate-500 dark:text-slate-400">{isLast ? "—" : row.exited_to_next_count}</td>
                              <td className={`py-2 text-right ${isLast ? "text-slate-400 dark:text-slate-600" : rateColorClass(row.conversion_rate)}`}>
                                {isLast ? "—" : `${Math.round(row.conversion_rate * 100)}%`}
                              </td>
                              <td className={`py-2 text-right ${avgDaysColorClass(row.avg_days_in_stage)}`}>
                                {row.avg_days_in_stage != null ? `${row.avg_days_in_stage.toFixed(1)}d` : "—"}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </ChartCard>
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default Analytics;
