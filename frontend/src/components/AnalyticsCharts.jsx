/** Chart sub-components used by the Analytics page. */

import { BarChart } from "recharts/es6/chart/BarChart";
import { LineChart } from "recharts/es6/chart/LineChart";
import { Bar } from "recharts/es6/cartesian/Bar";
import { Line } from "recharts/es6/cartesian/Line";
import { XAxis } from "recharts/es6/cartesian/XAxis";
import { YAxis } from "recharts/es6/cartesian/YAxis";
import { Tooltip } from "recharts/es6/component/Tooltip";
import { ResponsiveContainer } from "recharts/es6/component/ResponsiveContainer";

import { PipelineFunnel } from "./PipelineFunnel";

const CHART_COLORS = {
  series1: "#8C1515",
  series2: "#3B82F6",
  series3: "#175E54",
  series4: "#F59E0B",
  series5: "#71717A",
};

const CHART_TICK = { fontSize: 11, fill: "var(--text-3)" };
const CHART_AXIS_LINE = { stroke: "var(--border-1)" };
const BAR_RADIUS_UP = [8, 8, 0, 0];
const BAR_RADIUS_RIGHT = [0, 8, 8, 0];
const CHART_HEIGHT = 240;
const CONVERSION_HIGH_THRESHOLD = 0.6;
const CONVERSION_LOW_THRESHOLD = 0.3;
const AVG_DAYS_HIGHLIGHT_THRESHOLD = 21;

function rateColorClass(rate) {
  if (rate > CONVERSION_HIGH_THRESHOLD) return "text-primary font-medium";
  if (rate >= CONVERSION_LOW_THRESHOLD) return "text-warning font-medium";
  return "text-destructive font-medium";
}

function avgDaysColorClass(days) {
  if (days == null) return "";
  return days > AVG_DAYS_HIGHLIGHT_THRESHOLD ? "text-destructive" : "";
}

function hasChartValues(data, valueKey) {
  return data?.length > 0 && data.some((row) => Number(row[valueKey]) > 0);
}

