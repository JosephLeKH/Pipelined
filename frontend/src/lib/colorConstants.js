/** Color constants for stages, relationships, and event types. */

const D = {
  neutral: "#71717A",
  info: "#3B82F6",
  violet: "#8B5CF6",
  warn: "#F59E0B",
  orange: "#F97316",
  success: "#175E54",
  cardinal: "#8C1515",
  pink: "#EC4899",
  teal: "#14B8A6",
  lime: "#84CC16",
  indigo: "#6366F1",
  slate: "#475569",
};

/** @param {string} hex @param {string} bg @param {string} text @param {string} [border] */
function sc(hex, bg, text, border = `border-[${hex}]`) {
  return { dotColor: hex, dot: `bg-[${hex}]`, bg, text, border, activeBg: `bg-[${hex}]` };
}

export const STAGE_COLORS = {
  "To Apply": sc(D.neutral, "bg-surface-1 dark:bg-surface-2", "text-text-2 dark:text-text-2", "border-border-1"),
  Applied: sc(D.info, "bg-blue-100 dark:bg-blue-900/30", "text-blue-800 dark:text-blue-300"),
  "Phone Screen": sc(D.violet, "bg-violet-100 dark:bg-violet-900/30", "text-violet-800 dark:text-violet-300"),
  Technical: sc(D.warn, "bg-amber-100 dark:bg-amber-900/30", "text-amber-800 dark:text-amber-300"),
  Onsite: sc(D.orange, "bg-orange-100 dark:bg-orange-900/30", "text-orange-800 dark:text-orange-300"),
  Offer: sc(D.success, "bg-emerald-100 dark:bg-emerald-900/30", "text-emerald-800 dark:text-emerald-300"),
  Rejected: sc(D.neutral, "bg-surface-1 dark:bg-surface-2", "text-text-3 dark:text-text-3", "border-border-1"),
  Withdrawn: sc(D.neutral, "bg-surface-1 dark:bg-surface-2", "text-text-3 dark:text-text-3", "border-border-1"),
};

export const DEFAULT_STAGE_COLOR = sc(D.neutral, "bg-surface-1 dark:bg-surface-2", "text-text-2 dark:text-text-2", "border-border-1");

/** Dot color presets for the pipeline stage color picker. */
export const STAGE_COLOR_PICKER_OPTIONS = [
  { key: "neutral", hex: D.neutral, label: "Neutral" },
  { key: "slate", hex: D.slate, label: "Slate" },
  { key: "info", hex: D.info, label: "Blue" },
  { key: "indigo", hex: D.indigo, label: "Indigo" },
  { key: "violet", hex: D.violet, label: "Violet" },
  { key: "pink", hex: D.pink, label: "Pink" },
  { key: "cardinal", hex: D.cardinal, label: "Cardinal" },
  { key: "orange", hex: D.orange, label: "Orange" },
  { key: "warn", hex: D.warn, label: "Amber" },
  { key: "lime", hex: D.lime, label: "Lime" },
  { key: "success", hex: D.success, label: "Green" },
  { key: "teal", hex: D.teal, label: "Teal" },
];

export const RELATIONSHIP_COLORS = {
  recruiter: { bg: "bg-brand-100 dark:bg-brand-900/30", text: "text-brand-700 dark:text-brand-300" },
  referral: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
  mentor: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-status-info dark:text-blue-300" },
  peer: { bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-700 dark:text-sky-300" },
  hiring_manager: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  other: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300" },
};

export const EVENT_TYPE_COLORS = {
  phone_screen: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-status-info dark:text-blue-300", dot: "bg-status-info dark:bg-blue-400", border: "border-blue-200 dark:border-blue-700/50" },
  technical: { bg: "bg-brand-50 dark:bg-brand-900/20", text: "text-brand-600 dark:text-brand-300", dot: "bg-brand-500 dark:bg-brand-400", border: "border-brand-200 dark:border-brand-700/50" },
  onsite: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500 dark:bg-amber-400", border: "border-amber-200 dark:border-amber-700/50" },
  behavioral: { bg: "bg-sky-50 dark:bg-sky-900/20", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-500 dark:bg-sky-400", border: "border-sky-200 dark:border-sky-700/50" },
  offer: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500 dark:bg-emerald-400", border: "border-emerald-200 dark:border-emerald-700/50" },
  other: { bg: "bg-surface-1", text: "text-text-2", dot: "bg-status-neutral", border: "border-border-1" },
};

export const DEFAULT_EVENT_COLOR = { bg: "bg-surface-1", text: "text-text-2", dot: "bg-status-neutral", border: "border-border-1" };
