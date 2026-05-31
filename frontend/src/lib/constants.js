/** App-wide constants: stage colors, breakpoints, timings. */

export {
  STAGE_COLORS,
  DEFAULT_STAGE_COLOR,
  STAGE_COLOR_PICKER_OPTIONS,
  RELATIONSHIP_COLORS,
  EVENT_TYPE_COLORS,
  DEFAULT_EVENT_COLOR,
} from "./colorConstants";

/** Terminal stages that cannot be removed from the pipeline editor. */
export const REQUIRED_PIPELINE_STAGES = ["Offer", "Rejected"];

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
export const CHROME_EXTENSION_URL = "https://chromewebstore.google.com/detail/pipelined";
export const EXTENSION_STEP_CLICKED_KEY = "pipelined_extension_step_clicked";
/** Dismissed banners reappear after this many days (PRD-10). */
export const BANNER_DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
/** Undo toasts stay longer than default toasts so users can revert delete/archive. */
export const UNDO_TOAST_DURATION_MS = 10000;
export const COPILOT_TRIED_KEY = "pipelined_copilot_tried";
export const TODAY_VISITED_KEY = "pipelined_today_visited";
export const MORNING_BRIEF_EXPANDED_KEY = "pipelined_brief_expanded_by_date";
export const COMPLETED_MISSIONS_BY_DATE_KEY = "pipelined_completed_missions_by_date";
export const MISSION_COMPLETE_ANIM_MS = 280;
export const OPEN_COPILOT_EVENT = "pipelined:open-copilot";
export const OPEN_COMMAND_PALETTE_EVENT = "pipelined:open-command-palette";
export const OPEN_IMPORT_CSV_EVENT = "pipelined:open-import-csv";

export const SIDEBAR_COLLAPSED_STORAGE_KEY = "pipelined_sidebar_collapsed";
/* Pixel constants below are bumped ~10% over their original values to match
   the global UI scale (html font-size: 110% in index.css). Tailwind utilities
   are already rem-based so they scale automatically; these constants are only
   needed where the values are passed through inline styles or JS arithmetic. */
export const SIDEBAR_WIDTH_PX = 264;            /* was 240, ×1.1 */
export const SIDEBAR_COLLAPSED_WIDTH_PX = 62;   /* was 56,  ×1.1 */
export const SIDEBAR_WIDTH_STORAGE_KEY = "pipelined_sidebar_width";
export const SIDEBAR_WIDTH_MIN_PX = 200;
export const SIDEBAR_WIDTH_MAX_PX = 420;
export const SIDEBAR_ANIMATION_MS = 200;
export const DRAWER_ANIMATION_MS = 220;
export const SIDEBAR_TOOLTIP_DELAY_MS = 400;
export const TOP_BAR_HEIGHT_PX = 48;            /* was 44,  ×1.1 */
export const DETAIL_PANEL_WIDTH_PX = 520;       /* PRD-04 §9.1 */
export const MANUAL_ADD_FORM_WIDTH_PX = 520;    /* PRD-04 §10.1 */

/** Banner z-index layering strategy — stacks vertically, not overlapping. */
export const BANNER_Z_OFFLINE = 50;             /* Connectivity issues (highest priority) */
export const BANNER_Z_VERIFY_EMAIL = 40;        /* Email verification */
export const BANNER_Z_AUTO_RESUME = 30;         /* Autopilot resume suggestions */
export const MANUAL_ADD_VISIBLE_STAGES = 4;
export const COPILOT_DRAWER_WIDTH_PX = 528;     /* was 480, ×1.1 */
export const CALENDAR_EVENT_DRAWER_WIDTH_PX = 528; /* was 480, ×1.1 */
export const CALENDAR_EVENT_MODAL_WIDTH_PX = 528;  /* was 480, ×1.1 */
export const CALENDAR_EVENT_DOT_MAX = 3;
export const CALENDAR_DEFAULT_DURATION_MIN = 30;
export const CALENDAR_UPCOMING_WINDOW_DAYS = 7;

