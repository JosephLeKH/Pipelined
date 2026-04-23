/** Reusable empty-state placeholder with icon, text, and optional action buttons. */

import { BUTTON_PRIMARY } from "../lib/designTokens";

function EmptyState({ title, description, icon: Icon, actionButton }) {
  const buttons = actionButton
    ? (Array.isArray(actionButton) ? actionButton : [actionButton])
    : [];

  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {Icon && <Icon className="mb-4 h-10 w-10 text-gray-300 dark:text-gray-600" />}
      <h3 className="mb-2 text-sm font-medium font-display text-gray-900 dark:text-gray-100">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-xs font-sans text-gray-500 dark:text-gray-400">{description}</p>
      )}
      {buttons.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {buttons.map((btn, i) => (
            <button
              key={i}
              type="button"
              onClick={btn.onClick}
              className={`${BUTTON_PRIMARY} text-sm`}
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
