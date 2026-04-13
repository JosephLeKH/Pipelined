/** Reset password page: validates the token from the URL and sets a new password. */

import { useState, useCallback } from "react";
import { Link, useSearchParams, useNavigate } from "react-router-dom";

import { useResetPassword } from "../hooks/useAuth";
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
    <main className="flex min-h-screen flex-col items-center justify-center p-8 bg-gray-50">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-bold text-gray-900">Set new password</h1>

        {success ? (
          <p role="status" className="rounded-lg bg-green-50 px-3 py-3 text-sm text-green-700">
            Password reset successfully! Redirecting to sign in…
          </p>
        ) : (
          <form onSubmit={handleSubmit} noValidate>
            <div className="mb-4">
              <label
                htmlFor="new-password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                New password
              </label>
              <input
                id="new-password"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            <div className="mb-5">
              <label
                htmlFor="confirm-password"
                className="mb-1.5 block text-sm font-medium text-gray-700"
              >
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p role="alert" className="mb-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-60"
            >
              {isPending ? "Resetting…" : "Reset password"}
            </button>
          </form>
        )}

        <p className="mt-5 text-center text-sm text-gray-500">
          <Link to="/login" className="font-medium text-blue-600 hover:underline">
            Back to sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default ResetPassword;
