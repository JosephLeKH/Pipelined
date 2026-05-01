/** Colored pill displaying AI resume-job fit score. */

const FIT_HIGH_MIN = 80;
const FIT_MED_MIN = 50;
const FIT_LOW_MIN = 30;

const STATUS_HIGH = "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
const STATUS_MEDIUM = "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
const STATUS_LOW = "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400";
const STATUS_CRITICAL = "bg-destructive/10 text-destructive dark:bg-destructive/20 dark:text-destructive";

function fitColor(score) {
  if (score === null || score === undefined) {
    return "bg-muted text-muted-foreground";
  }
  if (score >= FIT_HIGH_MIN) return STATUS_HIGH;
  if (score >= FIT_MED_MIN) return STATUS_MEDIUM;
  if (score >= FIT_LOW_MIN) return STATUS_LOW;
  return STATUS_CRITICAL;
}

function FitBadge({ score }) {
  const label = score === null || score === undefined ? "—" : `${score}%`;
  const colorClass = fitColor(score);

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}
      aria-label={`Fit score: ${label}`}
      data-testid="fit-badge"
    >
      {label}
    </span>
  );
}

export default FitBadge;
