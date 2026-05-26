/** Forgot password page: sends a reset link to the user's email. */

import { useState, useCallback } from "react";
import { Link } from "react-router-dom";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { useForgotPassword } from "../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import { AUTH_ERROR, AUTH_HEADLINE, AUTH_INPUT, AUTH_LABEL, AUTH_SUBHEAD } from "../lib/authFormStyles";
import { Button } from "../components/ui/button";

function ForgotPassword() {
  const { mutateAsync: sendReset, isPending } = useForgotPassword();
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required.");
      return;
    }

    try {
      await sendReset({ email: email.trim() });
      setSubmitted(true);
    } catch {
      setError("Something went wrong. Please try again.");
    }
  }, [email, sendReset]);

  return (
    <AuthLayout>
      <h1 className={AUTH_HEADLINE}>Reset your password</h1>
      <p className={`${AUTH_SUBHEAD} mb-8`}>
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {submitted ? (
        <p role="status" className="text-sm text-text-2">
          If that email is registered, a reset link has been sent. Check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-6">
            <label htmlFor="email" className={AUTH_LABEL}>Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              className={AUTH_INPUT}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>
          {error && <p role="alert" className={`mb-4 ${AUTH_ERROR}`}>{error}</p>}
          <Button type="submit" size="lg" disabled={isPending} className="w-full">
            {isPending ? (
              <>
                <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />
                Sending…
              </>
            ) : (
              "Send reset link"
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

export default ForgotPassword;
