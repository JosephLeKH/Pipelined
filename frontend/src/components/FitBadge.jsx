/** Colored pill displaying AI resume-job fit score. */

const FIT_HIGH_MIN = 80;
const FIT_MED_MIN = 50;
const FIT_LOW_MIN = 30;

function fitColor(score) {
  if (score === null || score === undefined) {
    return "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400";
  }
  if (score >= FIT_HIGH_MIN) {
    return "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400";
  }
  if (score >= FIT_MED_MIN) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  }
  if (score >= FIT_LOW_MIN) {
    return "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400";
  }
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
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
