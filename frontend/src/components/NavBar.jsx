/** Top navigation bar shared across protected pages. */

import { useCallback } from "react";
import { Link, useLocation } from "react-router-dom";

import BarChart2 from "lucide-react/dist/esm/icons/bar-chart-2";
import CalendarDays from "lucide-react/dist/esm/icons/calendar-days";
import LayoutDashboard from "lucide-react/dist/esm/icons/layout-dashboard";
import LogOut from "lucide-react/dist/esm/icons/log-out";

import { useAuth } from "../context/AuthContext";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", Icon: CalendarDays },
  { to: "/analytics", label: "Analytics", Icon: BarChart2 },
];

function NavBar() {
  const { pathname } = useLocation();
  const { logout } = useAuth();

  const handleLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  return (
    <nav
      aria-label="Main navigation"
      className="flex items-center gap-6 border-b border-gray-200 bg-white px-6 py-3"
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
                  ? "bg-blue-50 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
        onClick={handleLogout}
        aria-label="Log out"
        className="ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      >
        <LogOut className="h-4 w-4" />
        Log out
      </button>
    </nav>
  );
}

export default NavBar;
