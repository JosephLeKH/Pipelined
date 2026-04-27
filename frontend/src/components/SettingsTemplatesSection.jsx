/** Settings section for managing saved application templates. */

import { useState } from "react";

import Check from "lucide-react/dist/esm/icons/check";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";

import { CARD_BASE, INPUT_BASE } from "../lib/designTokens";
import { useDeleteTemplate, useTemplates, useUpdateTemplate } from "../hooks/useTemplates";

function TemplateRow({ template }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(template.name);
  const { mutate: updateMutate, isPending: isUpdating } = useUpdateTemplate();
  const { mutate: deleteMutate, isPending: isDeleting } = useDeleteTemplate();

  const handleRename = () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === template.name) {
      setName(template.name);
      setEditing(false);
      return;
    }
    updateMutate(
      { id: template.id, body: { name: trimmed } },
      { onSuccess: () => setEditing(false) }
    );
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleRename();
    if (e.key === "Escape") { setName(template.name); setEditing(false); }
  };

  const fieldSummary = [
    template.fields.remote_status,
    template.fields.company_type,
    template.fields.role_type,
    template.fields.compensation,
    template.fields.tags?.length ? `tags: ${template.fields.tags.join(", ")}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="flex items-center gap-3 py-3 border-b border-gray-100 dark:border-gray-700 last:border-b-0">
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRename}
            className={`${INPUT_BASE} text-sm`}
            aria-label="Rename template"
          />
        ) : (
          <>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
              {template.name}
            </p>
            {fieldSummary && (
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                {fieldSummary}
              </p>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {editing ? (
          <>
            <button
              type="button"
              onClick={handleRename}
              disabled={isUpdating}
              aria-label="Confirm rename"
              className="rounded p-1 text-brand-600 hover:bg-brand-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:hover:bg-brand-900/20"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => { setName(template.name); setEditing(false); }}
              aria-label="Cancel rename"
              className="rounded p-1 text-gray-400 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:hover:bg-gray-700"
            >
              <X className="h-4 w-4" />
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            aria-label={`Rename ${template.name}`}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          >
            <Pencil className="h-4 w-4" />
          </button>
        )}
        <button
          type="button"
          onClick={() => deleteMutate(template.id)}
          disabled={isDeleting}
          aria-label={`Delete ${template.name}`}
          className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:hover:bg-rose-900/20 dark:hover:text-rose-400"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function SettingsTemplatesSection() {
  const { data: templates, isLoading, error } = useTemplates();

  return (
    <div className={`${CARD_BASE} p-6`}>
      <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">Templates</h2>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Saved templates prefill fields in the Add Application form. Up to 10 templates.
      </p>

      {isLoading && (
        <p className="text-sm text-gray-500 dark:text-gray-400">Loading…</p>
      )}
      {error && (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          Failed to load templates.
        </p>
      )}
      {!isLoading && !error && templates?.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No templates yet. Use the{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">
            "Save as template"
          </span>{" "}
          button when adding an application.
        </p>
      )}
      {!isLoading && !error && templates?.length > 0 && (
        <div>
          {templates.map((t) => (
            <TemplateRow key={t.id} template={t} />
          ))}
        </div>
      )}
    </div>
  );
}

export default SettingsTemplatesSection;
