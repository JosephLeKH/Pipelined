/** Fallback widget for Today when no morning brief exists: lists upcoming + overdue follow-ups. */

import { useMemo } from "react";
import { Link } from "react-router-dom";

import Bell from "lucide-react/dist/esm/icons/bell";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";

import { useApplications } from "../hooks/useApplications";
import { formatDate, isFollowUpOverdue } from "../lib/dateUtils";

const FOLLOW_UP_WINDOW_DAYS = 7;
const MAX_ITEMS = 6;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function withinWindow(followUpDate) {
  const d = new Date(followUpDate);
  if (Number.isNaN(d.getTime())) return false;
  const now = Date.now();
  const max = now + FOLLOW_UP_WINDOW_DAYS * MS_PER_DAY;
  return d.getTime() <= max;
}

function FollowUpRow({ app }) {
  const overdue = isFollowUpOverdue(app.follow_up_date);
  const Icon = overdue ? AlertCircle : Bell;
  return (
    <li>
      <Link
        to={`/dashboard?app=${app.id}`}
        className="flex items-center justify-between gap-3 rounded-md px-2 py-1.5 text-sm hover:bg-surface-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 dark:focus-visible:outline-1"
      >
        <span className="flex min-w-0 items-center gap-2">
          <Icon
            className={`h-3.5 w-3.5 shrink-0 ${overdue ? "text-destructive" : "text-text-3"}`}
            aria-hidden="true"
          />
          <span className="min-w-0 truncate text-text-1">
            <span className="font-medium">{app.company}</span>
            {app.role_title ? <span className="text-text-3"> · {app.role_title}</span> : null}
          </span>
        </span>
        <span className={`shrink-0 text-xs ${overdue ? "text-destructive" : "text-text-3"}`}>
          {overdue ? "Overdue" : formatDate(app.follow_up_date)}
        </span>
      </Link>
    </li>
  );
}

export default function TodayFollowUps() {
  const { data: env } = useApplications({ limit: 100 });
  const apps = env?.data ?? [];

  const followUps = useMemo(() => {
    const filtered = apps.filter(
      (a) =>
        a.follow_up_date &&
        !a.archived &&
        !a.deleted &&
        withinWindow(a.follow_up_date),
    );
    filtered.sort((a, b) => new Date(a.follow_up_date) - new Date(b.follow_up_date));
    return filtered.slice(0, MAX_ITEMS);
  }, [apps]);

  if (followUps.length === 0) return null;

  return (
    <section
      aria-label="Upcoming follow-ups"
      className="rounded-lg border border-border-1 bg-surface-0 p-4"
    >
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-3">
        Follow-ups this week
      </h2>
      <ul className="space-y-0.5">
        {followUps.map((app) => (
          <FollowUpRow key={app.id} app={app} />
        ))}
      </ul>
    </section>
  );
}
