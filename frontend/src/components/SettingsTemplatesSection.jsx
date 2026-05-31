/** Settings section for managing saved application templates. */

import { useState } from "react";

import Check from "lucide-react/dist/esm/icons/check";
import Pencil from "lucide-react/dist/esm/icons/pencil";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import X from "lucide-react/dist/esm/icons/x";

import { useDeleteTemplate, useTemplates, useUpdateTemplate } from "../hooks/useTemplates";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

function TemplateRow({ template }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(template.name);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
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

  const handleDeleteConfirm = () => {
    deleteMutate(template.id);
    setDeleteDialogOpen(false);
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
    <div className="flex items-center gap-3 py-3 border-b border-border-1 last:border-b-0">
      <div className="min-w-0 flex-1">
        {editing ? (
          <Input
            autoFocus
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleRename}
            className="text-sm"
            aria-label="Rename template"
          />
        ) : (
          <>
            <p className="text-sm font-medium text-text-1 truncate">
              {template.name}
            </p>
            {fieldSummary && (
              <p className="text-xs text-text-2 truncate mt-0.5">
                {fieldSummary}
              </p>
            )}
          </>
        )}
      </div>
      <div className="flex items-center gap-1 shrink-0">
        {editing ? (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={handleRename}
              disabled={isUpdating}
              aria-label="Confirm rename"
              className="h-7 w-7 text-brand-600 hover:bg-brand-600/10 hover:text-brand-600"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => { setName(template.name); setEditing(false); }}
              aria-label="Cancel rename"
              className="h-7 w-7 text-text-2 hover:bg-surface-1"
            >
              <X className="h-4 w-4" />
            </Button>
          </>
        ) : (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => setEditing(true)}
            aria-label={`Rename ${template.name}`}
            className="h-7 w-7 text-text-2 hover:bg-surface-1 hover:text-text-1"
          >
            <Pencil className="h-4 w-4" />
          </Button>
        )}
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => setDeleteDialogOpen(true)}
          disabled={isDeleting}
          aria-label={`Delete ${template.name}`}
          className="h-7 w-7 text-text-3 hover:bg-brand-600/10 hover:text-brand-700"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
            <AlertDialogDescription>
              Delete "{template.name}"? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-brand-700 text-white hover:bg-brand-700/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SettingsTemplatesSection() {
  const { data: templates, isLoading, error, refetch } = useTemplates();

  return (
    <div className="rounded-lg bg-surface-0 border border-border-1 p-6">
      <h2 className="mb-1 text-sm font-semibold text-text-1">Templates</h2>
      <p className="mb-5 text-xs text-text-2">
        Saved templates prefill fields in the Add Application form. Up to 10 templates.
      </p>

      {isLoading && (
        <p className="text-sm text-text-2">Loading…</p>
      )}
      {error && (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-sm text-brand-700">
            Failed to load templates.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={refetch}
            aria-label="Retry loading templates"
            className="self-start"
          >
            Try again
          </Button>
        </div>
      )}
      {!isLoading && !error && templates?.length === 0 && (
        <p className="text-sm text-text-2">
          No templates yet. Use the{" "}
          <span className="font-medium text-text-1">
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
