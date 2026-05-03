/** App-wide constants: stage colors, breakpoints, timings. */

export const STAGE_COLORS = {
  Applied: { bg: "bg-brand-100 dark:bg-brand-900/30", text: "text-brand-800 dark:text-brand-300", dot: "bg-brand-500 dark:bg-brand-400", border: "border-brand-500 dark:border-brand-400", activeBg: "bg-brand-500 dark:bg-brand-400" },
  "Phone Screen": { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-blue-800 dark:text-blue-300", dot: "bg-accent-blue dark:bg-blue-400", border: "border-accent-blue dark:border-blue-400", activeBg: "bg-accent-blue dark:bg-blue-400" },
  Onsite: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-800 dark:text-amber-300", dot: "bg-amber-500 dark:bg-amber-400", border: "border-amber-500 dark:border-amber-400", activeBg: "bg-amber-500 dark:bg-amber-400" },
  Offer: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-800 dark:text-emerald-300", dot: "bg-emerald-500 dark:bg-emerald-400", border: "border-emerald-500 dark:border-emerald-400", activeBg: "bg-emerald-500 dark:bg-emerald-400" },
  Rejected: { bg: "bg-rose-100 dark:bg-rose-900/30", text: "text-rose-800 dark:text-rose-300", dot: "bg-rose-500 dark:bg-rose-400", border: "border-rose-500 dark:border-rose-400", activeBg: "bg-rose-500 dark:bg-rose-400" },
};

export const DEFAULT_STAGE_COLOR = {
  bg: "bg-gray-100 dark:bg-gray-800",
  text: "text-gray-800 dark:text-gray-200",
  dot: "bg-gray-500 dark:bg-gray-400",
  border: "border-gray-400 dark:border-gray-600",
  activeBg: "bg-gray-500 dark:bg-gray-400",
};

export const MS_PER_DAY = 86_400_000;

export const STALE_APPLICATION_DAYS = 14;

export const SEARCH_DEBOUNCE_MS = 300;

export const COPY_RESET_MS = 2_000;

export const DROPDOWN_CLOSE_DELAY_MS = 150;

export const MODAL_FOCUS_DELAY_MS = 50;

export const BANNER_AUTO_DISMISS_MS = 8_000;

export const QUERY_STALE_TIME_MS = 30_000;

export const STATS_STALE_TIME_MS = 60_000;

export const VIRTUALIZED_LIST_THRESHOLD = 50;

export const PASSWORD_MIN_LENGTH = 8;

export const RESUME_ACCEPT = ".pdf";
export const RESUME_MAX_MB = 2;
export const AI_SCORE_LIMIT = 10;

export const REMOTE_STATUS_OPTIONS = ["remote", "hybrid", "onsite", "unknown"];

export const SKELETON_ROW_COUNT = 8;

export const COMPANY_TYPE_OPTIONS = ["startup", "mid", "enterprise", "gov", "nonprofit", "other"];

export const EVENT_TYPE_COLORS = {
  phone_screen: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-accent-blue dark:text-blue-300", dot: "bg-accent-blue dark:bg-blue-400", border: "border-blue-200 dark:border-blue-700/50" },
  technical: { bg: "bg-brand-50 dark:bg-brand-900/20", text: "text-brand-600 dark:text-brand-300", dot: "bg-brand-500 dark:bg-brand-400", border: "border-brand-200 dark:border-brand-700/50" },
  onsite: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500 dark:bg-amber-400", border: "border-amber-200 dark:border-amber-700/50" },
  behavioral: { bg: "bg-sky-50 dark:bg-sky-900/20", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-500 dark:bg-sky-400", border: "border-sky-200 dark:border-sky-700/50" },
  offer: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500 dark:bg-emerald-400", border: "border-emerald-200 dark:border-emerald-700/50" },
  other: { bg: "bg-surface-secondary", text: "text-gray-600 dark:text-gray-400", dot: "bg-gray-400 dark:bg-gray-300", border: "border-border-default" },
};

export const DEFAULT_EVENT_COLOR = { bg: "bg-surface-secondary", text: "text-gray-600", dot: "bg-gray-400", border: "border-border-default" };

export const CALENDAR_STALE_TIME_MS = 60_000;

export const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ROLE_TYPE_OPTIONS = ["full_time", "part_time", "contract", "internship"];

export const EXPERIENCE_LEVEL_OPTIONS = ["internship", "entry", "mid", "senior", "staff"];

export const NOTES_MAX_LENGTH = 5000;

export const PREP_NOTES_MAX_LENGTH = 3000;
export const PREP_CHECKLIST_ITEM_MAX_LENGTH = 200;
export const PREP_NOTES_DEBOUNCE_MS = 500;
export const MAX_PREP_QUESTIONS = 20;

export const INTERVIEW_EVENT_TYPES = ["phone_screen", "technical", "onsite", "behavioral"];

export const PREP_CHECKLIST_STARTER_SUGGESTIONS = [
  "Research the company",
  "Review the job description",
  "Prepare STAR stories",
];

export const JOBS_STALE_TIME_MS = 60_000;

export const SALARY_FILTER_MIN = 0;
export const SALARY_FILTER_MAX = 500_000;
export const SALARY_FILTER_STEP = 10_000;

export const BULK_MAX_IDS = 500;

export const BULK_EDIT_MAX_IDS = 50;

export const STAGES = Object.keys(STAGE_COLORS);

export const VIEW_MODE_STORAGE_KEY = "pipelined_view_mode";

export const ONBOARDING_DISMISSED_KEY = "pipelined_onboarding_dismissed";
export const ONBOARDING_CONFETTI_DISMISS_MS = 3_000;

export const EVENT_TYPE_OPTIONS = [
  { value: "phone_screen", label: "Phone Screen" },
  { value: "technical", label: "Technical" },
  { value: "onsite", label: "Onsite" },
  { value: "behavioral", label: "Behavioral" },
  { value: "offer", label: "Offer" },
  { value: "other", label: "Other" },
];

export const STALE_CONTACT_DAYS = 14;

export const RELATIONSHIP_OPTIONS = ["recruiter", "referral", "mentor", "peer", "hiring_manager", "other"];

export const RELATIONSHIP_COLORS = {
  recruiter: { bg: "bg-brand-100 dark:bg-brand-900/30", text: "text-brand-700 dark:text-brand-300" },
  referral: { bg: "bg-emerald-100 dark:bg-emerald-900/30", text: "text-emerald-700 dark:text-emerald-300" },
  mentor: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-accent-blue dark:text-blue-300" },
  peer: { bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-700 dark:text-sky-300" },
  hiring_manager: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  other: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300" },
};

export const CLEARBIT_LOGO_BASE_URL = "https://logo.clearbit.com";

export const COMPANY_LOGO_FALLBACK_COLORS = [
  "bg-brand-500",
  "bg-emerald-500",
  "bg-accent-blue",
  "bg-rose-500",
  "bg-amber-500",
  "bg-accent-green",
  "bg-pink-500",
  "bg-teal-500",
];

export const LIST_OFFSET_PX = 280;

export const SWIPE_THRESHOLD_PX = 80;
export const SWIPE_MAX_MS = 300;
export const SWIPE_H_TO_V_RATIO = 2;
export const SWIPE_REVEAL_PX = 160;
export const SWIPE_SNAP_BACK_MS = 3000;
export const DRAG_DISMISS_PX = 100;

export const KANBAN_SKELETON_COUNT = 3;

export const OFFER_STAGE = "Offer";

export const OFFER_FIELDS = [
  { key: "base_salary", label: "Base Salary", type: "currency" },
  { key: "equity", label: "Equity", type: "text" },
  { key: "equity_annual_value", label: "Equity (Annual $)", type: "currency" },
  { key: "vesting_years", label: "Vesting (years)", type: "text" },
  { key: "signing_bonus", label: "Signing Bonus", type: "currency" },
  { key: "total_comp", label: "Total Comp", type: "currency" },
  { key: "benefits", label: "Benefits", type: "text" },
  { key: "start_date", label: "Start Date", type: "text" },
  { key: "location", label: "Location", type: "text" },
  { key: "remote_policy", label: "Remote Policy", type: "text" },
  { key: "deadline", label: "Deadline", type: "text" },
  { key: "notes", label: "Notes", type: "text" },
];

const INCOMPLETE_OFFER_MSG =
  "Add offer details (company, role, base salary) to generate this script.";

export const NEGOTIATION_TEMPLATES = [
  {
    id: "counter_salary",
    label: "Counter — Higher Base",
    build: (app) => {
      const role = app.role_title;
      const company = app.company;
      const base = app.offer_details?.base_salary;
      if (!role || !company || !base) return INCOMPLETE_OFFER_MSG;
      const baseStr = `$${Number(base).toLocaleString()}`;
      return `Hi [Hiring Manager],\n\nThank you so much for the offer to join ${company} as ${role}. I'm genuinely excited about this opportunity and the team.\n\nAfter careful consideration of my experience and market data, I was hoping we could discuss the base salary. The current offer of ${baseStr} is slightly below what I was targeting. Would you be open to [target]?\n\nI'm very enthusiastic about the role and confident I can make an immediate impact. I appreciate your consideration and look forward to your response.\n\nBest regards,\n[Your Name]`;
    },
  },
  {
    id: "equity_ask",
    label: "Counter — More Equity",
    build: (app) => {
      const role = app.role_title;
      const company = app.company;
      if (!role || !company) return INCOMPLETE_OFFER_MSG;
      return `Hi [Hiring Manager],\n\nThank you for the offer for the ${role} position at ${company}. I'm very excited about joining the team.\n\nI'd love to discuss the equity component of the package. Given my long-term commitment to ${company}'s mission, I'd like to explore whether there's flexibility to increase the equity grant from the current amount to [target equity].\n\nI believe this adjustment would better reflect the value I'll bring and align our long-term interests. Happy to discuss further at your convenience.\n\nBest regards,\n[Your Name]`;
    },
  },
  {
    id: "signing_bonus",
    label: "Ask — Signing Bonus",
    build: (app) => {
      const company = app.company;
      const role = app.role_title;
      if (!role || !company) return INCOMPLETE_OFFER_MSG;
      return `Hi [Hiring Manager],\n\nThank you for the offer to join ${company} as ${role}. I'm thrilled about the opportunity.\n\nI wanted to ask whether there's flexibility to include a signing bonus. I have some transition costs and deferred compensation from my current position that I'd be leaving behind. A signing bonus of [amount] would help bridge this gap.\n\nI'm committed to making this work and look forward to contributing to the team from day one.\n\nBest regards,\n[Your Name]`;
    },
  },
  {
    id: "remote_flexibility",
    label: "Ask — Remote Flexibility",
    build: (app) => {
      const company = app.company;
      const role = app.role_title;
      if (!role || !company) return INCOMPLETE_OFFER_MSG;
      return `Hi [Hiring Manager],\n\nThank you for the offer for ${role} at ${company}. I'm very excited to join the team.\n\nI wanted to discuss the remote/hybrid policy. I work most effectively with some flexibility in location and was wondering if we could explore a [X days remote] arrangement. I'm confident this won't impact my availability or output — I'm happy to come in whenever collaboration is needed.\n\nThank you for considering this. I'm eager to find an arrangement that works for everyone.\n\nBest regards,\n[Your Name]`;
    },
  },
];
