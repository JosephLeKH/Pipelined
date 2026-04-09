/** Top navigation bar shared across protected pages. */

import { useCallback, useState } from "react";
import { Link, useLocation } from "react-router-dom";

import Activity from "lucide-react/dist/esm/icons/activity";
import BarChart2 from "lucide-react/dist/esm/icons/bar-chart-2";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import LogOut from "lucide-react/dist/esm/icons/log-out";
import Menu from "lucide-react/dist/esm/icons/menu";
import Moon from "lucide-react/dist/esm/icons/moon";
import Settings from "lucide-react/dist/esm/icons/settings";
import Sun from "lucide-react/dist/esm/icons/sun";
import Monitor from "lucide-react/dist/esm/icons/monitor";
import X from "lucide-react/dist/esm/icons/x";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import NotificationBell from "./NotificationBell";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", Icon: CalendarDays },
  { to: "/analytics", label: "Analytics", Icon: BarChart2 },
  { to: "/activity", label: "Activity", Icon: Activity },
  { to: "/settings", label: "Settings", Icon: Settings },
];

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon };
const THEME_LABELS = { system: "System theme", light: "Light theme", dark: "Dark theme" };

function NavBar() {
  const { pathname } = useLocation();
  const { logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  const ThemeIcon = THEME_ICONS[theme];

  return (
    <nav
      aria-label="Main navigation"
      className="border-b border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="flex items-center gap-4 px-6 py-3">
        <span className="mr-2 text-base font-bold tracking-tight text-blue-600">Pipelined</span>

        {/* Desktop nav links — hidden on mobile */}
        <div className="hidden items-center gap-1 md:flex">
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

        {/* Desktop theme + logout — hidden on mobile */}
        <div className="ml-auto hidden items-center gap-2 md:flex">
          <NotificationBell />
          <button
            type="button"
            onClick={cycleTheme}
            aria-label={THEME_LABELS[theme]}
            className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
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
        </div>

        {/* Mobile hamburger — visible only below md breakpoint */}
        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={mobileMenuOpen}
          className="ml-auto rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100 md:hidden"
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile slide-down menu */}
      {mobileMenuOpen && (
        <div
          data-testid="mobile-nav-menu"
          className="flex flex-col gap-1 border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800 md:hidden"
        >
          {NAV_LINKS.map(({ to, label, Icon }) => {
            const active = pathname === to;
            return (
              <Link
                key={to}
                to={to}
                onClick={closeMobileMenu}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300"
                    : "text-gray-700 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-gray-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
          <div className="mt-2 flex items-center gap-2 border-t border-gray-100 pt-2 dark:border-gray-700">
            <button
              type="button"
              onClick={cycleTheme}
              aria-label={THEME_LABELS[theme]}
              className="rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
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
          </div>
        </div>
      )}
    </nav>
  );
}

export default NavBar;
