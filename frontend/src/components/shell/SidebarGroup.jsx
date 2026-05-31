/** Sidebar nav group label + list of SidebarNavItem rows. */

import Bot from "lucide-react/dist/esm/icons/bot";

import SidebarNavItem from "./SidebarNavItem";
import { isRouteActive } from "../../lib/routeMeta";

function SidebarGroup({ label, items, pathname, collapsed, badgeCounts, onOpenCopilot }) {
  // For Workspace group, insert Co-pilot right after Today (position 1)
  const displayItems = label === "Workspace"
    ? [
        items[0], // Today
        { id: "copilot", label: "Co-pilot", icon: Bot, onClick: onOpenCopilot, isCopilot: true },
        ...items.slice(1)
      ]
    : items;

  return (
    <div className="px-2 py-1">
      {!collapsed && (
        <p className="px-2 pb-1 pt-2 text-xs font-semibold uppercase tracking-wider text-text-2">
          {label}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        {displayItems.map((item) => (
          <SidebarNavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            sublabel={item.sublabel}
            to={item.to}
            onClick={item.onClick}
            badge={item.badgeKey ? badgeCounts[item.badgeKey] : undefined}
            active={item.to ? isRouteActive(pathname, item.to, item.matchPrefix) : false}
            collapsed={collapsed}
          />
        ))}
      </div>
    </div>
  );
}

export default SidebarGroup;
