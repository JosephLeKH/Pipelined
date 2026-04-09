/** Keyboard shortcut registry — source of truth for registrations and ShortcutHelp display. */

export const CHORD_TIMEOUT_MS = 500;

export const SHORTCUTS = [
  // Global
  { key: "?",     label: "?",     description: "Show keyboard shortcuts", scope: "Global" },
  { key: "g d",   label: "g → d", description: "Go to Dashboard",         scope: "Global" },
  { key: "g c",   label: "g → c", description: "Go to Calendar",          scope: "Global" },
  { key: "g a",   label: "g → a", description: "Go to Analytics",         scope: "Global" },
  { key: "g j",   label: "g → j", description: "Go to Job Board",         scope: "Global" },
  { key: "Cmd+K", label: "⌘K",    description: "Open command palette",    scope: "Global" },
  // Dashboard
  { key: "j",      label: "j",   description: "Move selection down",       scope: "Dashboard" },
  { key: "k",      label: "k",   description: "Move selection up",         scope: "Dashboard" },
  { key: "Enter",  label: "↵",   description: "Open selected application", scope: "Dashboard" },
  { key: "a",      label: "a",   description: "Add new application",       scope: "Dashboard" },
  { key: "x",      label: "x",   description: "Toggle selection checkbox", scope: "Dashboard" },
  { key: "Escape", label: "Esc", description: "Close panel / deselect",    scope: "Dashboard" },
  // Detail Panel
  { key: "s",      label: "s",   description: "Focus stage dropdown",  scope: "Detail Panel" },
  { key: "n",      label: "n",   description: "Focus notes editor",    scope: "Detail Panel" },
  { key: "Escape", label: "Esc", description: "Close panel",           scope: "Detail Panel" },
];

export const SHORTCUT_SCOPES = ["Global", "Dashboard", "Detail Panel"];
