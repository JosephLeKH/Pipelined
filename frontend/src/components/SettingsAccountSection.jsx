/** Settings account section — change password and danger zone with delete confirmation. */

import { useState, useCallback } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import TriangleAlert from "lucide-react/dist/esm/icons/alert-triangle";

import { PASSWORD_MIN_LENGTH } from "../lib/constants";
import { useChangePassword, useDeleteAccount } from "../hooks/useAuth";
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

const ERROR_MESSAGES = {
  CURRENT_PASSWORD_INCORRECT: "Current password is incorrect.",
  PASSWORD_TOO_WEAK: "New password must have at least 8 characters, one uppercase letter, and one digit.",
};

function PasswordField({ id, label, value, onChange }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} type="password" value={value} onChange={onChange} />
    </div>
  );
}

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState(null);
  const { mutateAsync: changePassword, isPending } = useChangePassword();

  const handleSubmit = useCallback(async () => {
    setPwError(null);
    const trimmedCurrent = current.trim();
    const trimmedNew = newPw.trim();
    const trimmedConfirm = confirm.trim();
    if (!trimmedCurrent) { setPwError("Current password is required."); return; }
    if (trimmedNew.length < PASSWORD_MIN_LENGTH) {
      setPwError(`New password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
      return;
    }
    if (trimmedNew !== trimmedConfirm) { setPwError("Passwords do not match."); return; }
    try {
      await changePassword({ current_password: trimmedCurrent, new_password: trimmedNew });
      toast.success("Password changed successfully.");
      setCurrent(""); setNewPw(""); setConfirm("");
    } catch (err) {
      const code = err?.response?.data?.detail?.code;
      setPwError(ERROR_MESSAGES[code] ?? "Failed to change password. Please try again.");
    }
  }, [current, newPw, confirm, changePassword]);

  return (
    <div className="rounded-xl bg-card border border-border p-6">
      <h2 className="mb-1 text-lg font-semibold font-display text-foreground">Change password</h2>
      <p className="mb-5 text-sm text-muted-foreground">
        Update your account password. Choose a strong password you don&apos;t use elsewhere.
      </p>
      <div className="flex max-w-sm flex-col gap-4">
        <PasswordField id="pw-current" label="Current password" value={current} onChange={(e) => setCurrent(e.target.value)} />
        <PasswordField id="pw-new" label="New password" value={newPw} onChange={(e) => setNewPw(e.target.value)} />
        <PasswordField id="pw-confirm" label="Confirm new password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {pwError && <p role="alert" className="text-sm text-destructive">{pwError}</p>}
        <div className="flex justify-end">
          <Button type="button" onClick={handleSubmit} disabled={isPending} className="flex items-center gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Change password
          </Button>
        </div>
      </div>
    </div>
  );
}

function DeleteAccountModal({ isOpen, onClose, onConfirm, isPending }) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Delete account?</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          This will permanently delete your account and all data. This action cannot be undone.
        </p>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isPending} className="flex items-center gap-2">
            {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Delete my account
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DangerZone() {
  const [showModal, setShowModal] = useState(false);
  const navigate = useNavigate();
  const { mutateAsync: deleteAccount, isPending } = useDeleteAccount();

  const handleDelete = useCallback(async () => {
    try {
      await deleteAccount();
      toast.success("Account deleted.");
      navigate("/");
    } catch {
      toast.error("Failed to delete account. Please try again.");
    }
  }, [deleteAccount, navigate]);

  return (
    <>
      <div className="rounded-xl border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-900/20">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold font-display text-rose-900 dark:text-rose-200">Danger zone</h2>
            <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
              Permanently delete your account and all associated data — applications, calendar events,
              contacts, and resume. This cannot be undone.
            </p>
            <Button type="button" variant="outline" onClick={() => setShowModal(true)}
              className="mt-4 border-rose-300 text-rose-700 hover:bg-rose-100 hover:text-rose-700 focus:ring-rose-400 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/40">
              Delete account
            </Button>
          </div>
        </div>
      </div>
      <DeleteAccountModal isOpen={showModal} onClose={() => setShowModal(false)} onConfirm={handleDelete} isPending={isPending} />
    </>
  );
}

function SettingsAccountSection() {
  return (
    <div className="flex flex-col gap-4">
      <ChangePasswordCard />
      <DangerZone />
    </div>
  );
}

export default SettingsAccountSection;
