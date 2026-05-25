/** Maps pathname to page title, icon, and keyboard chord for the app shell. */

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

export const ROUTE_META = {
  "/today": { title: "Today", icon: Sun, chord: "g t", group: "workspace" },
  "/inbox/pending": { title: "Inbox", icon: Inbox, chord: "g i", group: "workspace", matchPrefix: "/inbox" },
  "/dashboard": { title: "Dashboard", icon: LayoutDashboard, chord: "g d", group: "workspace" },
  "/jobs": { title: "Job Board", icon: Briefcase, chord: "g j", group: "workspace" },
  "/calendar": { title: "Calendar", icon: CalendarDays, chord: "g c", group: "workspace" },
  "/analytics": { title: "Analytics", icon: BarChart2, chord: "g a", group: "workspace" },
  "/activity": { title: "Activity", icon: Activity, group: "workspace" },
  "/tags": { title: "Tags", icon: TagIcon, group: "workspace" },
  "/offers": { title: "Offers", icon: Trophy, group: "workspace" },
  "/settings": { title: "Settings", icon: Settings, chord: "g s", group: "account" },
};

/** Returns the page title for a pathname, or null if not in the map. */
export function getRouteTitle(pathname) {
  if (ROUTE_META[pathname]) return ROUTE_META[pathname].title;
  const prefixMatch = Object.values(ROUTE_META).find(
    (meta) => meta.matchPrefix && pathname.startsWith(meta.matchPrefix),
  );
  return prefixMatch?.title ?? null;
}

/** Returns whether a nav item path matches the current route. */
export function isRouteActive(pathname, path, matchPrefix) {
  if (pathname === path) return true;
  if (matchPrefix && pathname.startsWith(matchPrefix)) return true;
  return false;
}
