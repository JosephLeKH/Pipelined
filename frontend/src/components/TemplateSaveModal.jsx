/** Modal for naming and saving the current form values as a template. */

import { useEffect, useRef, useState } from "react";

import { useCreateTemplate } from "../hooks/useTemplates";
import { MODAL_FOCUS_DELAY_MS } from "../lib/constants";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const MAX_TEMPLATE_NAME_LENGTH = 100;

function TemplateSaveModal({ isOpen, onClose, fields }) {
  const [name, setName] = useState("");
  const [error, setError] = useState(null);
  const inputRef = useRef(null);
  const { mutate, isPending } = useCreateTemplate();

  useEffect(() => {
    if (isOpen) {
      setName("");
      setError(null);
      setTimeout(() => inputRef.current?.focus(), MODAL_FOCUS_DELAY_MS);
    }
  }, [isOpen]);

  function handleSave() {
    const trimmed = name.trim();
    if (!trimmed) { setError("Template name is required."); return; }
    mutate(
      { name: trimmed, fields },
      {
        onSuccess: () => onClose(),
        onError: (err) => setError(err?.message ?? "Failed to save template."),
      }
    );
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") handleSave();
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Save as template</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label htmlFor="template-name-input">Template name</Label>
          <Input
            id="template-name-input"
            ref={inputRef}
            type="text"
            value={name}
            maxLength={MAX_TEMPLATE_NAME_LENGTH}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="e.g. Remote SWE"
          />
          {error && (
            <p role="alert" className="text-xs text-destructive">{error}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Saves: remote status, company type, role type, tags, and compensation.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={handleSave} disabled={isPending}>
            {isPending ? "Saving…" : "Save template"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default TemplateSaveModal;
