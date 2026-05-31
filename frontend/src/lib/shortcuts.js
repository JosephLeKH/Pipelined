/** Keyboard shortcut registry — source of truth for registrations and ShortcutHelp display. */

export const CHORD_TIMEOUT_MS = 500;

/** Second key after `g` → route path for global navigation chords. */
export const CHORD_DESTINATIONS = {
  t: "/today",
  i: "/inbox/pending",
  d: "/dashboard",
  c: "/calendar",
  a: "/analytics",
  j: "/jobs",
  s: "/settings",
};

export const SHORTCUT_SCOPES = ["Navigation", "Actions", "UI", "Dashboard", "Detail Panel"];

export const SHORTCUTS = [
  // Navigation
  { key: "g t",   label: "g → t", description: "Go to Today",             scope: "Navigation" },
  { key: "g i",   label: "g → i", description: "Go to Inbox",             scope: "Navigation" },
  { key: "g d",   label: "g → d", description: "Go to Pipeline",         scope: "Navigation" },
  { key: "g c",   label: "g → c", description: "Go to Calendar",          scope: "Navigation" },
  { key: "g a",   label: "g → a", description: "Go to Analytics",         scope: "Navigation" },
  { key: "g j",   label: "g → j", description: "Go to Job Board",         scope: "Navigation" },
  { key: "g s",   label: "g → s", description: "Go to Settings",          scope: "Navigation" },
  // Actions
  { key: "i",     label: "i",     description: "Import CSV",              scope: "Actions" },
  { key: "o",     label: "o",     description: "Open co-pilot",           scope: "Actions" },
  { key: "/",     label: "/",     description: "Focus search / palette",  scope: "Actions" },
  { key: "?",     label: "?",     description: "Show keyboard shortcuts", scope: "Actions" },
  { key: "Cmd+K", label: "⌘K",    description: "Open command palette",    scope: "Actions" },
  // UI
  { key: "[",     label: "[",     description: "Collapse sidebar",        scope: "UI" },
  { key: "Escape", label: "Esc",  description: "Close panel / palette / deselect", scope: "UI" },
  { key: "Cmd+Enter", label: "⌘↵", description: "Submit form",            scope: "UI" },
  // Dashboard specific
  { key: "a",     label: "a",     description: "Add new application",     scope: "Dashboard" },
  { key: "j",     label: "j",     description: "Move selection down",     scope: "Dashboard" },
  { key: "k",     label: "k",     description: "Move selection up",       scope: "Dashboard" },
  { key: "x",     label: "x",     description: "Toggle selection checkbox", scope: "Dashboard" },
  { key: "Enter", label: "↵",     description: "Open selected application", scope: "Dashboard" },
];
