/** Labeled form field wrapper with optional inline error message. */

import { cloneElement, Children } from "react";

function FormField({ label, htmlFor, children, error }) {
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;
  const child = Children.only(children);
  const enhancedChild = cloneElement(child, {
    ...(error && errorId ? { "aria-describedby": errorId } : {}),
  });

  return (
    <div className="flex flex-col gap-1">
      <label className="text-sm font-medium text-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      {enhancedChild}
      {error && <p id={errorId} className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default FormField;
