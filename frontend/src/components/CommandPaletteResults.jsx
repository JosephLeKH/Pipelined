/** Command palette result rows — sections for actions, navigation, recent apps, settings. */

import { cn } from "../lib/utils";
import { STAGE_COLORS, DEFAULT_STAGE_COLOR } from "../lib/constants";
import { Button } from "./ui/button";

function SectionHeader({ label }) {
  return (
    <p className="sticky top-0 z-10 bg-surface-0 px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
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

function ShortcutHint({ hint }) {
  const keys = hint.split(/\s+/).filter(Boolean);
  return (
    <span
      className="ml-auto flex shrink-0 items-center gap-1"
      aria-label={`Shortcut: ${keys.join(" then ")}`}
    >
      {keys.map((key, i) => (
        <kbd
          key={i}
          className="rounded border border-border-1 bg-surface-1 px-1.5 py-0.5 font-mono text-[0.6875rem] text-text-2"
        >
          {key}
        </kbd>
      ))}
    </span>
  );
}

function PaletteRow({ item, isActive, activate, highlightRef, hint, children, isQuickAction }) {
  return (
    <Button
      ref={isActive ? highlightRef : null}
      type="button"
      role="option"
      aria-selected={isActive}
      variant="ghost"
      onClick={() => activate(item)}
      className={cn(
        "flex h-9 w-full items-center gap-2 rounded-none px-3 text-left text-[0.8125rem] justify-start",
        isActive ? "border-l-2 border-brand-600 bg-surface-2" : "hover:bg-surface-2",
        !isActive && isQuickAction && "bg-surface-1",
      )}
    >
      {children}
      {hint && <ShortcutHint hint={hint} />}
    </Button>
  );
}

function renderSectionRows({ items, startIndex, idx, activate, highlightRef, showHint = false, isQuickAction = false }) {
  return items.map((item, offset) => (
    <PaletteRow
      key={item.id}
      item={item}
      isActive={idx === startIndex + offset}
      activate={activate}
      highlightRef={highlightRef}
      hint={showHint ? item.hint : null}
      isQuickAction={isQuickAction}
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
    { label: "Quick actions", items: quickActions, isQuickAction: true },
    { label: "Navigation", items: navItems, showHint: true },
    ...(recentApps.length ? [{ label: "Recent applications", items: recentApps.map((app) => ({ type: "app", ...app })) }] : []),
    { label: "Settings shortcuts", items: settingsItems },
  ];

  return sections.map(({ label, items, showHint, isQuickAction }) => {
    const startIndex = cursor;
    cursor += items.length;
    if (!items.length) return null;
    return (
      <div key={label}>
        <SectionHeader label={label} />
        {renderSectionRows({ items, startIndex, idx, activate, highlightRef, showHint, isQuickAction })}
      </div>
    );
  });
}

export default CommandPaletteResults;
