/** Top header — page title, search trigger, notifications, theme, avatar. */

import { useCallback } from "react";
import { useLocation } from "react-router-dom";

import Menu from "lucide-react/dist/esm/icons/menu";
import Monitor from "lucide-react/dist/esm/icons/monitor";
import Moon from "lucide-react/dist/esm/icons/moon";
import Search from "lucide-react/dist/esm/icons/search";
import Sun from "lucide-react/dist/esm/icons/sun";

import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
import { OPEN_COMMAND_PALETTE_EVENT, OPEN_COPILOT_EVENT } from "../../lib/constants";
import { getRouteTitle } from "../../lib/routeMeta";
import { getModKeyLabel } from "../../lib/platform";
import { trackEvent } from "../../lib/analytics";
import NotificationBell from "../NotificationBell";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import TopBarScoutMenu from "./TopBarScoutMenu";
import TopBarUserMenu from "./TopBarUserMenu";

const THEME_ICONS = { system: Monitor, light: Sun, dark: Moon };
const THEME_NEXT_STATE = { system: "light", light: "dark", dark: "system" };
const THEME_TOOLTIPS = { system: "Switch to light theme", light: "Switch to dark theme", dark: "Switch to system theme" };

function SearchTrigger() {
  const modKey = getModKeyLabel();

  const openPalette = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
  }, []);

  return (
    <button
      type="button"
      onClick={openPalette}
      aria-label="Search or jump to"
      className="hidden h-8 w-60 items-center gap-2 rounded-md border border-border-1 bg-surface-1 px-2.5 text-sm text-text-3 hover:bg-surface-2 md:flex focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:focus-visible:ring-1"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="truncate">Search or jump to… {modKey}K</span>
    </button>
  );
}

function CmdKPill() {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      aria-label="Search or jump to"
      onClick={() => window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT))}
      className="md:hidden h-8 w-8 flex items-center gap-1 px-2"
    >
      <Search className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span className="text-xs text-text-2">Search</span>
    </Button>
  );
}

function TopBar({ onToggleMobileSidebar }) {
  const { pathname } = useLocation();
  const { theme, cycleTheme } = useTheme();
  const { user } = useAuth();
  const ThemeIcon = THEME_ICONS[theme];
  const title = getRouteTitle(pathname) ?? "Pipelined";

  const handleCycleTheme = useCallback(() => {
    cycleTheme();
    trackEvent("feature_used", { feature: "dark_mode" });
  }, [cycleTheme]);

  return (
    <header className="sticky top-0 z-30 flex h-11 shrink-0 items-center gap-3 border-b border-border-1 bg-surface-0 px-4">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onToggleMobileSidebar}
        aria-label="Toggle sidebar"
        className="md:hidden"
      >
        <Menu className="h-5 w-5" aria-hidden="true" />
      </Button>
      <h1 className="truncate text-sm font-semibold text-text-1">{title}</h1>
      <div className="ml-auto flex items-center gap-1.5">
        <SearchTrigger />
        <CmdKPill />
        <NotificationBell />
        <Tooltip delayDuration={200}>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleCycleTheme}
              className="text-text-2 hover:text-text-1"
            >
              <ThemeIcon className="h-4 w-4" aria-hidden="true" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="bottom">{THEME_TOOLTIPS[theme]}</TooltipContent>
        </Tooltip>
        <TopBarScoutMenu
          hasNew={false}
          onAskScout={() => window.dispatchEvent(new CustomEvent(OPEN_COPILOT_EVENT))}
        />
        <TopBarUserMenu user={user} />
      </div>
    </header>
  );
}

export default TopBar;
