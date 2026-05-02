/** Template toolbar for ManualAddForm: 'Use template' dropdown and 'Save as template' button. */

import { useState } from "react";

import { useTemplates } from "../hooks/useTemplates";
import { Button } from "./ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import TemplateSaveModal from "./TemplateSaveModal";

function TemplateBar({ onApply, fields }) {
  const { data: templates, isLoading, error } = useTemplates();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  function handleTemplateChange(value) {
    const t = templates.find((tmpl) => tmpl.id === value);
    if (t) onApply(t);
    setSelectedTemplate("");
  }

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
          <Select value={selectedTemplate} onValueChange={handleTemplateChange}>
            <SelectTrigger className="flex-1 text-sm" aria-label="Use template">
              <SelectValue placeholder="Use template…" />
            </SelectTrigger>
            <SelectContent>
              {templates.map((t) => (
                <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
