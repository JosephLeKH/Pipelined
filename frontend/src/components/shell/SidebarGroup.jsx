/** Sidebar nav group label + list of SidebarNavItem rows. */

import Bot from "lucide-react/dist/esm/icons/bot";

import SidebarNavItem from "./SidebarNavItem";
import { isRouteActive } from "../../lib/routeMeta";

function SidebarGroup({ label, items, pathname, collapsed, badgeCounts, onOpenCopilot }) {
  return (
    <div className="px-2 py-1">
      {!collapsed && (
        <p className="px-2 pb-1 pt-2 text-[0.6875rem] font-medium uppercase tracking-[0.06em] text-text-3">
          {label}
        </p>
      )}
      <div className="flex flex-col gap-0.5">
        {items.map((item) => (
          <SidebarNavItem
            key={item.id}
            icon={item.icon}
            label={item.label}
            to={item.to}
            onClick={item.onClick}
            badge={item.badgeKey ? badgeCounts[item.badgeKey] : undefined}
            active={item.to ? isRouteActive(pathname, item.to, item.matchPrefix) : false}
            collapsed={collapsed}
          />
        ))}
        {label === "Account" && (
          <SidebarNavItem
            icon={Bot}
            label="Open Co-pilot"
            onClick={onOpenCopilot}
            active={false}
            collapsed={collapsed}
          />
        )}
      </div>
    </div>
  );
}

export default SidebarGroup;
