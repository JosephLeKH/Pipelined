/**
 * Design token class strings for Pipelined UI components.
 * Import these constants instead of duplicating Tailwind class strings.
 * Every token must use the brand palette and custom theme tokens from tailwind.config.js.
 */

/** Card container — surface bg, rounded-lg, border-defined (no shadow). */
export const CARD_BASE =
  "bg-surface-0 rounded-lg border border-border-1 dark:bg-surface-0 dark:border-border-1";

/** Card hover state — stronger border, no shadow. */
export const CARD_HOVER = "border-border-2 transition-[border-color] duration-hover ease-out";

/** Primary action button — Cardinal Red, white text. */
export const BUTTON_PRIMARY =
  "bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-medium rounded-md px-4 py-2 text-sm " +
  "transition-[background-color,color] duration-hover ease-out focus:outline-none focus-visible:outline focus-visible:outline-2 " +
  "focus-visible:outline-brand-600 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

/** Secondary button — surface-2 bg, border, primary text. */
export const BUTTON_SECONDARY =
  "bg-surface-2 border border-border-1 hover:bg-surface-3 text-text-1 " +
  "font-medium rounded-md px-4 py-2 text-sm " +
  "transition-[background-color,color] duration-hover ease-out focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

/** Ghost button — transparent bg, muted text, surface hover. */
export const BUTTON_GHOST =
  "bg-transparent text-text-2 hover:text-text-1 hover:bg-surface-2 " +
  "rounded-md px-3 py-2 text-sm transition-[background-color,color] duration-hover ease-out focus:outline-none " +
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed " +
  "disabled:pointer-events-none";

/** Danger button — subtle red text on transparent (Linear pattern). */
export const BUTTON_DANGER =
  "bg-transparent hover:bg-brand-50 text-brand-700 font-medium rounded-md px-4 py-2 text-sm " +
  "transition-[background-color,color] duration-hover ease-out focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

/** Text input, select, textarea base styles — semantic palette, Inter body text. */
export const INPUT_BASE =
  "border border-border-1 rounded-md bg-surface-0 text-text-1 " +
  "placeholder:text-text-3 focus:border-border-3 focus-visible:outline focus-visible:outline-1 focus-visible:outline-brand-600 " +
  "focus:outline-none transition-[border-color,outline] duration-hover ease-out text-sm px-3 py-2 font-sans w-full " +
  "disabled:opacity-50 disabled:cursor-not-allowed";

/** Form field label — Inter medium, foreground color. */
export const INPUT_LABEL = "text-sm font-medium text-text-1 mb-1.5";

/** Helper text below a form field. */
export const INPUT_HELPER = "text-xs text-text-3 mt-1";

/** Validation error text below a form field. */
export const INPUT_ERROR = "text-xs text-brand-700 mt-1";

/** Badge / pill base — small text. Combine with stage-specific color classes. */
export const BADGE_BASE = "rounded-sm text-xs font-medium px-2.5 py-1 inline-flex items-center gap-1";

/** Modal backdrop — semi-transparent black with blur; fades in on mount. */
export const MODAL_BACKDROP =
  "fixed inset-0 bg-black/40 backdrop-blur-[4px] dark:bg-black/60 z-50 flex items-center justify-center p-4 animate-fadeIn";

/** Modal card — xl rounded, border-defined, surface bg; scales in on mount. */
export const MODAL_CARD =
  "bg-surface-0 rounded-xl border border-border-1 shadow-modal w-full max-w-lg mx-auto relative animate-scaleIn " +
  "dark:bg-surface-0 dark:border-border-1";

/** Nav container — surface bg, bottom border, no gradient. */
export const NAV_CONTAINER = "bg-surface-0 border-b border-border-1 dark:bg-surface-0 dark:border-border-1";

/** Nav link — muted text, warms on hover, no background. */
export const NAV_LINK =
  "text-text-2 hover:text-text-1 text-sm font-medium transition-[color] duration-hover-text ease-out px-3 py-2 rounded-md";

