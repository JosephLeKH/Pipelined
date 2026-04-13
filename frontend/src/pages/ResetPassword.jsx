/** Reset password page: validates the token from the URL and sets a new password. */

import { useState, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

import { useResetPassword } from "../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import { INPUT_BASE, BUTTON_PRIMARY } from "../lib/designTokens";
import { PASSWORD_MIN_LENGTH } from "../lib/constants";

const RESET_SUCCESS_REDIRECT_MS = 2000;

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get("token") ?? "";
  const { mutateAsync: doReset, isPending } = useResetPassword();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");

      if (!token) {
        setError("Reset token is missing. Please request a new reset link.");
        return;
      }
      if (!newPassword) {
        setError("New password is required.");
        return;
      }
      if (newPassword.length < PASSWORD_MIN_LENGTH) {
        setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }

      try {
        await doReset({ token, new_password: newPassword });
        setSuccess(true);
        setTimeout(() => navigate("/login", { replace: true }), RESET_SUCCESS_REDIRECT_MS);
      } catch (err) {
        if (err?.code === "TOKEN_EXPIRED") {
          setError("This reset link has expired. Please request a new one.");
        } else if (err?.code === "TOKEN_INVALID") {
          setError("This reset link is invalid. Please request a new one.");
        } else {
          setError("Something went wrong. Please try again.");
        }
      }
    },
    [token, newPassword, confirmPassword, doReset, navigate]
  );

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Set new password</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">Choose a strong password for your account.</p>

      {success ? (
        <p role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-3 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300">
          Password reset successfully! Redirecting to sign in…
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="new-password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              New password
            </label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className={INPUT_BASE}
              placeholder="••••••••"
            />
          </div>

          <div className="mb-5">
            <label htmlFor="confirm-password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Confirm password
            </label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={INPUT_BASE}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
              {error}
            </p>
          )}

          <button type="submit" disabled={isPending} className={`w-full ${BUTTON_PRIMARY}`}>
            {isPending ? "Resetting…" : "Reset password"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ResetPassword;
