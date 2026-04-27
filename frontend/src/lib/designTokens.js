/**
 * Design token class strings for Pipelined UI components.
 * Import these constants instead of duplicating Tailwind class strings.
 * Every token must use the brand palette and custom theme tokens from tailwind.config.js.
 */

/** Card container — white bg, rounded-xl, border-defined (no shadow), dark variants. */
export const CARD_BASE =
  "bg-white rounded-xl border border-border-default shadow-card dark:bg-gray-800 dark:border-dark-border";

/** Card hover state — stronger border, no shadow. */
export const CARD_HOVER = "border-border-strong hover:shadow-card-hover transition-all";

/** Primary action button — solid clay, white text. */
export const BUTTON_PRIMARY =
  "bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-md px-4 py-2 text-sm " +
  "font-display transition-colors duration-150 focus:outline-none focus:ring-2 " +
  "focus:ring-brand-500/30 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

/** Secondary button — white bg, warm border, warm text. */
export const BUTTON_SECONDARY =
  "bg-white border border-border-default hover:border-border-strong text-gray-700 " +
  "hover:text-gray-900 font-medium rounded-md px-4 py-2 text-sm font-display " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 " +
  "active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none " +
  "dark:bg-gray-800 dark:border-dark-border dark:text-gray-300 dark:hover:text-gray-100 dark:hover:border-gray-500";

/** Ghost button — transparent bg, muted text, surface hover. */
export const BUTTON_GHOST =
  "bg-transparent text-gray-500 hover:text-gray-700 hover:bg-surface-secondary " +
  "rounded-md px-3 py-2 text-sm transition-colors focus:outline-none " +
  "focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed " +
  "disabled:pointer-events-none " +
  "dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700";

/** Danger button — red bg, white text. */
export const BUTTON_DANGER =
  "bg-red-600 hover:bg-red-700 text-white font-medium rounded-md px-4 py-2 text-sm " +
  "font-display transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30 " +
  "active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

/** Text input, select, textarea base styles — neutral palette, Inter body text. */
export const INPUT_BASE =
  "border border-gray-300 rounded-md bg-white text-gray-900 " +
  "placeholder:text-gray-400 focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 " +
  "focus:outline-none transition-colors text-sm px-3 py-2 font-sans w-full " +
  "disabled:opacity-50 disabled:cursor-not-allowed " +
  "dark:bg-gray-800 dark:border-gray-600 dark:text-gray-100 dark:placeholder:text-gray-500";

/** Form field label — Poppins, warm gray. */
export const INPUT_LABEL = "text-sm font-medium text-gray-700 mb-1.5 font-display";

/** Helper text below a form field. */
export const INPUT_HELPER = "text-xs text-gray-400 mt-1";

/** Validation error text below a form field. */
export const INPUT_ERROR = "text-xs text-red-600 mt-1";

/** Badge / pill base — pill shape, small text. Combine with stage-specific color classes. */
export const BADGE_BASE = "rounded-badge text-xs font-medium px-2.5 py-1 inline-flex items-center gap-1";

/** Modal backdrop — semi-transparent black with blur; fades in on mount. */
export const MODAL_BACKDROP = "fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn";

/** Modal card — large rounded, border-defined, white bg with dark variant; scales in on mount. */
export const MODAL_CARD =
  "bg-white rounded-2xl border border-border-default shadow-modal w-full max-w-lg mx-auto relative animate-scaleIn " +
  "dark:bg-gray-800 dark:border-dark-border";

/** Nav container — white bg, bottom border, no gradient. */
export const NAV_CONTAINER = "bg-white border-b border-border-default dark:bg-gray-900 dark:border-dark-border";

/** Nav link — muted text, warms on hover, Poppins, no background. */
export const NAV_LINK =
  "text-gray-500 hover:text-gray-900 text-sm font-display font-medium transition-colors px-3 py-2 rounded-md dark:text-gray-400 dark:hover:text-gray-100";