function axisProps(extra = {}) {
  return {
    tick: CHART_TICK,
    axisLine: CHART_AXIS_LINE,
    tickLine: CHART_AXIS_LINE,
    ...extra,
  };
}

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div
      data-testid="analytics-chart-tooltip"
      className="rounded-md border border-border-2 bg-surface-0 p-2 text-xs text-text-1 shadow-[var(--shadow-popover)]"
    >
      {label != null && <p className="mb-1 text-text-3">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.dataKey}>
          {entry.name}: {formatter ? formatter(entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
}

function EmptyChartMessage() {
  return (
    <div className="relative flex items-center justify-center" style={{ height: CHART_HEIGHT }}>
      <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-border-1" aria-hidden="true" />
      <p className="relative bg-surface-0 px-3 text-xs text-text-3">No data for this range</p>
    </div>
  );
}

function ChartCard({ title, description, children }) {
  return (
    <div className="rounded-lg border border-border-1 bg-surface-0 p-6">
      <div className="mb-4">
        <h2 className="text-sm font-medium text-text-1">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-text-3">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function ChartContainer({ data, valueKey, ariaLabel, children }) {
  if (!hasChartValues(data, valueKey)) {
    return (
      <div role="img" aria-label={ariaLabel}>
        <EmptyChartMessage />
      </div>
    );
  }
  return (
    <div role="img" aria-label={ariaLabel}>
      <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
        {children}
      </ResponsiveContainer>
    </div>
  );
}

function WeeklyApplicationsChart({ data }) {
  return (
    <ChartCard title="Applications per Week" description="How many applications you submitted each week">
      <ChartContainer data={data} valueKey="count" ariaLabel="Bar chart: Applications per Week">
        <BarChart data={data}>
          <XAxis dataKey="week" {...axisProps()} />
          <YAxis allowDecimals={false} {...axisProps()} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Applications" fill={CHART_COLORS.series1} radius={BAR_RADIUS_UP} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

function ResponseRateChart({ data }) {
  return (
    <ChartCard title="Response Rate by Month" description="Percentage of applications that received a response">
      <ChartContainer data={data} valueKey="rate" ariaLabel="Line chart: Response Rate by Month">
        <LineChart data={data}>
          <XAxis dataKey="month" {...axisProps()} />
          <YAxis
            domain={[0, 1]}
            tickFormatter={(value) => `${Math.round(value * 100)}%`}
            {...axisProps()}
          />
          <Tooltip content={<CustomTooltip formatter={(value) => `${Math.round(value * 100)}%`} />} />
          <Line
            type="monotone"
            dataKey="rate"
            name="Response Rate"
            stroke={CHART_COLORS.series3}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: CHART_COLORS.series3, stroke: CHART_COLORS.series3 }}
          />
        </LineChart>
      </ChartContainer>
    </ChartCard>
  );
}

function TopCompaniesChart({ data }) {
  return (
    <ChartCard title="Top 10 Companies Applied To" description="Companies you've applied to most frequently">
      <ChartContainer data={data} valueKey="count" ariaLabel="Bar chart: Top 10 Companies Applied To">
        <BarChart data={data} layout="vertical">
          <XAxis type="number" allowDecimals={false} {...axisProps()} />
          <YAxis type="category" dataKey="company" {...axisProps({ width: 100 })} />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="count" name="Applications" fill={CHART_COLORS.series4} radius={BAR_RADIUS_RIGHT} />
        </BarChart>
      </ChartContainer>
    </ChartCard>
  );
}

function AnalyticsMainCharts({ analytics }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <WeeklyApplicationsChart data={analytics.applications_by_week} />
      <ResponseRateChart data={analytics.response_rate_by_month} />
      <TopCompaniesChart data={analytics.top_companies} />
    </div>
  );
}

function AnalyticsTagsTable({ tagOfferRates }) {
  return (
    <ChartCard title="Tags" description="Offer rate for each tag across your applications">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Tags offer rate">
          <caption className="sr-only">Tag offer rates</caption>
          <thead>
            <tr className="border-b border-border-1">
              <th scope="col" className="pb-2 text-left text-xs font-medium text-text-3">Tag</th>
              <th scope="col" className="pb-2 text-right text-xs font-medium text-text-3">Applications</th>
              <th scope="col" className="pb-2 text-right text-xs font-medium text-text-3">Offers</th>
              <th scope="col" className="pb-2 text-right text-xs font-medium text-text-3">Offer Rate</th>
            </tr>
          </thead>
          <tbody>
            {tagOfferRates.map((row) => (
              <tr key={row.tag} className="border-b border-border-1 last:border-0">
                <td className="py-2 pr-4 text-text-1">{row.tag}</td>
                <td className="py-2 text-right text-text-1">{row.application_count}</td>
                <td className="py-2 text-right text-text-3">{row.offer_count}</td>
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
    <tr className="border-b border-border-1 last:border-0">
      <td className="py-2 pr-4 text-text-1">{row.stage}</td>
      <td className="py-2 text-right text-text-1">{row.entered_count}</td>
      <td className="py-2 text-right text-text-3">
        {isLast ? "N/A" : row.exited_to_next_count}
      </td>
      <td className={`py-2 text-right ${isLast ? "text-text-3/50" : rateColorClass(row.conversion_rate)}`}>
        {isLast ? "N/A" : `${Math.round(row.conversion_rate * 100)}%`}
      </td>
      <td className={`py-2 text-right ${avgDaysColorClass(row.avg_days_in_stage)}`}>
        {row.avg_days_in_stage != null ? `${row.avg_days_in_stage.toFixed(1)}d` : "N/A"}
      </td>
    </tr>
  );
}

function ConversionRatesTable({ data }) {
  return (
    <ChartCard title="Conversion Rates by Stage" description="Progression rate from each stage to the next, and average time spent">
      <div className="overflow-x-auto">
        <table className="w-full text-sm" aria-label="Conversion rates by stage">
          <caption className="sr-only">Conversion rates by stage</caption>
          <thead>
            <tr className="border-b border-border-1">
              <th scope="col" className="pb-2 text-left text-xs font-medium text-text-3">Stage</th>
              <th scope="col" className="pb-2 text-right text-xs font-medium text-text-3">Entered</th>
              <th scope="col" className="pb-2 text-right text-xs font-medium text-text-3">Converted</th>
              <th scope="col" className="pb-2 text-right text-xs font-medium text-text-3">Rate</th>
              <th scope="col" className="pb-2 text-right text-xs font-medium text-text-3">Avg Days</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, index) => (
              <ConversionRatesRow key={row.stage} row={row} isLast={index === data.length - 1} />
            ))}
          </tbody>
        </table>
      </div>
    </ChartCard>
  );
}

function AnalyticsFunnelSection({ funnelData }) {
  if (!funnelData.length) return null;
  return (
    <>
      <PipelineFunnel funnelData={funnelData} />
      <ConversionRatesTable data={funnelData} />
    </>
  );
}

export { AnalyticsMainCharts, AnalyticsTagsTable, AnalyticsFunnelSection, CHART_COLORS, CustomTooltip };
