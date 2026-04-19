/** Hook: action items for the command palette (add form, export CSV, theme toggle). */

import { useMemo } from "react";

import { exportApplicationsCsv } from "../api/applications";

async function downloadCsvFile() {
  const blob = await exportApplicationsCsv();
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement("a"), { href: url, download: "applications.csv" }).click();
  URL.revokeObjectURL(url);
}

/** Returns the static action items array for the command palette. */
export function useCommandPaletteActions({ setFormOpen, cycleTheme }) {
  return useMemo(() => [
    { id: "action-add",    type: "action", label: "Add Application",  fn: () => setFormOpen(true) },
    { id: "action-export", type: "action", label: "Export CSV",        fn: downloadCsvFile },
    { id: "action-theme",  type: "action", label: "Toggle Dark Mode", fn: cycleTheme },
  ], [setFormOpen, cycleTheme]);
}
