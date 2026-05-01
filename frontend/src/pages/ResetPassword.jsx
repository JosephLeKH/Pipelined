/** Reset password page: sets a new password using the httpOnly reset token cookie. */

import { Link } from "react-router-dom";

import { useResetPasswordForm } from "../hooks/useResetPasswordForm";
import AuthLayout from "../components/AuthLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

function PasswordInput({ label, id, value, onChange }) {
  return (
    <div className="mb-4">
      <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5 font-display">{label}</label>
      <Input
        id={id}
        type="password"
        autoComplete="new-password"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="••••••••"
      />
    </div>
  );
}

function ErrorAlert({ error }) {
  if (!error) return null;
  return (
    <p role="alert" className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
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
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Resetting…" : "Reset password"}
      </Button>
    </form>
  );
}

function ResetPassword() {
  const { newPassword, confirmPassword, error, success, isPending, setNewPassword, setConfirmPassword, handleSubmit } = useResetPasswordForm();

  return (
    <AuthLayout>
      <h1 className="font-display text-xl font-semibold text-foreground">Set new password</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">Choose a strong password for your account.</p>

      {success ? (
        <p role="status" className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-3 text-sm text-primary">
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

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:text-primary/80 text-sm">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}

export default ResetPassword;
