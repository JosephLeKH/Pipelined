/** Analytics page: charts showing job search patterns. */

import { useState } from "react";

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

import { useAnalytics } from "../hooks/useApplications";
import NavBar from "../components/NavBar";

const EMPTY_STATE_THRESHOLD = 5;

const DATE_RANGES = [
  { label: "Last 30 days", value: 30 },
  { label: "Last 90 days", value: 90 },
  { label: "Last 180 days", value: 180 },
  { label: "All time", value: null },
];

const STAGE_COLOR_MAP = {
  Applied: "#3b82f6",
  "Phone Screen": "#8b5cf6",
  Onsite: "#f59e0b",
  Offer: "#10b981",
  Rejected: "#ef4444",
};

const DEFAULT_BAR_COLOR = "#6b7280";

function ChartCard({ title, children }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-gray-300">{title}</h2>
      {children}
    </div>
  );
}

function Analytics() {
  const [days, setDays] = useState(90);
  const { data: analytics, isLoading, error } = useAnalytics(days);

  const totalApps = analytics
    ? analytics.stage_funnel.reduce((sum, s) => sum + s.count, 0)
    : 0;

  if (isLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <main className="flex flex-1 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
        <NavBar />
        <main className="p-6 text-center text-red-600">Failed to load analytics.</main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <main className="flex-1 p-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Analytics</h1>
          <div className="flex items-center gap-2">
            {DATE_RANGES.map(({ label, value }) => (
              <button
                key={label}
                type="button"
                onClick={() => setDays(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  days === value
                    ? "bg-blue-600 text-white"
                    : "bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {totalApps < EMPTY_STATE_THRESHOLD ? (
          <div className="flex h-64 items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-800">
            <p className="text-gray-500 dark:text-gray-400">Add more applications to unlock analytics</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <ChartCard title="Applications per Week">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.applications_by_week}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Applications" fill="#3b82f6" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Stage Funnel">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.stage_funnel} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={90} />
                  <Tooltip />
                  <Bar
                    dataKey="count"
                    name="Applications"
                    radius={[0, 3, 3, 0]}
                    fill={DEFAULT_BAR_COLOR}
                  />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Response Rate by Month">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={analytics.response_rate_by_month}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 1]} tickFormatter={(v) => `${Math.round(v * 100)}%`} tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v) => `${Math.round(v * 100)}%`} />
                  <Legend />
                  <Line type="monotone" dataKey="rate" name="Response Rate" stroke="#8b5cf6" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard title="Top 10 Companies Applied To">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.top_companies} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="company" tick={{ fontSize: 11 }} width={100} />
                  <Tooltip />
                  <Bar dataKey="count" name="Applications" fill="#10b981" radius={[0, 3, 3, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          </div>
        )}
      </main>
    </div>
  );
}

export default Analytics;