/** Active nav link — brand text, semibold, no background. */
export const NAV_LINK_ACTIVE =
  "text-brand-600 text-sm font-semibold px-3 py-2 rounded-md";

/** Nav brand / logo text — foreground, semibold, tight tracking. */
export const NAV_BRAND = "text-text-1 font-semibold text-lg tracking-tight";

/** Default badge — surface-1 bg, muted text. */
export const BADGE_DEFAULT =
  "bg-surface-1 text-text-2 text-xs font-medium px-2 py-0.5 rounded-sm";

/** Success badge — status success dot palette. */
export const BADGE_SUCCESS =
  "bg-surface-2 text-status-success text-xs font-medium px-2 py-0.5 rounded-sm";

/** Warning badge — status warn dot palette. */
export const BADGE_WARNING =
  "bg-surface-2 text-status-warn text-xs font-medium px-2 py-0.5 rounded-sm";

/** Error badge — brand subtle red. */
export const BADGE_ERROR =
  "bg-brand-50 text-brand-700 text-xs font-medium px-2 py-0.5 rounded-sm";

/** Info badge — status info color. Maps to Applied pipeline status. */
export const BADGE_INFO =
  "bg-surface-2 text-status-info text-xs font-medium px-2 py-0.5 rounded-sm";

/** Tag / filter chip — surface bg, muted text, subtle hover. */
export const TAG =
  "bg-surface-1 text-text-2 text-xs px-2 py-1 rounded-sm hover:bg-surface-2 transition-[background-color] duration-hover ease-out";

/** Success banner — brand-tinted bg, border-defined. */
export const SUCCESS_BANNER =
  "rounded-lg bg-brand-50 border border-brand-200 px-3 py-3 text-sm text-brand-900";

/** Readonly / disabled input — surface-2 bg, muted text. */
export const INPUT_READONLY =
  "border border-border-1 rounded-md bg-surface-2 text-text-3 text-sm px-3 py-2 font-sans w-full cursor-not-allowed";

/** Toggle button — active state (solid brand). */
export const BUTTON_TOGGLE_ACTIVE =
  "bg-brand-600 text-white rounded-md transition-[background-color] duration-hover ease-out";

/** Toggle button — inactive state (neutral surface). */
export const BUTTON_TOGGLE_INACTIVE =
  "bg-surface-0 text-text-2 hover:bg-surface-2 rounded-md transition-[background-color] duration-hover ease-out";

/** Tooltip — small text, opacity-based show/hide via group-hover. */
export const TOOLTIP =
  "absolute z-10 whitespace-nowrap rounded-md bg-text-1 px-2 py-1 text-[0.6875rem] text-surface-0 opacity-0 transition-opacity pointer-events-none group-hover:opacity-100 dark:bg-surface-2 dark:text-text-1";

/** Icon-only button base — rounded-md, padding, hover states, focus ring. */
export const ICON_BUTTON =
  "rounded-md p-1.5 text-text-2 hover:bg-surface-2 hover:text-text-1 transition-[background-color,color] duration-hover ease-out focus:outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2";

/** Menu item — full-width, padding, text alignment, transition. */
export const MENU_ITEM = "w-full px-4 py-2 text-left text-sm transition-[background-color,color] duration-hover ease-out";

/** Small loading spinner — 24px, brand-600 color. */
export const SPINNER_SM = "h-6 w-6 animate-spin rounded-full border-2 border-brand-600 border-t-transparent";

/** Large loading spinner — 32px, brand-600 color. */
export const SPINNER_LG = "h-8 w-8 animate-spin rounded-full border-2 border-brand-600 border-t-transparent";

/** FitBadge tier colors — AI resume-job fit score pill palette. */
export const BADGE_FIT_HIGH = "bg-surface-2 text-status-success";
export const BADGE_FIT_MEDIUM = "bg-surface-2 text-status-warn";
export const BADGE_FIT_LOW = "bg-surface-2 text-status-orange";
export const BADGE_FIT_CRITICAL = "bg-brand-50 text-brand-700";
