/** Reset password page: sets a new password using the httpOnly reset token cookie. */

import { Link, useNavigate } from "react-router-dom";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { useResetPasswordForm } from "../hooks/useResetPasswordForm";
import AuthLayout from "../components/AuthLayout";
import { AUTH_ERROR, AUTH_HEADLINE, AUTH_INPUT, AUTH_LABEL, AUTH_SUBHEAD } from "../lib/authFormStyles";
import { Button } from "../components/ui/button";

function ResetPassword() {
  const navigate = useNavigate();
  const {
    newPassword, confirmPassword, error, success, isPending,
    setNewPassword, setConfirmPassword, handleSubmit,
  } = useResetPasswordForm();

  return (
    <AuthLayout>
      <h1 className={AUTH_HEADLINE}>Choose a new password</h1>
      <p className={`${AUTH_SUBHEAD} mb-8`}>Choose a strong password for your account.</p>

      {success ? (
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 h-6 w-6 rounded-full bg-status-success flex items-center justify-center">
            <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <h1 className={AUTH_HEADLINE}>Password reset</h1>
          <p className={`${AUTH_SUBHEAD} mb-6`}>Your password has been reset successfully.</p>
          <Button type="button" size="lg" className="w-full" onClick={() => navigate("/login", { replace: true })}>
            Sign in
          </Button>
        </div>
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

      <p className="mt-6 text-center text-[0.8125rem] text-text-2">
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
