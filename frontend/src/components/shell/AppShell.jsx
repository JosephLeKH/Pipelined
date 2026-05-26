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
import { OPEN_COPILOT_EVENT, OPEN_COMMAND_PALETTE_EVENT } from "../../lib/constants";
import { useHotkeys } from "../../hooks/useHotkeys";
import { useSidebarCollapsed } from "../../hooks/useSidebarCollapsed";
import MobileSidebar from "./MobileSidebar";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";

function AppShell() {
  const { collapsed } = useSidebarCollapsed();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);

  const openCopilot = useCallback(() => setCopilotOpen(true), []);
  const closeCopilot = useCallback(() => setCopilotOpen(false), []);

  useEffect(() => {
    const onOpenCopilot = () => setCopilotOpen(true);
    window.addEventListener(OPEN_COPILOT_EVENT, onOpenCopilot);
    return () => window.removeEventListener(OPEN_COPILOT_EVENT, onOpenCopilot);
  }, []);

  useHotkeys("o", openCopilot);

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
      <div className="flex h-dvh flex-col overflow-hidden bg-surface-0">
        <EmailVerificationBanner />
        <OfflineBanner />
        <div className="flex min-h-0 flex-1">
          <Sidebar collapsed={collapsed} onOpenCopilot={openCopilot} />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar onToggleMobileSidebar={() => setMobileOpen(true)} />
            <div className="flex-1 overflow-auto">
              <Outlet />
            </div>
          </div>
        </div>
      </div>
      <MobileSidebar open={mobileOpen} onOpenChange={setMobileOpen} onOpenCopilot={openCopilot} />
      <CoPilotPanel open={copilotOpen} onClose={closeCopilot} />
      <CommandPalette />
      <ShortcutHelp />
      <UpgradePlanModal />
      <FeedbackWidget />
    </>
  );
}

export default AppShell;
