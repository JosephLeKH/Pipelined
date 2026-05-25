/** Reset password page: sets a new password using the httpOnly reset token cookie. */

import { Link } from "react-router-dom";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { useResetPasswordForm } from "../hooks/useResetPasswordForm";
import AuthLayout from "../components/AuthLayout";
import { AUTH_ERROR, AUTH_HEADLINE, AUTH_INPUT, AUTH_LABEL, AUTH_SUBHEAD } from "../lib/authFormStyles";
import { Button } from "../components/ui/button";

function ResetPassword() {
  const {
    newPassword, confirmPassword, error, success, isPending,
    setNewPassword, setConfirmPassword, handleSubmit,
  } = useResetPasswordForm();

  return (
    <AuthLayout>
      <h1 className={AUTH_HEADLINE}>Choose a new password</h1>
      <p className={`${AUTH_SUBHEAD} mb-8`}>Choose a strong password for your account.</p>

      {success ? (
        <p role="status" className="text-sm text-text-2">
          Password reset successfully! Redirecting to sign in…
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label htmlFor="new-password" className={AUTH_LABEL}>New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              className={AUTH_INPUT}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          <div className="mb-6">
            <label htmlFor="confirm-password" className={AUTH_LABEL}>Confirm password</label>
            <input
              id="confirm-password"
              type="password"
              autoComplete="new-password"
              className={AUTH_INPUT}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>
          {error && <p role="alert" className={`mb-4 ${AUTH_ERROR}`}>{error}</p>}
          <Button type="submit" size="lg" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />
                Resetting…
              </>
            ) : (
              "Reset password"
            )}
          </Button>
        </form>
      )}

      <p className="mt-6 text-center text-[13px] text-text-2">
        <Link
          to="/login"
          className="text-brand-600 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
        >
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ResetPassword;
