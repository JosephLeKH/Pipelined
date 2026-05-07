/** Row-level action menu, delete confirmation modal, and bulk action bar for ApplicationList. */

import { useState } from "react";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import MoreHorizontal from "lucide-react/dist/esm/icons/more-horizontal";

import { useAuth } from "../context/AuthContext";
import { BULK_EDIT_MAX_IDS } from "../lib/constants";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Input } from "./ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

export function RowMenu({ application, onArchive, onUnarchive, onDelete }) {
  return (
    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Application actions"
            className="h-7 w-7 rounded text-muted-foreground"
          >
            <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          {application.archived ? (
            <DropdownMenuItem onClick={() => onUnarchive(application.id)}>
              Unarchive
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onClick={() => onArchive(application.id)}>
              Archive
            </DropdownMenuItem>
          )}
          <DropdownMenuItem
            onClick={() => onDelete(application.id)}
            className="text-destructive focus:text-destructive"
          >
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function DeleteConfirmModal({ appId, onConfirm, onCancel }) {
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete application?</DialogTitle>
          <DialogDescription>
            This will permanently delete the application and cannot be undone.
            Consider archiving instead.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} autoFocus>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={() => onConfirm(appId)}>
            Delete
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function BulkDeleteConfirmModal({ count, onConfirm, onCancel }) {
  const label = count === 1 ? "application" : "applications";
  return (
    <Dialog open onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete {count} {label}?</DialogTitle>
          <DialogDescription>
            This will permanently delete {count} {label} and cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel} autoFocus>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Delete {count}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function BulkMoveControls({ stageOptions, selectedStage, setSelectedStage, isMoving, isBusy, onMove }) {
  return (
    <>
      <Select value={selectedStage || undefined} onValueChange={setSelectedStage} disabled={isBusy}>
        <SelectTrigger className="h-8 w-auto min-w-[140px] text-sm" aria-label="Move to stage">
          <SelectValue placeholder="Move to stage…" />
        </SelectTrigger>
        <SelectContent>
          {stageOptions.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
        </SelectContent>
      </Select>
      <Button type="button" size="sm" disabled={!selectedStage || isBusy} onClick={onMove}
        aria-busy={isMoving} className="flex items-center gap-1">
        {isMoving && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        Move
      </Button>
    </>
  );
}

function BulkEditControls({ followUpDate, setFollowUpDate, tagsAdd, setTagsAdd, tagsRemove, setTagsRemove, isBusy, overLimit, isEditing, onApply }) {
  return (
    <>
      <Input type="date" aria-label="Follow-up date" value={followUpDate}
        onChange={(e) => setFollowUpDate(e.target.value)} disabled={isBusy || overLimit} className="h-8 w-auto text-sm" />
      <Input type="text" aria-label="Tags to add" placeholder="Tags to add…" value={tagsAdd}
        onChange={(e) => setTagsAdd(e.target.value)} disabled={isBusy || overLimit} className="h-8 w-36 text-sm" />
      <Input type="text" aria-label="Tags to remove" placeholder="Tags to remove…" value={tagsRemove}
        onChange={(e) => setTagsRemove(e.target.value)} disabled={isBusy || overLimit} className="h-8 w-36 text-sm" />
      <Button type="button" size="sm" disabled={isBusy || overLimit} onClick={onApply}
        className="flex items-center gap-1">
        {isEditing && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        Apply
      </Button>
    </>
  );
}

function BulkDangerControls({ selectedCount, isMerging, isDeleting, isBusy, onMerge, onDeleteSelected }) {
  return (
    <>
      {selectedCount === 2 && (
        <Button type="button" size="sm" disabled={isBusy} onClick={onMerge}
          className="flex items-center gap-1">
          {isMerging && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Merge
        </Button>
      )}
      <Button type="button" size="sm" variant="destructive" disabled={isBusy} onClick={onDeleteSelected}
        className="flex items-center gap-1">
        {isDeleting && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        Delete selected
      </Button>
    </>
  );
}

export function BulkActionBar({ selectedCount, onMoveToStage, onDeleteSelected, onMerge, onBulkEdit, isDeleting = false, isMoving = false, isMerging = false, isEditing = false }) {
  const { user } = useAuth();
  const stageOptions = user?.default_stages ?? [];
  const [selectedStage, setSelectedStage] = useState("");
  const [followUpDate, setFollowUpDate] = useState("");
  const [tagsAdd, setTagsAdd] = useState("");
  const [tagsRemove, setTagsRemove] = useState("");
  const isBusy = isDeleting || isMoving || isMerging || isEditing;
  const overLimit = selectedCount > BULK_EDIT_MAX_IDS;

  function handleMove() {
    if (!selectedStage || isBusy) return;
    onMoveToStage(selectedStage);
    setSelectedStage("");
  }

  function handleApply() {
    if (isBusy || overLimit) return;
    const update = {};
    if (followUpDate) update.follow_up_date = followUpDate;
    const addList = tagsAdd.split(",").map((t) => t.trim()).filter(Boolean);
    const removeList = tagsRemove.split(",").map((t) => t.trim()).filter(Boolean);
    if (addList.length) update.tags_add = addList;
    if (removeList.length) update.tags_remove = removeList;
    if (!Object.keys(update).length) return;
    onBulkEdit(update);
    setFollowUpDate(""); setTagsAdd(""); setTagsRemove("");
  }

  return (
    <div role="toolbar" aria-label="Bulk actions" className="flex flex-wrap items-center gap-3 rounded-md border border-primary/20 bg-primary/10 px-4 py-2 text-sm">
      <span className="font-medium text-primary">{selectedCount} selected</span>
      {overLimit && <span className="text-warning">Select {BULK_EDIT_MAX_IDS} or fewer to use bulk edit</span>}
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <BulkMoveControls stageOptions={stageOptions} selectedStage={selectedStage} setSelectedStage={setSelectedStage} isMoving={isMoving} isBusy={isBusy} onMove={handleMove} />
        <BulkEditControls followUpDate={followUpDate} setFollowUpDate={setFollowUpDate} tagsAdd={tagsAdd} setTagsAdd={setTagsAdd} tagsRemove={tagsRemove} setTagsRemove={setTagsRemove} isBusy={isBusy} overLimit={overLimit} isEditing={isEditing} onApply={handleApply} />
        <BulkDangerControls selectedCount={selectedCount} isMerging={isMerging} isDeleting={isDeleting} isBusy={isBusy} onMerge={onMerge} onDeleteSelected={onDeleteSelected} />
      </div>
    </div>
  );
}
