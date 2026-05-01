/** Template toolbar for ManualAddForm: 'Use template' dropdown and 'Save as template' button. */

import { useState } from "react";

import { useTemplates } from "../hooks/useTemplates";
import { Button } from "./ui/button";
import TemplateSaveModal from "./TemplateSaveModal";

const SELECT_CLS = "border border-input rounded-md bg-background text-foreground focus:border-ring focus:ring-1 focus:ring-ring/20 focus:outline-none transition-colors text-sm px-3 py-2 font-sans w-full";

function TemplateBar({ onApply, fields }) {
  const { data: templates, isLoading, error } = useTemplates();
  const [showSaveModal, setShowSaveModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        {error ? (
          <p role="alert" className="flex-1 text-xs text-destructive">
            Failed to load templates.
          </p>
        ) : isLoading ? (
          <div className="flex-1" />
        ) : templates?.length > 0 ? (
          <select
            aria-label="Use template"
            defaultValue=""
            onChange={(e) => {
              const t = templates.find((tmpl) => tmpl.id === e.target.value);
              if (t) onApply(t);
              e.target.value = "";
            }}
            className={`${SELECT_CLS} flex-1 text-sm`}
          >
            <option value="" disabled>Use template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        ) : (
          <div className="flex-1" />
        )}
        <Button
          type="button"
          variant="outline"
          onClick={() => setShowSaveModal(true)}
          className="shrink-0"
        >
          Save as template
        </Button>
      </div>
      <TemplateSaveModal
        isOpen={showSaveModal}
        onClose={() => setShowSaveModal(false)}
        fields={fields}
      />
    </>
  );
}

export default TemplateBar;
