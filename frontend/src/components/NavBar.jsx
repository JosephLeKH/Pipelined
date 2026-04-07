/** Top navigation bar shared across protected pages. */

import { useCallback } from "react";
import { Link, useLocation } from "react-router-dom";

import BarChart2 from "lucide-react/dist/esm/icons/bar-chart-2";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import Moon from "lucide-react/dist/esm/icons/moon";
import Sun from "lucide-react/dist/esm/icons/sun";
import Monitor from "lucide-react/dist/esm/icons/monitor";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", Icon: CalendarDays },
  { to: "/analytics", label: "Analytics", Icon: BarChart2 },
];

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon };
const THEME_LABELS = { system: "System theme", light: "Light theme", dark: "Dark theme" };

function NavBar() {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const { theme, cycleTheme } = useTheme();

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const ThemeIcon = THEME_ICONS[theme];

  return (
    <nav
      aria-label="Main navigation"
      className="flex items-center gap-6 border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-800"
    >
      <span className="mr-2 text-base font-bold text-blue-600 tracking-tight">Pipelined</span>
      <div className="flex items-center gap-1">
        {NAV_LINKS.map(({ to, label, Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </div>
      <button
        type="button"
        onClick={cycleTheme}
        aria-label={THEME_LABELS[theme]}
        className="ml-auto rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
      >
        <ThemeIcon className="h-4 w-4" />
      </button>
      <button
        type="button"
        onClick={handleLogout}
        aria-label="Log out"
        className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </nav>
  );
}

export default NavBar;
