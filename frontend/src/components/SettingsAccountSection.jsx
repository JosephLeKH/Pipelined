/** Settings account section — change password and danger zone with delete confirmation. */

import { useState, useCallback } from "react";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import TriangleAlert from "lucide-react/dist/esm/icons/alert-triangle";

import { CARD_BASE, INPUT_BASE, INPUT_LABEL, BUTTON_PRIMARY } from "../lib/designTokens";

const PW_MIN_LENGTH = 8;

function ChangePasswordCard() {
  const [current, setCurrent] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pwError, setPwError] = useState(null);
  const [pwSaved, setPwSaved] = useState(false);
  const [isPending, setIsPending] = useState(false);

  const handleSubmit = useCallback(async () => {
    setPwError(null);
    setPwSaved(false);
    if (!current) { setPwError("Current password is required."); return; }
    if (newPw.length < PW_MIN_LENGTH) {
      setPwError(`New password must be at least ${PW_MIN_LENGTH} characters.`);
      return;
    }
    if (newPw !== confirm) { setPwError("Passwords do not match."); return; }
    setIsPending(true);
    try {
      // TODO: wire to changePassword API when available (US-future)
      await new Promise((r) => setTimeout(r, 400));
      setPwSaved(true);
      setCurrent("");
      setNewPw("");
      setConfirm("");
    } catch {
      setPwError("Failed to change password. Please try again.");
    } finally {
      setIsPending(false);
    }
  }, [current, newPw, confirm]);

  return (
    <div className={`${CARD_BASE} p-6`}>
      <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
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
        {pwSaved && !isPending && (
          <p role="alert" className="rounded bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
            Password changed successfully.
          </p>
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

  return (
    <>
      <div className="rounded-card border border-rose-200 bg-rose-50 p-6 dark:border-rose-800 dark:bg-rose-900/20">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400" aria-hidden="true" />
          <div className="flex-1">
            <h2 className="text-lg font-semibold text-rose-900 dark:text-rose-200">Danger zone</h2>
            <p className="mt-1 text-sm text-rose-700 dark:text-rose-300">
              Permanently delete your account and all associated data — applications, calendar events,
              contacts, and resume. This cannot be undone.
            </p>
            <button
              type="button"
              onClick={() => setShowModal(true)}
              className="mt-4 rounded-button border border-rose-300 px-4 py-2 text-sm font-medium text-rose-700 hover:bg-rose-100 focus:outline-none focus:ring-2 focus:ring-rose-400 focus:ring-offset-2 dark:border-rose-700 dark:text-rose-300 dark:hover:bg-rose-900/40"
            >
              Delete account
            </button>
          </div>
        </div>
      </div>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-acct-title"
        >
          <div className="w-full max-w-sm rounded-card bg-white p-6 shadow-modal dark:bg-gray-800">
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
                className="rounded-button border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                className="rounded-button bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
              >
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
