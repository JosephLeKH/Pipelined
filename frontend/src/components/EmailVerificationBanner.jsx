/** Persistent banner shown when the current user's email is unverified.
 *  Listens for the EMAIL_NOT_VERIFIED custom event fired by the API client interceptor.
 */

import { useState, useEffect, useCallback } from "react";

import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import X from "lucide-react/dist/esm/icons/x";

import { useResendVerification } from "../hooks/useAuth";
import { useAuth } from "../context/AuthContext";
import { EMAIL_VERIFICATION_BANNER_DISMISSED_KEY } from "../lib/constants";
import { Button } from "./ui/button";

export const EMAIL_NOT_VERIFIED_EVENT = "pipelined:email_not_verified";

const BANNER_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function EmailVerificationBanner() {
  const { user } = useAuth();
  const { mutateAsync: resend, isPending } = useResendVerification();
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(EMAIL_VERIFICATION_BANNER_DISMISSED_KEY) === "true"
  );
  const [visible, setVisible] = useState(false);
  const [resendSent, setResendSent] = useState(false);

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

  const handleDismiss = () => {
    localStorage.setItem(EMAIL_VERIFICATION_BANNER_DISMISSED_KEY, "true");
    setDismissed(true);
    setVisible(false);
  };

  if (!visible || dismissed) return null;

  return (
    <div
      role="alert"
      data-testid="email-verification-banner"
      className="flex h-9 items-center justify-between border-b border-brand-100 bg-brand-50 px-4 dark:border-brand-800 dark:bg-brand-900/30"
    >
      <div className="flex min-w-0 items-center gap-2">
        <AlertTriangle aria-hidden="true" className="h-4 w-4 shrink-0 text-brand-700 dark:text-brand-300" />
        <span className="truncate text-sm font-medium text-brand-900 dark:text-brand-100">
          {resendSent
            ? "Verification email sent — check your inbox."
            : "Please verify your email to continue."}
        </span>
        {!resendSent && (
          <Button
            type="button"
            variant="link"
            onClick={handleResend}
            disabled={isPending}
            className="ml-1 h-auto shrink-0 p-0 text-sm text-brand-700 hover:text-brand-800 dark:text-brand-300 dark:hover:text-brand-200"
          >
            {isPending ? "Sending…" : "Resend email"}
          </Button>
        )}
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className={`ml-4 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-brand-700 hover:bg-brand-100 hover:text-brand-900 motion-reduce:transition-none transition-colors duration-hover ease-out dark:text-brand-300 dark:hover:bg-brand-800/40 dark:hover:text-brand-100 ${BANNER_FOCUS_RING}`}
      >
        <X aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default EmailVerificationBanner;
