/** Post-registration "Check your email" page with resend option and 60s cooldown. */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";

import Mail from "lucide-react/dist/esm/icons/mail";
import { useResendVerification } from "../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import { BUTTON_PRIMARY, BUTTON_SECONDARY } from "../lib/designTokens";

const RESEND_COOLDOWN_S = 60;

function ResendStatus({ status }) {
  if (status === "sent") {
    return (
      <p role="status" className="mb-4 w-full rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300">
        Verification email resent. Check your inbox.
      </p>
    );
  }
  if (status === "already_verified") {
    return (
      <p role="status" className="mb-4 w-full rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-2 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300">
        Your email is already verified. You can sign in.
      </p>
    );
  }
  if (status === "error") {
    return (
      <p role="alert" className="mb-4 w-full rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
        Could not resend. Please try again in a moment.
      </p>
    );
  }
  return null;
}

function ResendEmailButton({ isPending, cooldown, onResend }) {
  return (
    <button
      type="button"
      onClick={onResend}
      disabled={isPending || cooldown > 0}
      className={`w-full ${BUTTON_PRIMARY}`}
    >
      {isPending
        ? "Sending…"
        : cooldown > 0
        ? `Resend in ${cooldown}s`
        : "Resend verification email"}
    </button>
  );
}

function VerifyEmailPending() {
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

  return (
    <AuthLayout>
      <div className="flex flex-col items-center text-center">
        <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
          <Mail className="h-7 w-7 text-brand-600 dark:text-brand-400" />
        </div>

        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Check your email</h1>
        <p className="mt-2 mb-8 text-sm text-gray-500 dark:text-gray-400">
          We sent a verification link to your email address. Click the link to activate your account.
        </p>

        <ResendStatus status={resendStatus} />
        <ResendEmailButton isPending={isPending} cooldown={cooldown} onResend={handleResend} />

        <p className="mt-6 text-sm text-gray-500 dark:text-gray-400">
          Wrong email?{" "}
          <Link to="/register" className="font-medium text-brand-600 hover:underline">
            Sign up again
          </Link>
          {" "}or{" "}
          <Link to="/login" className="font-medium text-brand-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default VerifyEmailPending;
