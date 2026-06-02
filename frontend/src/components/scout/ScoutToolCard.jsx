/** Single tool card in Scout's Toolkit. Four state variants. */

import Check from "lucide-react/dist/esm/icons/check";
import Play from "lucide-react/dist/esm/icons/play";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";

const VARIANT_STYLE = {
  ready: "border-border-1 bg-surface-1 hover:bg-surface-2",
  runIt: "border-dashed border-border-1 bg-surface-0 hover:bg-surface-1",
  working: "border-border-1 bg-surface-1 cursor-wait",
  error: "border-red-300 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
};

const VARIANT_LABEL = {
  ready: "Ready",
  runIt: "Run it",
  working: "Working",
  error: "Error",
};

function VariantIcon({ variant }) {
  if (variant === "ready") return <Check className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />;
  if (variant === "runIt") return <Play className="h-3.5 w-3.5 text-text-3" aria-hidden="true" />;
  if (variant === "working")
    return <Loader2 className="h-3.5 w-3.5 motion-safe:animate-spin text-text-3" aria-hidden="true" />;
  if (variant === "error") return <AlertCircle className="h-3.5 w-3.5 text-red-600" aria-hidden="true" />;
  return null;
}

function ScoutToolCard({ variant = "runIt", title, summary, ctaLabel, onClick, onRetry }) {
  const disabled = variant === "working";
  const handler = variant === "error" ? (onRetry ?? (() => {})) : onClick;
  const accessibleCta = variant === "error" ? "Retry" : ctaLabel ?? VARIANT_LABEL[variant];
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={handler}
      aria-label={`${title} — ${VARIANT_LABEL[variant]}${ctaLabel ? `, ${ctaLabel}` : ""}`}
      className={`flex h-full flex-col gap-1 rounded-md border p-3 text-left motion-reduce:transition-none transition-colors duration-hover ease-out focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 ${VARIANT_STYLE[variant]}`}
    >
      <span className="flex items-center gap-1.5 text-xs font-semibold text-text-1">
        <VariantIcon variant={variant} />
        {title}
      </span>
      <span className="text-xs text-text-2">{summary}</span>
      <span className="mt-1 text-[0.6875rem] font-medium uppercase tracking-wide text-brand-600">
        {accessibleCta} {variant !== "working" && variant !== "error" && "→"}
      </span>
    </button>
  );
}

export default ScoutToolCard;
