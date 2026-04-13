/** Global command palette — opens on Cmd+K / Ctrl+K for instant search and actions. */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";

import SearchIcon from "lucide-react/dist/esm/icons/search";

import { useApplications, KEYS } from "../hooks/useApplications";
import { useTheme } from "../context/ThemeContext";
import { fetchApplications, exportApplicationsCsv } from "../api/applications";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR, QUERY_STALE_TIME_MS } from "../lib/constants";
import { BADGE_BASE } from "../lib/designTokens";
import ManualAddForm from "./ManualAddForm";

const PALETTE_DEBOUNCE_MS = 200;
const PALETTE_CLIENT_LIMIT = 100;
const PALETTE_MAX_RESULTS = 10;
const EMPTY_APPS = Object.freeze([]);

const NAV_ITEMS = [
  { id: "nav-dashboard", type: "nav", label: "Dashboard", path: "/dashboard", hint: "1" },
  { id: "nav-calendar",  type: "nav", label: "Calendar",  path: "/calendar",  hint: "2" },
  { id: "nav-analytics", type: "nav", label: "Analytics", path: "/analytics", hint: "3" },
  { id: "nav-jobs",      type: "nav", label: "Job Board", path: "/jobs",      hint: "4" },
  { id: "nav-settings",  type: "nav", label: "Settings",  path: "/settings",  hint: "5" },
];

function SectionHeader({ label }) {
  return (
    <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">
      {label}
    </p>
  );
}

function StageBadge({ stage }) {
  const c = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
  return <span className={`shrink-0 ${BADGE_BASE} ${c.bg} ${c.text}`}>{stage}</span>;
}

export function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [debQuery, setDebQuery] = useState("");
  const [idx, setIdx] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const highlightRef = useRef(null);
  const navigate = useNavigate();
  const { cycleTheme } = useTheme();

  useEffect(() => { highlightRef.current?.scrollIntoView?.({ block: "nearest" }); }, [idx]);

  useEffect(() => {
    const t = setTimeout(() => setDebQuery(query), PALETTE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);

  const { data: env } = useApplications({ limit: PALETTE_CLIENT_LIMIT });
  const allApps = env?.data ?? [];
  const total = env?.meta?.total ?? allApps.length;

  const searchEnabled = total > PALETTE_CLIENT_LIMIT && Boolean(debQuery);
  const { data: searchEnv } = useQuery({
    queryKey: KEYS.list({ q: debQuery, limit: PALETTE_MAX_RESULTS }),
    queryFn: () => fetchApplications({ q: debQuery, limit: PALETTE_MAX_RESULTS }),
    enabled: searchEnabled,
    staleTime: QUERY_STALE_TIME_MS,
  });

  const filteredApps = useMemo(() => {
    if (!query) return EMPTY_APPS;
    if (total <= PALETTE_CLIENT_LIMIT) {
      const q = query.toLowerCase();
      return allApps
        .filter((a) => a.company?.toLowerCase().includes(q) || a.role_title?.toLowerCase().includes(q))
        .slice(0, PALETTE_MAX_RESULTS);
    }
    return searchEnv?.data ?? [];
  }, [query, total, allApps, searchEnv]);

  const actions = useMemo(() => [
    { id: "action-add",    type: "action", label: "Add Application",  fn: () => setFormOpen(true) },
    {
      id: "action-export", type: "action", label: "Export CSV",
      fn: async () => {
        const blob = await exportApplicationsCsv();
        const url = URL.createObjectURL(blob);
        Object.assign(document.createElement("a"), { href: url, download: "applications.csv" }).click();
        URL.revokeObjectURL(url);
      },
    },
    { id: "action-theme",  type: "action", label: "Toggle Dark Mode", fn: cycleTheme },
  ], [cycleTheme]);

  const items = useMemo(
    () => (query ? filteredApps.map((a) => ({ type: "app", ...a })) : [...NAV_ITEMS, ...actions]),
    [query, filteredApps, actions]
  );

  useEffect(() => { setIdx(0); }, [items]);

  const close = useCallback(() => { setIsOpen(false); setQuery(""); }, []);

  const activate = useCallback((item) => {
    if (item.type === "app") navigate(`/dashboard?selected=${item.id}`);
    else if (item.type === "nav") navigate(item.path);
    else if (item.type === "action") item.fn();
    close();
  }, [navigate, close]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setIsOpen((o) => !o); return; }
      if (!isOpen) return;
      if (e.key === "Escape") { close(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, items.length - 1)); return; }
      if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === "Enter" && items[idx]) activate(items[idx]);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, items, idx, activate, close]);

  const row = (item, i, content, hint) => (
    <button
      key={item.id}
      ref={idx === i ? highlightRef : null}
      type="button"
      onClick={() => activate(item)}
      className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors ${
        idx === i ? "bg-brand-50 dark:bg-brand-900/30" : "hover:bg-slate-50 dark:hover:bg-slate-700"
      }`}
    >
      {content}
      {hint && <span className="ml-auto shrink-0 text-xs text-slate-400 dark:text-slate-500">{hint}</span>}
    </button>
  );

  return (
    <>
      <ManualAddForm isOpen={formOpen} onClose={() => setFormOpen(false)} />
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm" onClick={close} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Command palette"
            className="fixed left-1/2 top-[20%] z-50 w-full max-w-xl -translate-x-1/2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-modal dark:border-slate-700 dark:bg-slate-800"
          >
            <div className="flex items-center gap-2 border-b border-slate-200 px-3 dark:border-slate-700">
              <SearchIcon className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search applications or type a command…"
                className="w-full bg-transparent py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none dark:text-slate-100"
              />
            </div>
            <div className="max-h-80 overflow-y-auto py-1">
              {query ? (
                <>
                  <SectionHeader label="Applications" />
                  {filteredApps.length === 0
                    ? <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">No results.</p>
                    : filteredApps.map((app, i) =>
                        row(
                          { type: "app", ...app },
                          i,
                          <>
                            <span className="font-semibold text-slate-900 dark:text-slate-100">{app.company}</span>
                            <span className="min-w-0 truncate text-slate-500 dark:text-slate-400">{app.role_title}</span>
                            <StageBadge stage={app.current_stage} />
                          </>
                        )
                      )}
                </>
              ) : (
                <>
                  <SectionHeader label="Navigation" />
                  {NAV_ITEMS.map((item, i) =>
                    row(item, i, <span className="text-slate-900 dark:text-slate-100">{item.label}</span>, item.hint)
                  )}
                  <SectionHeader label="Actions" />
                  {actions.map((item, i) =>
                    row(item, NAV_ITEMS.length + i, <span className="text-slate-900 dark:text-slate-100">{item.label}</span>)
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </>
  );
}

export default CommandPalette;
