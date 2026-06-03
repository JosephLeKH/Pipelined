/** Hook: quick action items for the command palette (add, import, co-pilot, mock interview). */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { OPEN_COPILOT_EVENT } from "../lib/constants";
import { getRecentApplicationIds } from "../lib/recentApplications";

function openCopilot() {
  window.dispatchEvent(new CustomEvent(OPEN_COPILOT_EVENT));
}

function startMockInterview(navigate) {
  const recentId = getRecentApplicationIds()[0];
  if (recentId) {
    navigate(`/applications/${recentId}`);
    return;
  }
  navigate("/dashboard");
}

/** Returns quick action items for the command palette. */
export function useCommandPaletteActions({ setFormOpen, setImportOpen }) {
  const navigate = useNavigate();

  return useMemo(
    () => [
      { id: "action-add", type: "action", label: "Add Application", fn: () => setFormOpen(true) },
      { id: "action-import", type: "action", label: "Import CSV", fn: () => setImportOpen(true) },
      { id: "action-copilot", type: "action", label: "Open Scout", fn: openCopilot },
      {
        id: "action-mock",
        type: "action",
        label: "Start mock interview",
        fn: () => startMockInterview(navigate),
      },
    ],
    [navigate, setFormOpen, setImportOpen],
  );
}
