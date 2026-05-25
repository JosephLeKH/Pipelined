/** Hook: settings shortcut items for the command palette (theme, settings sections). */

import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

import { useTheme } from "../context/ThemeContext";

/** Returns settings shortcut items for the command palette. */
export function useCommandPaletteSettings() {
  const navigate = useNavigate();
  const { setTheme } = useTheme();

  return useMemo(
    () => [
      { id: "theme-light", type: "action", label: "Theme: Light", fn: () => setTheme("light") },
      { id: "theme-dark", type: "action", label: "Theme: Dark", fn: () => setTheme("dark") },
      { id: "theme-system", type: "action", label: "Theme: System", fn: () => setTheme("system") },
      {
        id: "settings-pipeline",
        type: "action",
        label: "Pipeline stages…",
        fn: () => navigate("/settings?section=pipeline"),
      },
      {
        id: "settings-integrations",
        type: "action",
        label: "Integrations…",
        fn: () => navigate("/settings?section=integrations"),
      },
    ],
    [navigate, setTheme],
  );
}
