/** Two-column settings shell — left sub-nav and scrollable content area. */

import { Outlet } from "react-router-dom";

import SettingsNav from "./SettingsNav";

function SettingsLayout() {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <header className="shrink-0 border-b border-border-1 px-6 py-6">
        <h1 className="text-display-md text-text-1">Settings</h1>
      </header>
      <div className="flex min-h-0 flex-1">
        <SettingsNav />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto max-w-[720px] px-6 py-8">
            <Outlet />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsLayout;
