/** Post-registration "Check your email" page with resend option and 60s cooldown. */

import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";

import Mail from "lucide-react/dist/esm/icons/mail";
import { useResendVerification } from "../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import { Button } from "../components/ui/button";

const RESEND_COOLDOWN_S = 60;

function ResendStatus({ status }) {
  if (status === "sent") {
    return (
      <p role="status" className="mb-4 w-full rounded-lg bg-primary/10 border border-primary/20 px-3 py-3 text-sm text-primary">
        Verification email resent. Check your inbox.
      </p>
    );
  }
  if (status === "already_verified") {
    return (
      <p role="status" className="mb-4 w-full rounded-lg bg-primary/10 border border-primary/20 px-3 py-3 text-sm text-primary">
        Your email is already verified. You can sign in.
      </p>
    );
  }
  if (status === "error") {
    return (
      <p role="alert" className="mb-4 w-full rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
        Could not resend. Please try again in a moment.
      </p>
    );
  }
  return null;
}

function ResendEmailButton({ isPending, cooldown, onResend }) {
  return (
    <Button
      type="button"
      onClick={onResend}
      disabled={isPending || cooldown > 0}
      className="w-full"
    >
      {isPending
        ? "Sending…"
        : cooldown > 0
        ? `Resend in ${cooldown}s`
        : "Resend verification email"}
    </Button>
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
        <Mail className="mb-5 h-8 w-8 text-muted-foreground" />

        <h1 className="font-display text-2xl font-bold text-foreground">Check your email</h1>
        <p className="mt-2 mb-8 text-sm text-muted-foreground">
          We sent a verification link to your email address. Click the link to activate your account.
        </p>

        <ResendStatus status={resendStatus} />
        <ResendEmailButton isPending={isPending} cooldown={cooldown} onResend={handleResend} />

        <p className="mt-6 text-sm text-muted-foreground">
          Wrong email?{" "}
          <Link to="/register" className="font-medium text-primary hover:underline">
            Sign up again
          </Link>
          {" "}or{" "}
          <Link to="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </AuthLayout>
  );
}

export default VerifyEmailPending;
