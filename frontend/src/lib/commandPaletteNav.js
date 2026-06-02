/** Navigation items for the command palette — derived from route meta with chord hints. */

export const COMMAND_PALETTE_NAV = [
  { id: "nav-today", type: "nav", label: "Today", path: "/today", hint: "g t" },
  { id: "nav-inbox", type: "nav", label: "Scout's Drafts", path: "/inbox/pending", hint: "g i" },
  { id: "nav-dashboard", type: "nav", label: "Dashboard", path: "/dashboard", hint: "g d" },
  { id: "nav-jobs", type: "nav", label: "Job Board", path: "/jobs", hint: "g j" },
  { id: "nav-calendar", type: "nav", label: "Calendar", path: "/calendar", hint: "g c" },
  { id: "nav-analytics", type: "nav", label: "Analytics", path: "/analytics", hint: "g a" },
  { id: "nav-activity", type: "nav", label: "Scout's Activity", path: "/activity" },
  { id: "nav-tags", type: "nav", label: "Tags", path: "/tags" },
  { id: "nav-offers", type: "nav", label: "Offers", path: "/offers" },
  { id: "nav-settings", type: "nav", label: "Settings", path: "/settings", hint: "g s" },
];
