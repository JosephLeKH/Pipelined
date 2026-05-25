/** Command palette result rows — sections for actions, navigation, recent apps, settings. */

import { cn } from "../lib/utils";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { Button } from "./ui/button";

function SectionHeader({ label }) {
  return (
    <p className="sticky top-0 z-10 bg-surface-0 px-3 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.06em] text-text-3">
      {label}
    </p>
  );
}

function StageBadge({ stage }) {
  const c = STAGE_COLORS[stage] ?? DEFAULT_STAGE_COLOR;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${c.bg} ${c.text}`}>
      {stage}
    </span>
  );
}

function PaletteRow({ item, isActive, activate, highlightRef, hint, children }) {
  return (
    <Button
      ref={isActive ? highlightRef : null}
      type="button"
      role="option"
      aria-selected={isActive}
      variant="ghost"
      onClick={() => activate(item)}
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-none px-3 text-left text-[13px] justify-start",
        isActive ? "border-l-2 border-brand-600 bg-surface-2" : "hover:bg-surface-2",
      )}
    >
      {children}
      {hint && <span className="ml-auto shrink-0 font-mono text-xs text-text-3">{hint}</span>}
    </Button>
  );
}

function renderSectionRows({ items, startIndex, idx, activate, highlightRef, showHint = false }) {
  return items.map((item, offset) => (
    <PaletteRow
      key={item.id}
      item={item}
      isActive={idx === startIndex + offset}
      activate={activate}
      highlightRef={highlightRef}
      hint={showHint ? item.hint : null}
    >
      <span className="text-text-1">{item.label ?? item.company}</span>
      {item.role_title && (
        <span className="min-w-0 truncate text-text-3">{item.role_title}</span>
      )}
      {item.current_stage && <StageBadge stage={item.current_stage} />}
    </PaletteRow>
  ));
}

export function CommandPaletteResults({
  query,
  filteredApps,
  quickActions,
  navItems,
  recentApps,
  settingsItems,
  idx,
  activate,
  highlightRef,
}) {
  if (query) {
    return (
      <>
        <SectionHeader label="Applications" />
        {filteredApps.length === 0 ? (
          <p className="px-3 py-2 text-sm text-text-3">No results.</p>
        ) : (
          filteredApps.map((app, i) => (
            <PaletteRow
              key={app.id}
              item={{ type: "app", ...app }}
              isActive={idx === i}
              activate={activate}
              highlightRef={highlightRef}
            >
              <span className="font-semibold text-text-1">{app.company}</span>
              <span className="min-w-0 truncate text-text-3">{app.role_title}</span>
              <StageBadge stage={app.current_stage} />
            </PaletteRow>
          ))
        )}
      </>
    );
  }

  let cursor = 0;
  const sections = [
    { label: "Quick actions", items: quickActions },
    { label: "Navigation", items: navItems, showHint: true },
    ...(recentApps.length ? [{ label: "Recent applications", items: recentApps.map((app) => ({ type: "app", ...app })) }] : []),
    { label: "Settings shortcuts", items: settingsItems },
  ];

  return sections.map(({ label, items, showHint }) => {
    const startIndex = cursor;
    cursor += items.length;
    if (!items.length) return null;
    return (
      <div key={label}>
        <SectionHeader label={label} />
        {renderSectionRows({ items, startIndex, idx, activate, highlightRef, showHint })}
      </div>
    );
  });
}

export default CommandPaletteResults;
