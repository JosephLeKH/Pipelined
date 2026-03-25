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

export const VIRTUALIZED_LIST_THRESHOLD = 50;
