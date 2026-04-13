/** Forgot password page: sends a reset link to the user's email. */

import { useState, useCallback } from "react";
import { Link } from "react-router-dom";

import { useForgotPassword } from "../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import { INPUT_BASE, BUTTON_PRIMARY } from "../lib/designTokens";

function ForgotPassword() {
  const { mutateAsync: sendReset, isPending } = useForgotPassword();

  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e) => {
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
    },
    [email, sendReset]
  );

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Forgot password?</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {submitted ? (
        <p role="status" className="rounded-lg bg-emerald-50 border border-emerald-200 px-3 py-3 text-sm text-emerald-800 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-300">
          If that email is registered, a reset link has been sent. Check your inbox.
        </p>
      ) : (
        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-5">
            <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={INPUT_BASE}
              placeholder="you@example.com"
            />
          </div>

          {error && (
            <p role="alert" className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
              {error}
            </p>
          )}

          <button type="submit" disabled={isPending} className={`w-full ${BUTTON_PRIMARY}`}>
            {isPending ? "Sending…" : "Send reset link"}
          </button>
        </form>
      )}

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default ForgotPassword;
