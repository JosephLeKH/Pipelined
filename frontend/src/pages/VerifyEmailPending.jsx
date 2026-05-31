/** Post-registration "Check your email" page with resend option and 60s cooldown. */

import { useState, useEffect, useCallback } from "react";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";
import Mail from "lucide-react/dist/esm/icons/mail";

import { useResendVerification } from "../hooks/useAuth";
import { useAuth } from "../context/AuthContext";
import AuthLayout from "../components/AuthLayout";
import { AUTH_HEADLINE, AUTH_SUBHEAD } from "../lib/authFormStyles";
import { Button } from "../components/ui/button";

const RESEND_COOLDOWN_S = 60;

function maskEmail(email) {
  if (!email) return "";
  const [local, domain] = email.split("@");
  if (!domain) return email;

  // For emails with local part < 3 chars, show first char + asterisks
  if (local.length < 3) {
    const masked = local.charAt(0) + "*".repeat(Math.max(1, local.length - 1));
    return `${masked}@${domain}`;
  }

  // For longer emails: first 2 chars + asterisks + last 1 char
  const prefix = local.slice(0, 2);
  const suffix = local.slice(-1);
  const masked = "*".repeat(local.length - 3);
  return `${prefix}${masked}${suffix}@${domain}`;
}

function ResendStatus({ status }) {
  if (status === "sent") {
    return (
      <p role="status" className="mb-4 text-sm text-text-2">
        Verification email resent. Check your inbox.
      </p>
    );
  }
  if (status === "already_verified") {
    return (
      <p role="status" className="mb-4 text-sm text-text-2">
        Your email is already verified. You can sign in.
      </p>
    );
  }
  if (status === "error") {
    return (
      <p role="alert" className="mb-4 text-xs text-brand-700">
        Could not resend. Please try again in a moment.
      </p>
    );
  }
  return null;
}

function VerifyEmailPending() {
  const { user, logout } = useAuth();
  const { mutateAsync: resend, isPending } = useResendVerification();
  const [cooldown, setCooldown] = useState(0);
  const [resendStatus, setResendStatus] = useState(null);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const handleResend = useCallback(async () => {
    setResendStatus(null);
    try {
      await resend();
      setResendStatus("sent");
      setCooldown(RESEND_COOLDOWN_S);
    } catch (err) {
      if (err?.code === "ALREADY_VERIFIED") {
        setResendStatus("already_verified");
      } else {
        setResendStatus("error");
      }
    }
  }, [resend]);

  const maskedEmail = maskEmail(user?.email ?? "");

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center">
        <Mail
          className="mb-6 h-6 w-6 text-brand-600 motion-safe:animate-pulse-soft"
          aria-hidden="true"
        />

        <h1 className={AUTH_HEADLINE}>Check your email</h1>
        <p className={`${AUTH_SUBHEAD} mb-2`}>We sent a verification link to</p>
        {maskedEmail && (
          <p className="mb-8 text-sm font-medium text-text-1">{maskedEmail}</p>
        )}

        <ResendStatus status={resendStatus} />
        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={handleResend}
          disabled={isPending || cooldown > 0}
          className="h-9 w-full border-border-2 bg-surface-0 hover:bg-surface-1"
        >
          {isPending ? (
            <>
              <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />
              Sending…
            </>
          ) : cooldown > 0 ? (
            `Resend in ${cooldown}s`
          ) : (
            "Resend verification email"
          )}
        </Button>

        <p className="mt-6 text-xs text-text-3">
          Wrong email?{" "}
          <button
            type="button"
            onClick={logout}
            className="text-text-2 hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
          >
            Sign out
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}

export default VerifyEmailPending;
