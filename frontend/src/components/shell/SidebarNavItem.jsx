/** One sidebar row: icon, label, optional badge, active state, collapsed tooltip. */

import { Link } from "react-router-dom";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "../ui/tooltip";
import { cn } from "../../lib/utils";
import { SIDEBAR_TOOLTIP_DELAY_MS } from "../../lib/constants";

function SidebarBadge({ count }) {
  if (!count) return null;
  return (
    <span
      aria-label={`${count} pending`}
      className="ml-auto inline-flex h-4 min-w-[1rem] items-center justify-center rounded px-1.5 text-[11px] font-medium text-text-2 bg-surface-3"
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}

function SidebarNavItemInner({ icon: Icon, label, badge, active, collapsed, onClick, to }) {
  const rowClass = cn(
    "group/nav relative flex h-8 w-full items-center gap-2 rounded-md px-2 text-[13px] text-text-2",
    "hover:bg-surface-2 hover:text-text-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:focus-visible:ring-1",
    active && "bg-surface-2 text-brand-600",
    collapsed && "justify-center px-0",
  );

  const content = (
    <>
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-full bg-brand-600"
        />
      )}
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {!collapsed && <span className="truncate">{label}</span>}
      {!collapsed && badge ? <SidebarBadge count={badge} /> : null}
    </>
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-current={active ? "page" : undefined} className={rowClass}>
        {content}
      </button>
    );
  }

  return (
    <Link to={to} aria-current={active ? "page" : undefined} className={rowClass}>
      {content}
    </Link>
  );
}

function SidebarNavItem(props) {
  if (!props.collapsed) {
    return <SidebarNavItemInner {...props} />;
  }

  return (
    <Tooltip delayDuration={SIDEBAR_TOOLTIP_DELAY_MS}>
      <TooltipTrigger asChild>
        <SidebarNavItemInner {...props} />
      </TooltipTrigger>
      <TooltipContent side="right">{props.label}</TooltipContent>
    </Tooltip>
  );
}

export default SidebarNavItem;
