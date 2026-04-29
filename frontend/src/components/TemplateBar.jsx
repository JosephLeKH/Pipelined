/** Template toolbar for ManualAddForm: 'Use template' dropdown and 'Save as template' button. */

import { useState } from "react";

import { useTemplates } from "../hooks/useTemplates";
import { INPUT_BASE, BUTTON_SECONDARY } from "../lib/designTokens";
import TemplateSaveModal from "./TemplateSaveModal";

function TemplateBar({ onApply, fields }) {
  const { data: templates, isLoading, error } = useTemplates();
  const [showSaveModal, setShowSaveModal] = useState(false);

  return (
    <>
      <div className="flex items-center gap-2">
        {error ? (
          <p role="alert" className="flex-1 text-xs text-red-600 dark:text-red-400">
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
            className={`${INPUT_BASE} flex-1 text-sm`}
          >
            <option value="" disabled>Use template…</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        ) : (
          <div className="flex-1" />
        )}
        <button
          type="button"
          onClick={() => setShowSaveModal(true)}
          className={`shrink-0 ${BUTTON_SECONDARY}`}
        >
          Save as template
        </button>
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
