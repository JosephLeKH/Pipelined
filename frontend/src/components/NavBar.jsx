/** Top navigation bar shared across protected pages. */

import { useCallback, useMemo, useState } from "react";
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
import TagIcon from "lucide-react/dist/esm/icons/tag";
import Trophy from "lucide-react/dist/esm/icons/trophy";
import Monitor from "lucide-react/dist/esm/icons/monitor";
import X from "lucide-react/dist/esm/icons/x";
import User from "lucide-react/dist/esm/icons/user";

import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { resetUser, trackEvent } from "../lib/analytics";
import { useApplications } from "../hooks/useApplications";
import { OFFER_STAGE } from "../lib/constants";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Button } from "./ui/button";
import NotificationBell from "./NotificationBell";

const NAV_LINKS = [
  { to: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { to: "/calendar", label: "Calendar", Icon: CalendarDays },
  { to: "/analytics", label: "Analytics", Icon: BarChart2 },
  { to: "/activity", label: "Activity", Icon: Activity },
  { to: "/tags", label: "Tags", Icon: TagIcon },
  { to: "/settings", label: "Settings", Icon: Settings },
];

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon };
const THEME_LABELS = { system: "System theme", light: "Light theme", dark: "Dark theme" };

const NAV_LINK = "text-muted-foreground hover:text-foreground text-sm font-display font-medium transition-colors px-3 py-2 rounded-md";
const NAV_LINK_ACTIVE = "text-primary text-sm font-display font-semibold px-3 py-2 rounded-md";

function UserAvatar({ user }) {
  if (user?.avatar_url) {
    return <img src={user.avatar_url} alt={user.display_name ?? "Profile"} className="h-8 w-8 rounded-full object-cover" />;
  }
  const seed = user?.display_name ?? user?.email ?? "U";
  const initial = (seed[0] ?? "U").toUpperCase();
  return (
    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{initial}</span>
  );
}

function DesktopNavLinks({ navLinks, pathname }) {
  return (
    <div className="hidden items-center gap-1 md:flex">
      {navLinks.map(({ to, label, Icon }) => {
        const active = pathname === to;
        return (
          <Link key={to} to={to} aria-current={active ? "page" : undefined} className={`flex items-center gap-1.5 ${active ? NAV_LINK_ACTIVE : NAV_LINK}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
    </div>
  );
}

function UserMenu({ user, handleLogout }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="User menu"
          className="rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <UserAvatar user={user} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col gap-0.5">
            <p className="text-sm font-medium leading-none">{user?.display_name ?? user?.email ?? "Account"}</p>
            {user?.email && user?.display_name && (
              <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/settings" className="flex cursor-pointer items-center gap-2">
            <User className="h-4 w-4" aria-hidden="true" />
            Profile & Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleLogout}
          className="flex cursor-pointer items-center gap-2 text-destructive focus:text-destructive"
        >
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function DesktopActions({ user, ThemeIcon, theme, handleCycleTheme, handleLogout }) {
  return (
    <div className="ml-auto hidden items-center gap-2 md:flex">
      <NotificationBell />
      <Button type="button" variant="ghost" size="icon" onClick={handleCycleTheme} aria-label={THEME_LABELS[theme]}>
        <ThemeIcon className="h-4 w-4" aria-hidden="true" />
      </Button>
      <UserMenu user={user} handleLogout={handleLogout} />
    </div>
  );
}

function HamburgerButton({ mobileMenuOpen, setMobileMenuOpen }) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      onClick={() => setMobileMenuOpen((prev) => !prev)}
      aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
      aria-expanded={mobileMenuOpen}
      className="ml-auto md:hidden"
    >
      {mobileMenuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
    </Button>
  );
}

function MobileMenu({ navLinks, pathname, closeMobileMenu, ThemeIcon, theme, handleCycleTheme, handleLogout }) {
  return (
    <div data-testid="mobile-nav-menu" className="flex flex-col gap-1 border-t border-border bg-card px-4 py-3 md:hidden">
      {navLinks.map(({ to, label, Icon }) => {
        const active = pathname === to;
        return (
          <Link key={to} to={to} onClick={closeMobileMenu} aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 ${active ? NAV_LINK_ACTIVE : NAV_LINK}`}>
            <Icon className="h-4 w-4" aria-hidden="true" />
            {label}
          </Link>
        );
      })}
      <div className="mt-2 flex items-center gap-2 border-t border-border pt-2">
        <Button type="button" variant="ghost" size="icon" onClick={handleCycleTheme} aria-label={THEME_LABELS[theme]}>
          <ThemeIcon className="h-4 w-4" aria-hidden="true" />
        </Button>
        <Button type="button" variant="ghost" onClick={handleLogout} aria-label="Log out" className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Log out
        </Button>
      </div>
    </div>
  );
}

function NavBar() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const { theme, cycleTheme } = useTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: offersData } = useApplications({ stage: OFFER_STAGE, limit: 1 });
  const hasOffers = (offersData?.data?.length ?? 0) > 0;
  const offersLink = useMemo(() => ({ to: "/offers", label: "Offers", Icon: Trophy }), []);
  const navLinks = useMemo(() => (hasOffers ? [NAV_LINKS[0], offersLink, ...NAV_LINKS.slice(1)] : NAV_LINKS), [hasOffers, offersLink]);
  const handleCycleTheme = useCallback(() => { cycleTheme(); trackEvent("feature_used", { feature: "dark_mode" }); }, [cycleTheme]);
  const handleLogout = useCallback(async () => { resetUser(); await logout(); }, [logout]);
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);
  const ThemeIcon = THEME_ICONS[theme];

  return (
    <nav aria-label="Main navigation" className="bg-card border-b border-border">
      <div className="flex items-center gap-4 px-6 py-3">
        <span className="mr-2 text-foreground font-display font-semibold text-lg tracking-tight">Pipelined</span>
        <DesktopNavLinks navLinks={navLinks} pathname={pathname} />
        <DesktopActions user={user} ThemeIcon={ThemeIcon} theme={theme} handleCycleTheme={handleCycleTheme} handleLogout={handleLogout} />
        <HamburgerButton mobileMenuOpen={mobileMenuOpen} setMobileMenuOpen={setMobileMenuOpen} />
      </div>
      {mobileMenuOpen && <MobileMenu navLinks={navLinks} pathname={pathname} closeMobileMenu={closeMobileMenu} ThemeIcon={ThemeIcon} theme={theme} handleCycleTheme={handleCycleTheme} handleLogout={handleLogout} />}
    </nav>
  );
}

export default NavBar;
