/** Form fields for the Login page: email, password inputs + forgot password link + error + submit. */

import { useState } from "react";

import { Link } from "react-router-dom";
import Eye from "lucide-react/dist/esm/icons/eye";
import EyeOff from "lucide-react/dist/esm/icons/eye-off";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { PASSWORD_MIN_LENGTH } from "../lib/constants";
import { AUTH_ERROR, AUTH_INPUT, AUTH_LABEL } from "../lib/authFormStyles";
import { Button } from "./ui/button";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function LoginForm({ email, setEmail, password, setPassword, error, isPending, onSubmit }) {
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordTouched, setPasswordTouched] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const emailError = emailTouched && !EMAIL_REGEX.test(email.trim()) ? "Enter a valid email address." : null;
  const passwordError = passwordTouched && password.length < PASSWORD_MIN_LENGTH
    ? `Password must be at least ${PASSWORD_MIN_LENGTH} characters.`
    : null;
  const isInvalid = !EMAIL_REGEX.test(email.trim()) || password.length < PASSWORD_MIN_LENGTH;

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
        <label htmlFor="email" className={AUTH_LABEL}>Email</label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          className={AUTH_INPUT}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          placeholder="you@example.com"
          aria-describedby={emailError ? "email-error" : undefined}
          aria-invalid={emailError ? true : false}
        />
        {emailError && (
          <p id="email-error" role="alert" className={AUTH_ERROR}>{emailError}</p>
        )}
      </div>
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <label htmlFor="password" className={AUTH_LABEL}>Password</label>
          <Link
            to="/forgot-password"
            className="text-xs text-brand-600 hover:text-brand-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
          >
            Forgot?
          </Link>
        </div>
        <div className="relative mt-1.5">
          <input
            id="password"
            type={passwordVisible ? "text" : "password"}
            autoComplete="current-password"
            className={`${AUTH_INPUT} mt-0 pr-10`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onBlur={() => setPasswordTouched(true)}
            placeholder="••••••••"
            aria-describedby={passwordError ? "password-error" : undefined}
            aria-invalid={passwordError ? true : false}
          />
          <button
            type="button"
            onClick={() => setPasswordVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-3 hover:text-text-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
            aria-label={passwordVisible ? "Hide password" : "Show password"}
          >
            {passwordVisible ? (
              <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
            ) : (
              <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            )}
          </button>
        </div>
        {passwordError && (
          <p id="password-error" role="alert" className={AUTH_ERROR}>{passwordError}</p>
        )}
      </div>
      {error && (
        <p role="alert" className={`mb-4 ${AUTH_ERROR}`}>{error}</p>
      )}
      <Button type="submit" size="lg" disabled={isPending || isInvalid} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />
            Logging in…
          </>
        ) : (
          "Log in"
        )}
      </Button>
    </form>
  );
}
