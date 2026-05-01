/** Forgot password page: sends a reset link to the user's email. */

import { useState, useCallback } from "react";
import { Link } from "react-router-dom";

import { useForgotPassword } from "../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";

function EmailInput({ email, onChange }) {
  return (
    <div className="mb-5">
      <label htmlFor="email" className="block text-sm font-medium text-foreground mb-1.5 font-display">Email</label>
      <Input
        id="email"
        type="email"
        autoComplete="email"
        value={email}
        onChange={(e) => onChange(e.target.value)}
        placeholder="you@example.com"
      />
    </div>
  );
}

function ErrorAlert({ error }) {
  if (!error) return null;
  return (
    <p role="alert" className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
      {error}
    </p>
  );
}

function SuccessMessage() {
  return (
    <p role="status" className="rounded-lg bg-primary/10 border border-primary/20 px-3 py-3 text-sm text-primary">
      If that email is registered, a reset link has been sent. Check your inbox.
    </p>
  );
}

function ForgotPasswordForm({ email, error, isPending, onEmailChange, onSubmit }) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <EmailInput email={email} onChange={onEmailChange} />
      <ErrorAlert error={error} />
      <Button type="submit" disabled={isPending} className="w-full">
        {isPending ? "Sending…" : "Send reset link"}
      </Button>
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
      <h1 className="font-display text-xl font-semibold text-foreground">Forgot password?</h1>
      <p className="mt-1 mb-6 text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a reset link.
      </p>

      {submitted ? <SuccessMessage /> : <ForgotPasswordForm email={email} error={error} isPending={isPending} onEmailChange={setEmail} onSubmit={handleSubmit} />}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        <Link to="/login" className="text-primary hover:text-primary/80 text-sm">Back to sign in</Link>
      </p>
    </AuthLayout>
  );
}

export default ForgotPassword;
