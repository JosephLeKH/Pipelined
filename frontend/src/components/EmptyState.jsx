/** Reusable empty-state placeholder with icon/svg, text, and optional action buttons. */

import { Button } from "./ui/button";

function EmptyState({ title, description, icon: Icon, svg, actionButton }) {
  const buttons = actionButton
    ? (Array.isArray(actionButton) ? actionButton : [actionButton])
    : [];

  return (
    <div className="flex flex-col items-center justify-center py-20 max-w-md mx-auto text-center">
      {svg ? <div className="mb-5">{svg}</div> : Icon && <Icon aria-hidden="true" className="mb-4 h-12 w-12 text-muted-foreground" />}
      <h3 className="mb-2 text-base font-medium font-display text-foreground">{title}</h3>
      {description && (
        <p className="mb-6 max-w-sm text-sm font-sans text-muted-foreground">{description}</p>
      )}
      {buttons.length > 0 && (
        <div className="flex flex-wrap justify-center gap-2">
          {buttons.map((btn) => (
            <Button
              key={btn.label}
              type="button"
              onClick={btn.onClick}
            >
              {btn.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmptyState;
