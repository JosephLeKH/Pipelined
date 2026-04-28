/** Settings account section — change password and danger zone with delete confirmation. */

import { useState, useCallback } from "react";

import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import TriangleAlert from "lucide-react/dist/esm/icons/alert-triangle";

import { CARD_BASE, INPUT_BASE, INPUT_LABEL, BUTTON_PRIMARY, BUTTON_SECONDARY, BUTTON_DANGER, MODAL_BACKDROP, MODAL_CARD } from "../lib/designTokens";
import { PASSWORD_MIN_LENGTH } from "../lib/constants";
import { useChangePassword, useDeleteAccount } from "../hooks/useAuth";

const ERROR_MESSAGES = {
  CURRENT_PASSWORD_INCORRECT: "Current password is incorrect.",
  PASSWORD_TOO_WEAK: "New password must have at least 8 characters, one uppercase letter, and one digit.",
};

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
      setCurrent("");
      setNewPw("");
      setConfirm("");
    } catch (err) {
      const code = err?.response?.data?.detail?.code;
      setPwError(ERROR_MESSAGES[code] ?? "Failed to change password. Please try again.");
    }
  }, [current, newPw, confirm, changePassword]);

  return (
    <div className={`${CARD_BASE} p-6`}>
      <h2 className="mb-1 text-lg font-semibold font-display text-gray-900 dark:text-gray-100">
        Change password
      </h2>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Update your account password. Choose a strong password you don't use elsewhere.
      </p>
      <div className="flex max-w-sm flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pw-current" className={INPUT_LABEL}>
            Current password
          </label>
          <input
            id="pw-current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className={INPUT_BASE}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pw-new" className={INPUT_LABEL}>
            New password
          </label>
          <input
            id="pw-new"
            type="password"
            value={newPw}
            onChange={(e) => setNewPw(e.target.value)}
            className={INPUT_BASE}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="pw-confirm" className={INPUT_LABEL}>
            Confirm new password
          </label>
          <input
            id="pw-confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={INPUT_BASE}
          />
        </div>
        {pwError && (
          <p role="alert" className="text-sm text-red-600 dark:text-red-400">{pwError}</p>
        )}
        <div className="flex justify-end">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
            className={`flex items-center gap-2 ${BUTTON_PRIMARY}`}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Change password
          </button>
        </div>
      </div>
    </div>
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
      <div className="rounded-card border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-900/20">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold font-display text-rose-900 dark:text-rose-200">Danger zone</h2>
            <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
              Permanently delete your account and all associated data — applications, calendar events,
              contacts, and resume. This cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-4 rounded-button border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 transition-colors focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/40"
            >
              Delete account
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div
          className={MODAL_BACKDROP}
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-acct-title"
        >
          <div className={`${MODAL_CARD} max-w-sm p-6`}>
            <h3
              id="delete-acct-title"
              className="text-base font-semibold text-gray-900 dark:text-gray-100"
            >
              Delete account?
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              This will permanently delete your account and all data. This action cannot be undone.
            </p>
            <div className="mt-5 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={`rounded-button ${BUTTON_SECONDARY}`}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDelete}
                disabled={isPending}
                className={`flex items-center gap-2 rounded-button ${BUTTON_DANGER}`}
              >
                {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                Delete my account
              </button>
            </div>
          </div>
        </div>
      )}
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
