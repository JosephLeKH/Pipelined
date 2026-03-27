/** App-wide constants: stage colors, breakpoints, timings. */

export const STAGE_COLORS = {
  Applied: { bg: "bg-blue-100", text: "text-blue-800", dot: "bg-blue-500" },
  "Phone Screen": { bg: "bg-purple-100", text: "text-purple-800", dot: "bg-purple-500" },
  Onsite: { bg: "bg-amber-100", text: "text-amber-800", dot: "bg-amber-500" },
  Offer: { bg: "bg-green-100", text: "text-green-800", dot: "bg-green-500" },
  Rejected: { bg: "bg-red-100", text: "text-red-800", dot: "bg-red-500" },
};

export const DEFAULT_STAGE_COLOR = {
  bg: "bg-gray-100",
  text: "text-gray-800",
  dot: "bg-gray-500",
};

export const STALE_APPLICATION_DAYS = 14;

export const BANNER_AUTO_DISMISS_MS = 8_000;

export const QUERY_STALE_TIME_MS = 30_000;

export const STATS_STALE_TIME_MS = 60_000;

export const VIRTUALIZED_LIST_THRESHOLD = 50;

export const PASSWORD_MIN_LENGTH = 8;

export const REMOTE_STATUS_OPTIONS = ["remote", "hybrid", "onsite", "unknown"];

export const COMPANY_TYPE_OPTIONS = ["startup", "mid", "enterprise", "gov", "nonprofit", "other"];

export const EVENT_TYPE_COLORS = {
  phone_screen: { bg: "bg-purple-100", text: "text-purple-800" },
  technical: { bg: "bg-blue-100", text: "text-blue-800" },
  onsite: { bg: "bg-amber-100", text: "text-amber-800" },
  behavioral: { bg: "bg-teal-100", text: "text-teal-800" },
  offer: { bg: "bg-green-100", text: "text-green-800" },
  other: { bg: "bg-gray-100", text: "text-gray-800" },
};

export const DEFAULT_EVENT_COLOR = { bg: "bg-gray-100", text: "text-gray-800" };

export const CALENDAR_STALE_TIME_MS = 60_000;

export const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ROLE_TYPE_OPTIONS = ["full_time", "part_time", "contract", "internship"];

export const EXPERIENCE_LEVEL_OPTIONS = ["internship", "entry", "mid", "senior", "staff"];

export const JOBS_STALE_TIME_MS = 60_000;

export const EVENT_TYPE_OPTIONS = [
  { value: "phone_screen", label: "Phone Screen" },
  { value: "technical", label: "Technical" },
  { value: "onsite", label: "Onsite" },
  { value: "behavioral", label: "Behavioral" },
  { value: "offer", label: "Offer" },
  { value: "other", label: "Other" },
];
