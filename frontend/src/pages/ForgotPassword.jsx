/** Forgot password page: sends a reset link to the user's email. */

import { useState, useCallback } from "react";
import { Link } from "react-router-dom";

import { useForgotPassword } from "../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import { INPUT_BASE, INPUT_LABEL, BUTTON_PRIMARY, SUCCESS_BANNER } from "../lib/designTokens";

function EmailInput({ email, onChange }) {
  return (
    <div className="mb-5">
      <label htmlFor="email" className={`block ${INPUT_LABEL}`}>Email</label>
      <input
        id="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_BASE}
        placeholder="you@example.com"
      />
    </div>
  );
}

function ErrorAlert({ error }) {
  if (!error) return null;
  return (
    <p role="alert" className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
      {error}
    </p>
  );
}

function SuccessMessage() {
  return (
    <p role="status" className={SUCCESS_BANNER}>
      If that email is registered, a reset link has been sent. Check your inbox.
    </p>
  );
}

function ForgotPasswordForm({ email, error, isPending, onEmailChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <EmailInput email={email} onChange={onEmailChange} />
      <ErrorAlert error={error} />
      <button type="submit" disabled={isPending} className={`w-full ${BUTTON_PRIMARY}`}>
        {isPending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

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
      <h1 className="font-display text-xl font-semibold text-gray-900">Forgot password?</h1>
      <p className="mt-1 mb-6 text-sm text-gray-500">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {submitted ? <SuccessMessage /> : <ForgotPasswordForm email={email} error={error} isPending={isPending} onEmailChange={setEmail} onSubmit={handleSubmit} />}

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link to="/login" className="text-brand-500 hover:text-brand-600 text-sm">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}

export default ForgotPassword;