/** Default prep checklist items for calendar event detail drawer (PRD-06 §7.3). */
export const CALENDAR_EVENT_PREP_ITEMS = [
  { id: "review-jd", text: "Review job description" },
  { id: "review-brief", text: "Re-read your interview prep brief" },
  { id: "prepare-questions", text: "Prepare 3 questions to ask" },
];

/** Location label shown in calendar event detail by event type. */
export const EVENT_TYPE_LOCATION_LABELS = {
  phone_screen: "Phone",
  technical: "Video call",
  onsite: "Onsite",
  behavioral: "Video call",
  offer: "Remote",
  other: "TBD",
};

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

/** PRD-07 §5 — tag dot swatches (6 presets only). */
export const TAG_COLOR_SWATCHES = [
  "#8C1515",
  "#3B82F6",
  "#8B5CF6",
  "#F59E0B",
  "#175E54",
  "#71717A",
];

export const TAG_COLORS_STORAGE_KEY = "pipelined_tag_colors";

export const LIST_OFFSET_PX = 308; /* was 280, ×1.1 */

/* MD_BREAKPOINT_PX is a viewport-size breakpoint — it must remain in true
   device pixels and is NOT scaled with the UI. Same goes for the swipe/drag
   gesture thresholds below: those should match physical touch distances. */
export const MD_BREAKPOINT_PX = 768;
export const APPLICATION_ROW_HEIGHT_DESKTOP = 44; /* was 40, ×1.1 */
export const APPLICATION_ROW_HEIGHT_MOBILE = 62;  /* was 56, ×1.1 */

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
    label: "Counter: Higher Base",
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
    label: "Counter: More Equity",
    build: (app) => {
      const role = app.role_title;
      const company = app.company;
      if (!role || !company) return INCOMPLETE_OFFER_MSG;
      return `Hi [Hiring Manager],\n\nThank you for the offer for the ${role} position at ${company}. I'm very excited about joining the team.\n\nI'd love to discuss the equity component of the package. Given my long-term commitment to ${company}'s mission, I'd like to explore whether there's flexibility to increase the equity grant from the current amount to [target equity].\n\nI believe this adjustment would better reflect the value I'll bring and align our long-term interests. Happy to discuss further at your convenience.\n\nBest regards,\n[Your Name]`;
    },
  },
  {
    id: "signing_bonus",
    label: "Ask: Signing Bonus",
    build: (app) => {
      const company = app.company;
      const role = app.role_title;
      if (!role || !company) return INCOMPLETE_OFFER_MSG;
      return `Hi [Hiring Manager],\n\nThank you for the offer to join ${company} as ${role}. I'm thrilled about the opportunity.\n\nI wanted to ask whether there's flexibility to include a signing bonus. I have some transition costs and deferred compensation from my current position that I'd be leaving behind. A signing bonus of [amount] would help bridge this gap.\n\nI'm committed to making this work and look forward to contributing to the team from day one.\n\nBest regards,\n[Your Name]`;
    },
  },
  {
    id: "remote_flexibility",
    label: "Ask: Remote Flexibility",
    build: (app) => {
      const company = app.company;
      const role = app.role_title;
      if (!role || !company) return INCOMPLETE_OFFER_MSG;
      return `Hi [Hiring Manager],\n\nThank you for the offer for ${role} at ${company}. I'm very excited to join the team.\n\nI wanted to discuss the remote/hybrid policy. I work most effectively with some flexibility in location and was wondering if we could explore a [X days remote] arrangement. I'm confident this won't impact my availability or output. I'm happy to come in whenever collaboration is needed.\n\nThank you for considering this. I'm eager to find an arrangement that works for everyone.\n\nBest regards,\n[Your Name]`;
    },
  },
];

// SYNC: backend/auth/constants.py
export const WATCHLIST_COMPANIES_MAX = 25;
export const WATCHLIST_COMPANY_NAME_MAX_LENGTH = 100;
export const WATCHLIST_CAREERS_URL_MAX_LENGTH = 500;

export const NO_AUTO_SEND_MESSAGE = "No auto-send — review and send manually.";