/** Active nav link — dark text, warm surface-secondary tint, Poppins. */
export const NAV_LINK_ACTIVE =
  "text-gray-900 bg-surface-secondary text-sm font-display font-medium px-3 py-2 rounded-md dark:text-gray-100 dark:bg-gray-800";

/** Nav brand / logo text — dark, Poppins semibold, tight tracking. */
export const NAV_BRAND = "text-gray-900 font-display font-semibold text-lg tracking-tight dark:text-gray-100";

/** Default badge — warm surface-secondary bg, muted text, pill shape, Poppins. */
export const BADGE_DEFAULT =
  "bg-surface-secondary text-gray-600 text-xs font-display font-medium px-2 py-0.5 rounded-full";

/** Success badge — muted emerald pastel bg, border-defined, pill shape. Maps to Offer pipeline status. */
export const BADGE_SUCCESS =
  "bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-display font-medium px-2 py-0.5 rounded-full";

/** Warning badge — muted amber pastel bg, border-defined, pill shape. Maps to Interview pipeline status. */
export const BADGE_WARNING =
  "bg-amber-50 text-amber-700 border border-amber-200 text-xs font-display font-medium px-2 py-0.5 rounded-full";

/** Error badge — muted red pastel bg, border-defined, pill shape. Maps to Rejected pipeline status. */
export const BADGE_ERROR =
  "bg-red-50 text-red-700 border border-red-200 text-xs font-display font-medium px-2 py-0.5 rounded-full";

/** Info badge — muted blue pastel bg, border-defined, accent-blue text, pill shape. Maps to Applied pipeline status. */
export const BADGE_INFO =
  "bg-blue-50 text-accent-blue border border-blue-200 text-xs font-display font-medium px-2 py-0.5 rounded-full";

/** Tag / filter chip — warm surface bg, muted text, pill shape, subtle hover. */
export const TAG =
  "bg-surface-secondary text-gray-600 text-xs px-2 py-1 rounded-full hover:bg-surface-tertiary transition-colors";

/** Success banner — brand-tinted bg, border-defined, used for confirmation messages on auth pages. */
export const SUCCESS_BANNER =
  "rounded-lg bg-brand-50 border border-brand-200 px-3 py-3 text-sm text-brand-800 " +
  "dark:bg-brand-900/20 dark:border-brand-800 dark:text-brand-300";

/** Readonly / disabled input — gray bg, muted text, not-allowed cursor. */
export const INPUT_READONLY =
  "border border-gray-200 rounded-md bg-gray-50 text-gray-500 text-sm px-3 py-2 font-sans w-full cursor-not-allowed " +
  "dark:bg-gray-900 dark:border-gray-700 dark:text-gray-400";

/** Toggle button — active state (solid brand). Used in view mode toggles. */
export const BUTTON_TOGGLE_ACTIVE =
  "bg-brand-500 text-white rounded-button transition-colors";

/** Toggle button — inactive state (neutral surface). Used in view mode toggles. */
export const BUTTON_TOGGLE_INACTIVE =
  "bg-white text-gray-600 hover:bg-gray-50 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 rounded-button transition-colors";

/** Tooltip — pill-shaped, small text, opacity-based show/hide via group-hover. */
export const TOOLTIP =
  "absolute z-10 whitespace-nowrap rounded-full bg-gray-800 px-2 py-1 text-xs text-white opacity-0 transition-opacity pointer-events-none group-hover:opacity-100";

/** Icon-only button base — rounded-full, padding, hover states, focus ring, transition. */
export const ICON_BUTTON =
  "rounded-full p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200";


/** Menu item — full-width, padding, text alignment, transition. */
export const MENU_ITEM = "w-full px-4 py-2 text-left text-sm transition-colors";

/** Small loading spinner — 24px, brand-500 color, used in inline/compact loading states. */
export const SPINNER_SM = "h-6 w-6 animate-spin rounded-full border-2 border-brand-500 border-t-transparent";

/** Large loading spinner — 32px, brand-500 color, used in full-page loading states. */
export const SPINNER_LG = "h-8 w-8 animate-spin rounded-full border-2 border-brand-500 border-t-transparent";
