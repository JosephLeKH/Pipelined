/** Reusable empty-state placeholder with icon, text, and optional action buttons. */

function EmptyState({ title, description, icon: Icon, actionButton }) {
  const buttons = actionButton
    ? (Array.isArray(actionButton) ? actionButton : [actionButton])
    : [];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon className="mb-4 h-12 w-12 text-gray-300 dark:text-gray-600" />}
      <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {buttons.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {buttons.map((btn, i) => (
            <button
              key={i}
              type="button"
              onClick={btn.onClick}
              className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
            >
              {btn.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
