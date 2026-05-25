/** Settings sub-page shell — title, field blocks, sticky save footer when dirty. */

import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { Button } from "./ui/button";

export function SettingsFieldBlock({ label, help, children, htmlFor }) {
  const LabelTag = htmlFor ? "label" : "span";
  return (
    <div className="flex flex-col gap-1">
      <LabelTag htmlFor={htmlFor} className="text-[13px] font-medium text-text-1">
        {label}
      </LabelTag>
      {children}
      {help ? <p className="mt-1 text-xs text-text-3">{help}</p> : null}
    </div>
  );
}

export function SettingsSectionDivider() {
  return <div className="my-8 border-t border-border-1" aria-hidden="true" />;
}

function SettingsSaveFooter({ dirty, isSaving, savedAck, onSave, onCancel }) {
  const visible = dirty || savedAck || isSaving;
  if (!visible) {
    return null;
  }

  const showSaved = savedAck && !isSaving;

  return (
    <footer
      className="sticky bottom-0 z-10 -mx-6 mt-8 flex items-center justify-end gap-3 border-t border-border-1 bg-surface-0 px-6 py-4 motion-reduce:transition-none"
      aria-live="polite"
    >
      {showSaved ? (
        <span className="mr-auto text-sm text-text-2">Saved</span>
      ) : null}
      {dirty && !showSaved ? (
        <>
          <Button type="button" variant="secondary" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          <Button type="button" onClick={onSave} disabled={isSaving} className="min-w-[4.5rem]">
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : null}
            Save
          </Button>
        </>
      ) : null}
    </footer>
  );
}

function SettingsPageShell({
  title,
  subtitle,
  children,
  dirty = false,
  isSaving = false,
  savedAck = false,
  onSave,
  onCancel,
  error = null,
  showFooter = Boolean(onSave),
}) {
  return (
    <div className="flex min-h-full flex-col pb-4">
      <h2 className="text-display-md text-text-1">{title}</h2>
      {subtitle ? <p className="mt-6 text-sm text-text-2">{subtitle}</p> : null}

      <div className="mt-8 flex flex-col gap-6">{children}</div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-brand-700 dark:text-brand-300">
          {error}
        </p>
      ) : null}

      {showFooter && onSave && onCancel ? (
        <SettingsSaveFooter
          dirty={dirty}
          isSaving={isSaving}
          savedAck={savedAck}
          onSave={onSave}
          onCancel={onCancel}
        />
      ) : null}
    </div>
  );
}

export default SettingsPageShell;
