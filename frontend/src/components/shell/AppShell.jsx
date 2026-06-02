/** Authenticated app layout — sidebar, top bar, outlet, global overlays. */

import { useCallback, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";

import CommandPalette from "../CommandPalette";
import CoPilotPanel from "../CoPilotPanel";
import EmailVerificationBanner from "../EmailVerificationBanner";
import FeedbackWidget from "../FeedbackWidget";
import OfflineBanner from "../OfflineBanner";
import ShortcutHelp from "../ShortcutHelp";
import UpgradePlanModal from "../UpgradePlanModal";
import WhatsNewScoutModal from "../WhatsNewScoutModal";
import { OPEN_COPILOT_EVENT, OPEN_COMMAND_PALETTE_EVENT } from "../../lib/constants";
import { useHotkeys } from "../../hooks/useHotkeys";
import { useCopilotDocked } from "../../hooks/useCopilotDocked";
import { useCopilotWidth } from "../../hooks/useCopilotWidth";
import { useSidebarCollapsed } from "../../hooks/useSidebarCollapsed";
import { useSidebarWidth } from "../../hooks/useSidebarWidth";
import CopilotDockTab from "./CopilotDockTab";
import CopilotResizeHandle from "./CopilotResizeHandle";
import MobileSidebar from "./MobileSidebar";
import Sidebar from "./Sidebar";
import SidebarResizeHandle from "./SidebarResizeHandle";
import TopBar from "./TopBar";

function AppShell() {
  const { collapsed } = useSidebarCollapsed();
  const { width, setWidth } = useSidebarWidth();
  const { open: copilotOpen, setOpen: setCopilotOpen, toggle: toggleCopilot } = useCopilotDocked();
  const { width: copilotWidth, setWidth: setCopilotWidth } = useCopilotWidth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const closeCopilot = useCallback(() => setCopilotOpen(false), [setCopilotOpen]);

  useEffect(() => {
    const onOpenCopilot = () => setCopilotOpen(true);
    window.addEventListener(OPEN_COPILOT_EVENT, onOpenCopilot);
    return () => window.removeEventListener(OPEN_COPILOT_EVENT, onOpenCopilot);
  }, [setCopilotOpen]);

  useHotkeys("o", toggleCopilot);

  useEffect(() => {
    const ignored = new Set(["INPUT", "TEXTAREA", "SELECT"]);
    const handler = (event) => {
      const target = event.target;
      if (ignored.has(target.tagName) || target.isContentEditable) return;
      if (event.key === "/") {
        event.preventDefault();
        window.dispatchEvent(new CustomEvent(OPEN_COMMAND_PALETTE_EVENT));
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  return (
    <>
      <div className="flex h-dvh overflow-hidden bg-surface-0">
        <Sidebar collapsed={collapsed} width={width} onOpenCopilot={toggleCopilot} />
        {!collapsed && <SidebarResizeHandle width={width} onResize={setWidth} />}
        <div className="flex min-w-0 flex-1 flex-col">
          <EmailVerificationBanner />
          <OfflineBanner />
          <TopBar onToggleMobileSidebar={() => setMobileOpen(true)} />
          <div className="flex-1 overflow-auto">
            <Outlet />
          </div>
        </div>
        {copilotOpen && (
          <CopilotResizeHandle
            width={copilotWidth}
            onResize={setCopilotWidth}
            onCloseRequest={closeCopilot}
          />
        )}
        <CoPilotPanel open={copilotOpen} onClose={closeCopilot} width={copilotWidth} />
        <CopilotDockTab open={copilotOpen} onToggle={toggleCopilot} />
      </div>
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} onOpenCopilot={toggleCopilot} />
      <CommandPalette />
      <ShortcutHelp />
      <UpgradePlanModal />
      <FeedbackWidget />
      <WhatsNewScoutModal />
    </>
  );
}

export default AppShell;
