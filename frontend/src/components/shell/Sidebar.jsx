/** Left navigation rail — logo, workspace/account groups, user footer. */

import { useCallback, useMemo } from "react";
import { useLocation } from "react-router-dom";

import Activity from "lucide-react/dist/esm/icons/activity";
import BarChart2 from "lucide-react/dist/esm/icons/bar-chart-2";
import Briefcase from "lucide-react/dist/esm/icons/briefcase";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import Inbox from "lucide-react/dist/esm/icons/inbox";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import Settings from "lucide-react/dist/esm/icons/settings";
import Sun from "lucide-react/dist/esm/icons/sun";
import TagIcon from "lucide-react/dist/esm/icons/tag";
import Trophy from "lucide-react/dist/esm/icons/trophy";

import { useAuth } from "../../context/AuthContext";
import { resetUser } from "../../lib/analytics";
import { OFFER_STAGE } from "../../lib/constants";
import { cn } from "../../lib/utils";
import { useApplications } from "../../hooks/useApplications";
import { usePendingOpportunities } from "../../hooks/usePendingOpportunities";
import SidebarGroup from "./SidebarGroup";
import SidebarLogo from "./SidebarLogo";
import SidebarUserMenu from "./SidebarUserMenu";

const WORKSPACE_ITEMS = [
  { id: "today", to: "/today", label: "Today", icon: Sun },
  { id: "inbox", to: "/inbox/pending", label: "Inbox", icon: Inbox, badgeKey: "pending", matchPrefix: "/inbox" },
  { id: "dashboard", to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "jobs", to: "/jobs", label: "Job Board", icon: Briefcase },
  { id: "calendar", to: "/calendar", label: "Calendar", icon: CalendarDays },
  { id: "analytics", to: "/analytics", label: "Analytics", icon: BarChart2 },
  { id: "activity", to: "/activity", label: "Activity", icon: Activity },
  { id: "tags", to: "/tags", label: "Tags", icon: TagIcon },
];

const ACCOUNT_ITEMS = [
  { id: "settings", to: "/settings", label: "Settings", icon: Settings },
];

function Sidebar({ collapsed, onOpenCopilot, mobile = false }) {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { data: offersData } = useApplications({ stage: OFFER_STAGE, limit: 1 });
  const { data: pendingOpportunities } = usePendingOpportunities();
  const hasOffers = (offersData?.data?.length ?? 0) > 0;
  const pendingCount = pendingOpportunities?.length ?? 0;
  const badgeCounts = useMemo(() => ({ pending: pendingCount }), [pendingCount]);

  const workspaceItems = useMemo(() => {
    if (!hasOffers) return WORKSPACE_ITEMS;
    const offersItem = { id: "offers", to: "/offers", label: "Offers", icon: Trophy };
    return [...WORKSPACE_ITEMS.slice(0, 3), offersItem, ...WORKSPACE_ITEMS.slice(3)];
  }, [hasOffers]);

  const handleLogout = useCallback(async () => {
    resetUser();
    await logout();
  }, [logout]);

  return (
    <aside
      aria-label="Main navigation"
      data-collapsed={collapsed}
      className={cn(
        "grid shrink-0 overflow-hidden border-r border-border-1 bg-surface-1",
        "grid-rows-[auto_minmax(0,1fr)_auto]",
        mobile ? "h-full w-full" : "hidden motion-safe-sidebar h-dvh md:grid",
        !mobile && (collapsed ? "w-14" : "w-60"),
      )}
    >
      <SidebarLogo collapsed={collapsed} user={user} onLogout={handleLogout} />
      <nav className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        <SidebarGroup
          label="Workspace"
          items={workspaceItems}
          pathname={pathname}
          collapsed={collapsed}
          badgeCounts={badgeCounts}
          onOpenCopilot={onOpenCopilot}
        />
        <SidebarGroup
          label="Account"
          items={ACCOUNT_ITEMS}
          pathname={pathname}
          collapsed={collapsed}
          badgeCounts={badgeCounts}
          onOpenCopilot={onOpenCopilot}
        />
      </nav>
      <SidebarUserMenu collapsed={collapsed} />
    </aside>
  );
}

export default Sidebar;
