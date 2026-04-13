/** Persistent amber banner shown when the current user's email is unverified.
 *  Listens for the EMAIL_NOT_VERIFIED custom event fired by the API client interceptor.
 */

import { useState, useEffect, useCallback } from "react";

import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import X from "lucide-react/dist/esm/icons/x";
import { useResendVerification } from "../hooks/useAuth";
import { useAuth } from "../context/AuthContext";

export const EMAIL_NOT_VERIFIED_EVENT = "pipelined:email_not_verified";

function EmailVerificationBanner() {
  const { user } = useAuth();
  const { mutateAsync: resend, isPending } = useResendVerification();
  const [visible, setVisible] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // Show banner when user is known to be unverified, or when event fires.
  useEffect(() => {
    if (user && user.email_verified === false) {
      setVisible(true);
    }
  }, [user]);

  useEffect(() => {
    function onNotVerified() {
      setVisible(true);
    }
    window.addEventListener(EMAIL_NOT_VERIFIED_EVENT, onNotVerified);
    return () => window.removeEventListener(EMAIL_NOT_VERIFIED_EVENT, onNotVerified);
  }, []);

  const handleResend = useCallback(async () => {
    try {
      await resend();
      setResendSent(true);
    } catch {
      // silently fail — user can try again
    }
  }, [resend]);

  if (!visible) return null;

  return (
    <div
      role="alert"
      data-testid="email-verification-banner"
      className="flex items-center justify-between border-b border-amber-200 bg-amber-50 px-4 py-2.5 dark:border-amber-700/50 dark:bg-amber-900/20"
    >
      <div className="flex items-center gap-2">
        <AlertTriangle className="h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <span className="text-sm font-medium text-amber-800 dark:text-amber-300">
          {resendSent
            ? "Verification email sent — check your inbox."
            : "Please verify your email to continue."}
        </span>
        {!resendSent && (
          <button
            type="button"
            onClick={handleResend}
            disabled={isPending}
            className="ml-1 text-sm font-medium text-amber-700 underline hover:text-amber-900 focus:outline-none disabled:opacity-50 dark:text-amber-400 dark:hover:text-amber-200"
          >
            {isPending ? "Sending…" : "Resend email"}
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss"
        className="ml-4 rounded p-0.5 text-amber-400 hover:bg-amber-100 focus:outline-none focus:ring-2 focus:ring-amber-500 dark:hover:bg-amber-800/30"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default EmailVerificationBanner;
