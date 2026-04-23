/**
 * Design token class strings for Pipelined UI components.
 * Import these constants instead of duplicating Tailwind class strings.
 * Every token must use the brand palette and custom theme tokens from tailwind.config.js.
 */

/** Card container — white bg, rounded-xl, border-defined (no shadow), dark variants. */
export const CARD_BASE =
  "bg-white rounded-xl border border-border-default dark:bg-slate-800 dark:border-slate-700";

/** Card hover state — stronger border, no shadow. */
export const CARD_HOVER = "border-border-strong transition-colors";

/** Primary action button — solid clay, white text. */
export const BUTTON_PRIMARY =
  "bg-brand-500 hover:bg-brand-600 text-white font-medium rounded-md px-4 py-2 text-sm " +
  "font-display transition-colors duration-150 focus:outline-none focus:ring-2 " +
  "focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

/** Secondary button — white bg, warm border, warm text. */
export const BUTTON_SECONDARY =
  "bg-white border border-border-default hover:border-border-strong text-gray-700 " +
  "hover:text-gray-900 font-medium rounded-md px-4 py-2 text-sm font-display " +
  "transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

/** Ghost button — transparent bg, muted text, surface hover. */
export const BUTTON_GHOST =
  "bg-transparent text-gray-500 hover:text-gray-700 hover:bg-surface-secondary " +
  "rounded-md px-3 py-2 text-sm transition-colors focus:outline-none " +
  "focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50 disabled:cursor-not-allowed " +
  "disabled:pointer-events-none";

/** Danger button — red bg, white text. */
export const BUTTON_DANGER =
  "bg-red-600 hover:bg-red-700 text-white font-medium rounded-md px-4 py-2 text-sm " +
  "font-display transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

/** Text input, select, textarea base styles. */
export const INPUT_BASE =
  "border border-slate-300 bg-white rounded-input px-3 py-2 text-sm " +
  "placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 " +
  "focus:outline-none transition-colors w-full " +
  "dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500";

/** Badge / pill base — pill shape, small text. Combine with stage-specific color classes. */
export const BADGE_BASE = "rounded-badge text-xs font-medium px-2.5 py-1 inline-flex items-center gap-1";

/** Modal backdrop — semi-transparent black with blur; fades in on mount. */
export const MODAL_BACKDROP = "fixed inset-0 bg-black/30 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn";

/** Modal card — large rounded, border-defined with shadow-lg, white bg with dark variant; scales in on mount. */
export const MODAL_CARD =
  "bg-white rounded-2xl border border-border-default shadow-lg w-full max-w-lg mx-auto relative animate-scaleIn " +
  "dark:bg-slate-800 dark:border dark:border-slate-700";
