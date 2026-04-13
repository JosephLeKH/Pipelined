/**
 * Design token class strings for Pipelined UI components.
 * Import these constants instead of duplicating Tailwind class strings.
 * Every token must use the brand palette and custom theme tokens from tailwind.config.js.
 */

/** Card container — white bg, rounded-card, card shadow, subtle border, dark variants. */
export const CARD_BASE =
  "bg-white rounded-card shadow-card border border-slate-200/60 dark:bg-slate-800 dark:border-slate-700";

/** Primary action button — indigo-to-violet gradient, white text, micro-interactions. */
export const BUTTON_PRIMARY =
  "bg-gradient-to-r from-brand-600 to-brand-500 text-white rounded-button shadow-sm " +
  "hover:from-brand-700 hover:to-brand-600 active:scale-[0.98] transition-all duration-150 " +
  "font-medium px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

/** Secondary button — white bg, slate border, slate text. */
export const BUTTON_SECONDARY =
  "bg-white border border-slate-300 text-slate-700 rounded-button " +
  "hover:bg-slate-50 active:scale-[0.98] transition-all duration-150 " +
  "font-medium px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-brand-500/30 " +
  "dark:bg-slate-800 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-700 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

/** Ghost button — transparent bg, slate text, subtle hover. */
export const BUTTON_GHOST =
  "text-slate-600 hover:bg-slate-100 rounded-button active:scale-[0.98] " +
  "transition-all duration-150 font-medium px-4 py-2.5 focus:outline-none " +
  "focus:ring-2 focus:ring-brand-500/30 dark:text-slate-300 dark:hover:bg-slate-700 " +
  "disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none";

/** Text input, select, textarea base styles. */
export const INPUT_BASE =
  "border border-slate-300 bg-white rounded-input px-3 py-2 text-sm " +
  "placeholder:text-slate-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 " +
  "focus:outline-none transition-colors w-full " +
  "dark:bg-slate-800 dark:border-slate-600 dark:text-slate-100 dark:placeholder:text-slate-500";

/** Badge / pill base — pill shape, small text. Combine with stage-specific color classes. */
export const BADGE_BASE = "rounded-badge text-xs font-medium px-2.5 py-1 inline-flex items-center gap-1";

/** Modal backdrop — semi-transparent black with blur. */
export const MODAL_BACKDROP = "fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4";

/** Modal card — large rounded, modal shadow, white bg with dark variant. */
export const MODAL_CARD =
  "bg-white rounded-2xl shadow-modal w-full max-w-lg mx-auto relative " +
  "dark:bg-slate-800 dark:border dark:border-slate-700";
