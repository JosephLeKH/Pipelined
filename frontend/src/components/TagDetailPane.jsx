/** Right-pane app list for the selected tag — dense, filterable, click-to-open. */

import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import ArrowUpRight from "lucide-react/dist/esm/icons/arrow-up-right";
import Search from "lucide-react/dist/esm/icons/search";
import TagIcon from "lucide-react/dist/esm/icons/tag";

import { useApplications } from "../hooks/useApplications";
import { Input } from "./ui/input";
import CompanyLogo from "./CompanyLogo";
import FitBadge from "./FitBadge";
import TagDot from "./TagDot";
import EmptyState from "./EmptyState";
import { StagePill } from "./ApplicationRow";
import { getDisplayFitScore } from "../lib/fitDisplay";
import { formatRelative } from "../lib/dateUtils";

function AppRowSkeleton() {
  return (
    <div className="flex h-10 items-center gap-2 border-b border-border-1 px-3 last:border-b-0">
      <div className="h-[18px] w-[18px] shrink-0 rounded shimmer-bg animate-shimmer" />
      <div className="h-3 w-32 shrink-0 rounded shimmer-bg animate-shimmer" />
      <div className="ml-2 h-3 flex-1 max-w-[200px] rounded shimmer-bg animate-shimmer" />
      <div className="h-3 w-16 shrink-0 rounded shimmer-bg animate-shimmer" />
      <div className="h-3 w-8 shrink-0 rounded shimmer-bg animate-shimmer" />
      <div className="h-3 w-12 shrink-0 rounded shimmer-bg animate-shimmer" />
    </div>
  );
}

function AppRow({ app, onOpen }) {
  const fitScore = getDisplayFitScore(app);
  return (
    <button
      type="button"
      onClick={() => onOpen(app.id)}
      className="group flex h-10 w-full cursor-pointer items-center gap-2 border-b border-border-1 px-3 text-left last:border-b-0 motion-safe:transition-colors motion-reduce:transition-none hover:bg-surface-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-[-2px] dark:focus-visible:outline-1"
      data-testid="tag-app-row"
    >
      <CompanyLogo
        company_domain={app.company_domain ?? null}
        company={app.company ?? ""}
        size={18}
      />
      <span className="w-32 shrink-0 truncate text-[0.8125rem] font-medium text-text-1">
        {app.company}
      </span>
      <span className="min-w-0 flex-1 truncate text-[0.8125rem] text-text-2">
        {app.role_title}
      </span>
      <div className="w-24 shrink-0">
        <StagePill stage={app.current_stage} />
      </div>
      <span className="inline-flex w-10 shrink-0 justify-end">
        {fitScore != null ? <FitBadge score={fitScore} /> : null}
      </span>
      <span className="w-16 shrink-0 text-right text-xs text-text-3 tabular-nums">
        {app.updated_at ? formatRelative(app.updated_at) : ""}
      </span>
    </button>
  );
}

function TagDetailPane({ tagName, tagColor, totalCount }) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data, isLoading, error, refetch } = useApplications({
    tags: tagName ? [tagName] : undefined,
    include_archived: true,
    limit: 100,
  });

  const apps = data?.data ?? [];

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return apps;
    return apps.filter((app) => {
      const company = (app.company ?? "").toLowerCase();
      const role = (app.role_title ?? "").toLowerCase();
      return company.includes(q) || role.includes(q);
    });
  }, [apps, search]);

  function handleOpen(id) {
    navigate(`/applications/${id}`);
  }

  if (!tagName) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <EmptyState
          title="Select a tag"
          description="Pick a tag on the left to see the applications tagged with it."
          icon={TagIcon}
        />
      </div>
    );
  }

  return (
    <section
      className="flex min-w-0 flex-1 flex-col"
      aria-label={`Applications tagged ${tagName}`}
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border-1 px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <TagDot color={tagColor} />
          <h2 className="truncate text-[0.9375rem] font-semibold text-text-1">
            #{tagName}
          </h2>
          <span className="text-xs text-text-3 tabular-nums">
            · {totalCount} {totalCount === 1 ? "application" : "applications"}
          </span>
        </div>
        <Link
          to={`/dashboard?tags=${encodeURIComponent(tagName)}`}
          className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50 hover:text-brand-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-1 dark:focus-visible:outline-1"
        >
          Open on dashboard
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </header>

      <div className="border-b border-border-1 px-4 py-2">
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-text-3"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search in this tag…"
            aria-label={`Search applications in ${tagName}`}
            className="h-8 pl-7 text-[0.8125rem]"
          />
        </div>
      </div>

      {error ? (
        <div
          role="alert"
          className="m-4 rounded-md border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          <div className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
              Failed to load applications.
            </span>
            <button
              type="button"
              onClick={refetch}
              className="rounded-md border border-destructive/30 px-2 py-1 text-xs font-medium hover:bg-destructive/10"
            >
              Try again
            </button>
          </div>
        </div>
      ) : isLoading ? (
        <div role="status" aria-label="Loading applications" className="flex-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <AppRowSkeleton key={i} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-1 items-center justify-center px-6 py-12">
          <EmptyState
            title={search ? "No matches" : "No applications"}
            description={
              search
                ? `Nothing in #${tagName} matches “${search}”.`
                : `No applications are tagged with #${tagName} yet.`
            }
            icon={TagIcon}
          />
        </div>
      ) : (
        <div className="flex-1" role="list" aria-label={`Applications in ${tagName}`}>
          {filtered.map((app) => (
            <div role="listitem" key={app.id}>
              <AppRow app={app} onOpen={handleOpen} />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default TagDetailPane;
