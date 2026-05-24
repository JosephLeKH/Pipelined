/** Agent activity timeline labels and status styling. */

export const AGENT_TYPE_LABELS = {
  prep: "Interview prep",
  fit: "Fit score",
  autopilot: "Autopilot match",
  classify: "Email classify",
  brief: "Morning brief",
};

export const AGENT_STATUS_STYLES = {
  success: "text-emerald-700 dark:text-emerald-400",
  failed: "text-destructive",
  skipped: "text-muted-foreground",
};

export function agentTypeLabel(agentType) {
  return AGENT_TYPE_LABELS[agentType] ?? agentType.replace(/_/g, " ");
}
