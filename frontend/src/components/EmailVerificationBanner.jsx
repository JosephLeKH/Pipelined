/** Persistent banner shown when the current user's email is unverified.
 *  Listens for the EMAIL_NOT_VERIFIED custom event fired by the API client interceptor.
 */

import { useState, useEffect, useCallback } from "react";

import AlertTriangle from "lucide-react/dist/esm/icons/alert-triangle";
import X from "lucide-react/dist/esm/icons/x";

import { useResendVerification } from "../hooks/useAuth";
import { useAuth } from "../context/AuthContext";
import { EMAIL_VERIFICATION_BANNER_DISMISSED_KEY } from "../lib/constants";
import { dismissBanner, isBannerDismissed } from "../lib/utils";
import { Button } from "./ui/button";

export const EMAIL_NOT_VERIFIED_EVENT = "pipelined:email_not_verified";

const BANNER_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function EmailVerificationBanner() {
  const { user } = useAuth();
  const { mutateAsync: resend, isPending } = useResendVerification();
  const [dismissed, setDismissed] = useState(() =>
    isBannerDismissed(EMAIL_VERIFICATION_BANNER_DISMISSED_KEY)
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
    dismissBanner(EMAIL_VERIFICATION_BANNER_DISMISSED_KEY);
    setDismissed(true);
    setVisible(false);
  };

  if (!visible || dismissed) return null;

  return (
    <div
      role="status"
      data-testid="email-verification-banner"
      className="flex h-9 items-center gap-3 border-b border-brand-100 bg-brand-50 px-4 text-xs text-brand-900 dark:border-brand-800 dark:bg-brand-900/30 dark:text-brand-100"
    >
      <AlertTriangle size={15} aria-hidden="true" className="shrink-0 text-brand-700 dark:text-brand-300" />
      <span className="min-w-0 truncate">
        {resendSent
          ? "Verification email sent. Check your inbox."
          : "Please verify your email to continue."}
      </span>
      {!resendSent && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleResend}
          disabled={isPending}
          className="h-6 shrink-0 px-2 text-xs text-brand-700 hover:bg-brand-100 hover:text-brand-800 dark:text-brand-300 dark:hover:bg-brand-800/40"
        >
          {isPending ? "Sending…" : "Resend email"}
        </Button>
      )}
      <button
        type="button"
        onClick={handleDismiss}
        aria-label="Dismiss"
        className={`ml-auto inline-flex shrink-0 items-center justify-center rounded text-brand-700 hover:bg-brand-100 hover:text-brand-900 motion-reduce:transition-none transition-colors duration-hover ease-out dark:text-brand-300 dark:hover:bg-brand-800/40 dark:hover:text-brand-100 ${BANNER_FOCUS_RING}`}
      >
        <X size={15} aria-hidden="true" />
      </button>
    </div>
  );
}

export default EmailVerificationBanner;
