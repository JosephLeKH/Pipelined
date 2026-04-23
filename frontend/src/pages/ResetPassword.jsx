/** Reset password page: sets a new password using the httpOnly reset token cookie. */

import { Link } from "react-router-dom";

import { useResetPasswordForm } from "../hooks/useResetPasswordForm";
import AuthLayout from "../components/AuthLayout";
import { INPUT_BASE, INPUT_LABEL, BUTTON_PRIMARY } from "../lib/designTokens";

function PasswordInput({ label, id, value, onChange }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className={`block ${INPUT_LABEL}`}>{label}</label>
      <input
        id={id}
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_BASE}
        placeholder="••••••••"
      />
    </div>
  );
}

function ErrorAlert({ error }) {
  if (!error) return null;
  return (
    <p role="alert" className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
      {error}
    </p>
  );
}

function PasswordForm({ newPassword, confirmPassword, error, isPending, onNewPasswordChange, onConfirmPasswordChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <PasswordInput label="New password" id="new-password" value={newPassword} onChange={onNewPasswordChange} />
      <div className="mb-5">
        <PasswordInput label="Confirm password" id="confirm-password" value={confirmPassword} onChange={onConfirmPasswordChange} />
      </div>
      <ErrorAlert error={error} />
      <button type="submit" disabled={isPending} className={`w-full ${BUTTON_PRIMARY}`}>
        {isPending ? "Resetting…" : "Reset password"}
      </button>
    </form>
  );
}

function ResetPassword() {
  const { newPassword, confirmPassword, error, success, isPending, setNewPassword, setConfirmPassword, handleSubmit } = useResetPasswordForm();

  return (
    <AuthLayout>
      <h1 className="font-display text-xl font-semibold text-gray-900">Set new password</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">Choose a strong password for your account.</p>

      {success ? (
        <p role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-3 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300">
          Password reset successfully! Redirecting to sign in…
        </p>
      ) : (
        <PasswordForm
          newPassword={newPassword}
          confirmPassword={confirmPassword}
          error={error}
          isPending={isPending}
          onNewPasswordChange={setNewPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onSubmit={handleSubmit}
        />
      )}

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link to="/login" className="text-brand-500 hover:text-brand-600 text-sm">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}

export default ResetPassword;
