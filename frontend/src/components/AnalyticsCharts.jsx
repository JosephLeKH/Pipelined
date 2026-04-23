/** Chart sub-components used by the Analytics page. */

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

const CHART_COLORS = ["#d97757", "#6a9bcc", "#788c5d", "#9ca3af", "#d1d5db"];
const CONVERSION_HIGH_THRESHOLD = 0.6;
const CONVERSION_LOW_THRESHOLD = 0.3;
const AVG_DAYS_HIGHLIGHT_THRESHOLD = 21;

function rateColorClass(rate) {
  if (rate > CONVERSION_HIGH_THRESHOLD) return "text-emerald-600 dark:text-emerald-400 font-medium";
  if (rate >= CONVERSION_LOW_THRESHOLD) return "text-amber-600 dark:text-amber-400 font-medium";
  return "text-rose-600 dark:text-rose-400 font-medium";
}

function avgDaysColorClass(days) {
  if (days == null) return "";
  return days > AVG_DAYS_HIGHLIGHT_THRESHOLD ? "text-rose-600 dark:text-rose-400" : "";
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border-default bg-white px-3 py-2 shadow-card text-sm dark:border-gray-700 dark:bg-gray-800">
      {label != null && <p className="mb-1 text-xs text-gray-400">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-gray-700 dark:text-gray-300">
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <div className={`${CARD_BASE} p-6`}>
      <div className="mb-4">
        <h2 className="font-display text-sm font-medium text-gray-900 dark:text-gray-100">{title}</h2>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function WeeklyApplicationsChart({ data }) {
  return (
    <ChartCard title="Applications per Week" description="How many applications you submitted each week">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e6dc" />
          <XAxis dataKey="week" tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Applications" fill={CHART_COLORS[0]} radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function StageFunnelChart({ data }) {
  return (
    <ChartCard title="Stage Funnel" description="Distribution of applications across pipeline stages">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e6dc" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "#9ca3af" }} width={90} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Applications" fill={CHART_COLORS[1]} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function ResponseRateChart({ data }) {
  return (
    <ChartCard title="Response Rate by Month" description="Percentage of applications that received a response">
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e6dc" />
          <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <Tooltip content={<CustomTooltip formatter={(v) => `${Math.round(v * 100)}%`} />} />
          <Legend />
          <Line type="monotone" dataKey="rate" name="Response Rate" stroke={CHART_COLORS[2]} dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function TopCompaniesChart({ data }) {
  return (
    <ChartCard title="Top 10 Companies Applied To" description="Companies you've applied to most frequently">
      <ResponsiveContainer width="100%" height={240}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e6dc" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <YAxis type="category" dataKey="company" tick={{ fontSize: 11, fill: "#9ca3af" }} width={100} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Applications" fill={CHART_COLORS[3]} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function AnalyticsMainCharts({ analytics }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <WeeklyApplicationsChart data={analytics.applications_by_week} />
      <StageFunnelChart data={analytics.stage_funnel} />
      <ResponseRateChart data={analytics.response_rate_by_month} />
      <TopCompaniesChart data={analytics.top_companies} />
    </div>
  );
}

function AnalyticsTagsTable({ tagOfferRates }) {
  return (
    <ChartCard title="Tags" description="Offer rate for each tag across your applications">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="pb-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Tag</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Applications</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Offers</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Offer Rate</th>
            </tr>
          </thead>
          <tbody>
            {tagOfferRates.map((row) => (
              <tr key={row.tag} className="border-b border-gray-100 dark:border-gray-800 last:border-0">
                <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{row.tag}</td>
                <td className="py-2 text-right text-gray-700 dark:text-gray-300">{row.application_count}</td>
                <td className="py-2 text-right text-gray-500 dark:text-gray-400">{row.offer_count}</td>
                <td className={`py-2 text-right ${rateColorClass(row.offer_rate)}`}>
                  {`${Math.round(row.offer_rate * 100)}%`}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

function ConversionRatesRow({ row, isLast }) {
  return (
    <tr className="border-b border-gray-100 dark:border-gray-800 last:border-0">
      <td className="py-2 pr-4 text-gray-700 dark:text-gray-300">{row.stage}</td>
      <td className="py-2 text-right text-gray-700 dark:text-gray-300">{row.entered_count}</td>
      <td className="py-2 text-right text-gray-500 dark:text-gray-400">
        {isLast ? "—" : row.exited_to_next_count}
      </td>
      <td className={`py-2 text-right ${isLast ? "text-gray-400 dark:text-gray-600" : rateColorClass(row.conversion_rate)}`}>
        {isLast ? "—" : `${Math.round(row.conversion_rate * 100)}%`}
      </td>
      <td className={`py-2 text-right ${avgDaysColorClass(row.avg_days_in_stage)}`}>
        {row.avg_days_in_stage != null ? `${row.avg_days_in_stage.toFixed(1)}d` : "—"}
      </td>
    </tr>
  );
}

function ConversionRatesTable({ data }) {
  return (
    <ChartCard title="Conversion Rates by Stage" description="Progression rate from each stage to the next, and average time spent">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="pb-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400">Stage</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Entered</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Converted</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Rate</th>
              <th className="pb-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400">Avg Days</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <ConversionRatesRow key={row.stage} row={row} isLast={i === data.length - 1} />
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

function FunnelBarChart({ data }) {
  return (
    <ChartCard title="Stage Conversion Funnel" description="Applications entering each stage">
      <ResponsiveContainer width="100%" height={Math.max(180, data.length * 40)}>
        <BarChart data={data} layout="vertical">
          <CartesianGrid strokeDasharray="3 3" stroke="#e8e6dc" />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "#9ca3af" }} />
          <YAxis type="category" dataKey="stage" tick={{ fontSize: 11, fill: "#9ca3af" }} width={110} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="entered_count" name="Applications Entered" fill={CHART_COLORS[4]} radius={[0, 3, 3, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartCard>
  );
}

function AnalyticsFunnelSection({ funnelData }) {
  if (!funnelData.length) return null;
  return (
    <>
      <FunnelBarChart data={funnelData} />
      <ConversionRatesTable data={funnelData} />
    </>
  );
}

export { AnalyticsMainCharts, AnalyticsTagsTable, AnalyticsFunnelSection };
