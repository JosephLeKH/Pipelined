/** Form fields for the Login page: email, password inputs + forgot password link + error + submit. */

import { useState } from "react";

import { Link } from "react-router-dom";

import { INPUT_BASE, INPUT_LABEL, BUTTON_PRIMARY } from "../lib/designTokens";
import { PASSWORD_MIN_LENGTH } from "../lib/constants";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ email, setEmail, password, setPassword, error, isPending, onSubmit }) {
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);

  const emailError = emailTouched && !EMAIL_REGEX.test(email.trim()) ? "Enter a valid email address." : null;
  const passwordError = passwordTouched && password.length < PASSWORD_MIN_LENGTH
    ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
    : null;
  const isInvalid = !EMAIL_REGEX.test(email.trim()) || password.length < PASSWORD_MIN_LENGTH;

  function handleEmailChange(e) {
    setEmail(e.target.value);
  }

  function handleSubmit(e) {
    e.preventDefault();
    setEmailTouched(true);
    setPasswordTouched(true);
    if (isInvalid) return;
    onSubmit(e);
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="mb-4">
        <label htmlFor="email" className={`block ${INPUT_LABEL}`}>Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={handleEmailChange}
          onBlur={() => setEmailTouched(true)}
          className={INPUT_BASE}
          placeholder="you@example.com"
          aria-describedby={emailError ? "email-error" : undefined}
          aria-invalid={!!emailError}
        />
        {emailError && <p id="email-error" role="alert" className="mt-1 text-xs text-red-600">{emailError}</p>}
      </div>
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className={INPUT_LABEL}>Password</label>
          <Link to="/forgot-password" className="text-brand-500 hover:text-brand-600 transition-colors text-sm">Forgot password?</Link>
        </div>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setPasswordTouched(true)}
          className={INPUT_BASE}
          placeholder="••••••••"
          aria-describedby={passwordError ? "password-error" : undefined}
          aria-invalid={!!passwordError}
        />
        {passwordError && <p id="password-error" role="alert" className="mt-1 text-xs text-red-600">{passwordError}</p>}
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
          {error}
        </p>
      )}
      <button type="submit" disabled={isPending || isInvalid} className={`w-full ${BUTTON_PRIMARY}`}>
        {isPending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
