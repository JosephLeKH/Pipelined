/** App-wide constants: stage colors, breakpoints, timings. */

/** PRD-00 §3.4 dot hex values — dots only; pill backgrounds are never tinted in list rows. */
const D = {
  neutral: "#71717A",
  info: "#3B82F6",
  violet: "#8B5CF6",
  warn: "#F59E0B",
  orange: "#F97316",
  success: "#175E54",
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

export const MS_PER_DAY = 86_400_000;

export const STALE_APPLICATION_DAYS = 14;

export const SEARCH_DEBOUNCE_MS = 300;

/** Job board search debounce — PRD-06 §5. */
export const JOB_SEARCH_DEBOUNCE_MS = 200;

export const JOB_POSTED_FILTER_OPTIONS = [
  { id: "any", label: "Any" },
  { id: "7d", label: "7d" },
  { id: "30d", label: "30d" },
  { id: "90d", label: "90d" },
];

export const JOB_SORT_OPTIONS = [
  { id: "best_match", label: "Best match" },
  { id: "newest", label: "Newest" },
  { id: "oldest", label: "Oldest" },
];

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

// SYNC: backend/auth/constants.py
export const AUTOPILOT_MIN_SCORE_MIN = 70;
export const AUTOPILOT_MIN_SCORE_MAX = 95;
export const AUTOPILOT_MAX_DAILY_MIN = 1;
export const AUTOPILOT_MAX_DAILY_MAX = 10;
export const DEFAULT_AUTOPILOT_MIN_MATCH_SCORE = 80;
export const DEFAULT_AUTOPILOT_MAX_DAILY = 5;
export const AUTOPILOT_SCAN_HOUR_UTC = 5; // SYNC: backend/autopilot/constants.py

export const REMOTE_STATUS_OPTIONS = ["remote", "hybrid", "onsite", "unknown"];

export const SKELETON_ROW_COUNT = 8;

export const COMPANY_TYPE_OPTIONS = ["startup", "mid", "enterprise", "gov", "nonprofit", "other"];

export const EVENT_TYPE_COLORS = {
  phone_screen: { bg: "bg-blue-50 dark:bg-blue-900/20", text: "text-status-info dark:text-blue-300", dot: "bg-status-info dark:bg-blue-400", border: "border-blue-200 dark:border-blue-700/50" },
  technical: { bg: "bg-brand-50 dark:bg-brand-900/20", text: "text-brand-600 dark:text-brand-300", dot: "bg-brand-500 dark:bg-brand-400", border: "border-brand-200 dark:border-brand-700/50" },
  onsite: { bg: "bg-amber-50 dark:bg-amber-900/20", text: "text-amber-700 dark:text-amber-300", dot: "bg-amber-500 dark:bg-amber-400", border: "border-amber-200 dark:border-amber-700/50" },
  behavioral: { bg: "bg-sky-50 dark:bg-sky-900/20", text: "text-sky-700 dark:text-sky-300", dot: "bg-sky-500 dark:bg-sky-400", border: "border-sky-200 dark:border-sky-700/50" },
  offer: { bg: "bg-emerald-50 dark:bg-emerald-900/20", text: "text-emerald-700 dark:text-emerald-300", dot: "bg-emerald-500 dark:bg-emerald-400", border: "border-emerald-200 dark:border-emerald-700/50" },
  other: { bg: "bg-surface-1", text: "text-text-2", dot: "bg-status-neutral", border: "border-border-1" },
};

export const DEFAULT_EVENT_COLOR = { bg: "bg-surface-1", text: "text-text-2", dot: "bg-status-neutral", border: "border-border-1" };

export const CALENDAR_STALE_TIME_MS = 60_000;

export const WEEK_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
export const WEEK_DAYS_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const ROLE_TYPE_OPTIONS = ["full_time", "part_time", "contract", "internship"];

export const EXPERIENCE_LEVEL_OPTIONS = ["internship", "entry", "mid", "senior", "staff"];

export const NOTES_MAX_LENGTH = 5000;
export const JOB_DESCRIPTION_MAX_LENGTH = 8000;  // SYNC: backend/applications/schemas.py MAX_JOB_DESCRIPTION_LENGTH
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

export const DEFAULT_PIPELINE_STAGES = [
  "Applied",
  "Phone Screen",
  "Onsite",
  "Offer",
  "Rejected",
];

/** Default kanban column order when user prefs are unavailable. */
export const STAGES = DEFAULT_PIPELINE_STAGES;

export const VIEW_MODE_STORAGE_KEY = "pipelined_view_mode";

export const ONBOARDING_DISMISSED_KEY = "pipelined_onboarding_dismissed";
export const ONBOARDING_CONFETTI_DISMISS_MS = 3_000;
export const EMAIL_VERIFICATION_BANNER_DISMISSED_KEY = "pipelined_email_verify_banner_dismissed";
export const INBOX_SETUP_BANNER_DISMISSED_KEY = "pipelined_gmail_banner_dismissed";
export const AUTOPILOT_RESUME_BANNER_DISMISSED_KEY = "pipelined_autopilot_resume_banner_dismissed";
export const FOLLOW_UP_BANNER_DISMISSED_KEY = "pipelined_follow_up_banner_dismissed";
export const COPILOT_TRIED_KEY = "pipelined_copilot_tried";
export const TODAY_VISITED_KEY = "pipelined_today_visited";
export const OPEN_COPILOT_EVENT = "pipelined:open-copilot";
export const OPEN_COMMAND_PALETTE_EVENT = "pipelined:open-command-palette";
export const OPEN_IMPORT_CSV_EVENT = "pipelined:open-import-csv";

export const SIDEBAR_COLLAPSED_STORAGE_KEY = "pipelined_sidebar_collapsed";
export const SIDEBAR_WIDTH_PX = 240;
export const SIDEBAR_COLLAPSED_WIDTH_PX = 56;
export const SIDEBAR_ANIMATION_MS = 200;
export const DRAWER_ANIMATION_MS = 220;
export const SIDEBAR_TOOLTIP_DELAY_MS = 400;
export const TOP_BAR_HEIGHT_PX = 44;
export const DETAIL_PANEL_WIDTH_PX = 520;
export const MANUAL_ADD_FORM_WIDTH_PX = 520;
export const MANUAL_ADD_VISIBLE_STAGES = 4;
export const COPILOT_DRAWER_WIDTH_PX = 480;

/** Source options for ManualAddForm segmented control (PRD-04 §10.1). */
export const MANUAL_ADD_SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "extension", label: "Extension" },
  { value: "email", label: "Email" },
  { value: "board", label: "Board" },
];

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
  mentor: { bg: "bg-blue-100 dark:bg-blue-900/30", text: "text-status-info dark:text-blue-300" },
  peer: { bg: "bg-sky-100 dark:bg-sky-900/30", text: "text-sky-700 dark:text-sky-300" },
  hiring_manager: { bg: "bg-amber-100 dark:bg-amber-900/30", text: "text-amber-700 dark:text-amber-300" },
  other: { bg: "bg-gray-100 dark:bg-gray-800", text: "text-gray-700 dark:text-gray-300" },
};

export const CLEARBIT_LOGO_BASE_URL = "https://logo.clearbit.com";

export const COMPANY_LOGO_FALLBACK_COLORS = [
  "bg-brand-500",
  "bg-emerald-500",
  "bg-status-info",
  "bg-rose-500",
  "bg-amber-500",
  "bg-status-success",
  "bg-pink-500",
  "bg-teal-500",
];

export const LIST_OFFSET_PX = 280;

export const MD_BREAKPOINT_PX = 768;
export const APPLICATION_ROW_HEIGHT_DESKTOP = 40;
export const APPLICATION_ROW_HEIGHT_MOBILE = 56;

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

// SYNC: backend/auth/constants.py
export const WATCHLIST_COMPANIES_MAX = 25;
export const WATCHLIST_COMPANY_NAME_MAX_LENGTH = 100;
export const WATCHLIST_CAREERS_URL_MAX_LENGTH = 500;
