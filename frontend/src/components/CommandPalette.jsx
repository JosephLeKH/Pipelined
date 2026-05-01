/** Global command palette — opens on Cmd+K / Ctrl+K for instant search and actions. */

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";

import SearchIcon from "lucide-react/dist/esm/icons/search";

import { cn } from "../lib/utils";
import { useApplications } from "../hooks/useApplications";
import { useTheme } from "../context/ThemeContext";
import { useCommandPaletteSearch, PALETTE_CLIENT_LIMIT } from "../hooks/useCommandPaletteSearch";
import { useCommandPaletteActions } from "../hooks/useCommandPaletteActions";
import { useCommandPaletteKeyboard } from "../hooks/useCommandPaletteKeyboard";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { Button } from "./ui/button";
import ManualAddForm from "./ManualAddForm";

const PALETTE_DEBOUNCE_MS = 200;

const NAV_ITEMS = [
  { id: "nav-dashboard", type: "nav", label: "Dashboard", path: "/dashboard", hint: "1" },
  { id: "nav-calendar",  type: "nav", label: "Calendar",  path: "/calendar",  hint: "2" },
  { id: "nav-analytics", type: "nav", label: "Analytics", path: "/analytics", hint: "3" },
  { id: "nav-jobs",      type: "nav", label: "Job Board", path: "/jobs",      hint: "4" },
  { id: "nav-settings",  type: "nav", label: "Settings",  path: "/settings",  hint: "5" },
];

function SectionHeader({ label }) {
  return (
    <p className="px-3 pt-2 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
      {label}
    </p>
  );
}

function StageBadge({ stage }) {
  const c = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
  return <span className={`shrink-0 rounded-full text-xs font-medium px-2.5 py-1 inline-flex items-center gap-1 ${c.bg} ${c.text}`}>{stage}</span>;
}

function PaletteRow({ item, isActive, activate, highlightRef, hint, children }) {
  return (
    <Button
      ref={isActive ? highlightRef : null}
      type="button"
      variant="ghost"
      onClick={() => activate(item)}
      className={cn(
        "flex w-full items-center gap-2 px-3 py-2 text-left text-sm h-auto rounded-none justify-start",
        isActive ? "bg-primary/10 hover:bg-primary/10" : "hover:bg-muted"
      )}
    >
      {children}
      {hint && <span className="ml-auto shrink-0 text-xs text-muted-foreground">{hint}</span>}
    </Button>
  );
}

function CommandPaletteResults({ query, filteredApps, actions, idx, activate, highlightRef }) {
  if (query) {
    return (
      <>
        <SectionHeader label="Applications" />
        {filteredApps.length === 0
          ? <p className="px-3 py-2 text-sm text-muted-foreground">No results.</p>
          : filteredApps.map((app, i) => (
              <PaletteRow key={app.id} item={{ type: "app", ...app }} isActive={idx === i} activate={activate} highlightRef={highlightRef}>
                <span className="font-semibold text-foreground">{app.company}</span>
                <span className="min-w-0 truncate text-muted-foreground">{app.role_title}</span>
                <StageBadge stage={app.current_stage} />
              </PaletteRow>
            ))}
      </>
    );
  }
  return (
    <>
      <SectionHeader label="Navigation" />
      {NAV_ITEMS.map((item, i) => (
        <PaletteRow key={item.id} item={item} isActive={idx === i} activate={activate} highlightRef={highlightRef} hint={item.hint}>
          <span className="text-foreground">{item.label}</span>
        </PaletteRow>
      ))}
      <SectionHeader label="Actions" />
      {actions.map((item, i) => (
        <PaletteRow key={item.id} item={item} isActive={idx === NAV_ITEMS.length + i} activate={activate} highlightRef={highlightRef}>
          <span className="text-foreground">{item.label}</span>
        </PaletteRow>
      ))}
    </>
  );
}

function CommandPaletteDialog({ query, setQuery, filteredApps, actions, idx, activate, close, highlightRef }) {
  return (
    <>
      <div className="fixed inset-0 z-40 cursor-pointer bg-black/30 backdrop-blur-sm" onClick={close} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        className="fixed left-1/2 top-[20%] z-50 -translate-x-1/2 w-full max-w-xl overflow-hidden bg-card rounded-2xl border border-border shadow-lg"
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <SearchIcon className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            autoFocus
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search applications or type a command…"
            className="w-full bg-transparent py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none"
          />
        </div>
        <div className="max-h-80 overflow-y-auto py-1">
          <CommandPaletteResults
            query={query} filteredApps={filteredApps} actions={actions}
            idx={idx} activate={activate} highlightRef={highlightRef}
          />
        </div>
      </div>
    </>
  );
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
  useEffect(() => {
    const t = setTimeout(() => setDebQuery(query), PALETTE_DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query]);
  const env = useApplications({ limit: PALETTE_CLIENT_LIMIT }).data;
  const filteredApps = useCommandPaletteSearch({ query, debQuery, env });
  const actions = useCommandPaletteActions({ setFormOpen, cycleTheme });
  const items = useMemo(() => query ? filteredApps.map((a) => ({ type: "app", ...a })) : [...NAV_ITEMS, ...actions], [query, filteredApps, actions]);
  useEffect(() => { setIdx(0); }, [items]);
  useEffect(() => { highlightRef.current?.scrollIntoView?.({ block: "nearest" }); }, [idx]);
  const close = useCallback(() => { setIsOpen(false); setQuery(""); }, []);
  const activate = useCallback((item) => {
    if (item.type === "app") navigate(`/dashboard?selected=${item.id}`);
    else if (item.type === "nav") navigate(item.path);
    else if (item.type === "action") item.fn();
    close();
  }, [navigate, close]);
  useCommandPaletteKeyboard({ isOpen, setIsOpen, items, idx, setIdx, activate, close });
  return (
    <>
      <ManualAddForm isOpen={formOpen} onClose={() => setFormOpen(false)} />
      {isOpen && <CommandPaletteDialog query={query} setQuery={setQuery} filteredApps={filteredApps} actions={actions} idx={idx} activate={activate} close={close} highlightRef={highlightRef} />}
    </>
  );
}

export default CommandPalette;
