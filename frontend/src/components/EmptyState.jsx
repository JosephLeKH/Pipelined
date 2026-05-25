/** Reusable empty-state placeholder with icon, text, and optional action. */

import { isValidElement } from "react";

import { Button } from "./ui/button";

function isIconComponent(icon) {
  if (typeof icon === "function") return true;
  return Boolean(icon && typeof icon === "object" && typeof icon.render === "function");
}

function renderIcon(icon) {
  if (!icon) return null;
  if (isValidElement(icon)) return icon;
  if (isIconComponent(icon)) {
    const Icon = icon;
    return <Icon aria-hidden="true" className="h-8 w-8 text-text-3" />;
  }
  return null;
}

function renderLegacyActions(actionButton) {
  if (!actionButton) return null;
  const buttons = Array.isArray(actionButton) ? actionButton : [actionButton];
  return (
    <div className="mt-4 flex flex-wrap justify-center gap-2">
      {buttons.map((btn) => (
        <Button key={btn.label} type="button" onClick={btn.onClick} variant="default" size="sm">
          {btn.label}
        </Button>
      ))}
    </div>
  );
}

function EmptyState({ title, description, icon, svg, action, actionButton, children }) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-12 text-center">
      {svg ? <div className="mb-4">{svg}</div> : icon ? <div className="mb-4">{renderIcon(icon)}</div> : null}
      <h3 className="text-sm font-semibold text-text-1">{title}</h3>
      {description && (
        <p className="mt-1 max-w-[320px] text-[13px] text-text-2">{description}</p>
      )}
      {children}
      {action ? <div className="mt-4">{action}</div> : renderLegacyActions(actionButton)}
    </div>
  );
}

export default EmptyState;
