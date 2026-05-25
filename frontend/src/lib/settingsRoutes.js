/** Settings sub-route registry — nav groups and legacy ?section= redirects. */

export const SETTINGS_LEGACY_REDIRECTS = {
  pipeline: "stages",
  profile: "profile",
  calendar: "profile",
  notifications: "notifications",
  integrations: "integrations/gmail",
  autopilot: "autopilot",
  agent: "agent-profile",
  resume: "resume",
  templates: "templates",
  sharing: "sharing",
  reports: "reports",
  referral: "referral",
  usage: "billing",
  account: "account",
};

export const SETTINGS_NAV_GROUPS = [
  {
    label: "ACCOUNT",
    items: [
      { segment: "profile", label: "Profile", to: "/settings/profile" },
      { segment: "notifications", label: "Notifications", to: "/settings/notifications" },
      { segment: "appearance", label: "Appearance", to: "/settings/appearance" },
    ],
  },
  {
    label: "WORKSPACE",
    items: [
      { segment: "stages", label: "Pipeline stages", to: "/settings/stages" },
      { segment: "templates", label: "Templates", to: "/settings/templates" },
      { segment: "tags", label: "Tags", to: "/tags", external: true },
    ],
  },
  {
    label: "AGENTS",
    items: [
      { segment: "agent-profile", label: "Agent profile", to: "/settings/agent-profile" },
      { segment: "autopilot", label: "Autopilot", to: "/settings/autopilot" },
      { segment: "watchlist", label: "Watchlist", to: "/settings/watchlist" },
      { segment: "resume", label: "Resume", to: "/settings/resume" },
      { segment: "agent-notifications", label: "Notifications", to: "/settings/agent-notifications" },
    ],
  },
  {
    label: "INTEGRATIONS",
    items: [
      { segment: "integrations/gmail", label: "Gmail", to: "/settings/integrations/gmail" },
      { segment: "integrations/github", label: "GitHub", to: "/settings/integrations/github" },
    ],
  },
  {
    label: "BILLING",
    items: [
      { segment: "billing", label: "Plan & usage", to: "/settings/billing" },
      { segment: "referral", label: "Referral", to: "/settings/referral" },
    ],
  },
];

/** Resolve the active settings segment from a pathname. */
export function getActiveSettingsSegment(pathname) {
  const prefix = "/settings/";
  if (!pathname.startsWith(prefix)) return null;
  const segment = pathname.slice(prefix.length).replace(/\/$/, "");
  return segment || "profile";
}
