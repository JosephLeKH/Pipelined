/** Form fields for the Register page: name, email, password inputs + error + submit. */

import { useState } from "react";

import Eye from "lucide-react/dist/esm/icons/eye";
import EyeOff from "lucide-react/dist/esm/icons/eye-off";
import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import { PASSWORD_MIN_LENGTH } from "../lib/constants";
import { AUTH_ERROR, AUTH_INPUT, AUTH_LABEL } from "../lib/authFormStyles";
import { Button } from "./ui/button";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_REQUIREMENTS = [
  { key: "length", test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { key: "uppercase", test: (p) => /[A-Z]/.test(p) },
  { key: "number", test: (p) => /[0-9]/.test(p) },
];

const STRENGTH_LEVELS = [
  { filled: 1, label: "Weak", barColor: "bg-status-orange", textColor: "text-status-orange" },
  { filled: 2, label: "Fair", barColor: "bg-status-warn", textColor: "text-status-warn" },
  { filled: 3, label: "Good", barColor: "bg-status-info", textColor: "text-status-info" },
  { filled: 4, label: "Strong", barColor: "bg-status-success", textColor: "text-status-success" },
];

function getPasswordStrength(password) {
  if (!password.length) return null;
  const metCount = PASSWORD_REQUIREMENTS.filter((req) => req.test(password)).length;
  return STRENGTH_LEVELS[Math.min(metCount, 3)];
}

function PasswordStrengthMeter({ password }) {
  const strength = getPasswordStrength(password);
  if (!strength) return null;

  return (
    <div className="mt-2 flex items-center gap-2" aria-live="polite">
      <div
        role="meter"
        aria-label={`Password strength: ${strength.label}`}
        aria-valuenow={strength.filled}
        aria-valuemin={0}
        aria-valuemax={4}
        className="flex flex-1 gap-1"
      >
        {STRENGTH_LEVELS.map((_, index) => (
          <span
            key={index}
            className={`h-1 w-full rounded-sm ${
              index < strength.filled ? strength.barColor : "bg-surface-2"
            }`}
          />
        ))}
      </div>
      <span className={`text-xs ${strength.textColor}`}>{strength.label}</span>
    </div>
  );
}

export function RegisterForm({ displayName, setDisplayName, email, setEmail, password, setPassword, error, isPending, onSubmit }) {
  const [emailTouched, setEmailTouched] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const isEmailValid = EMAIL_REGEX.test(email);
  const emailError = emailTouched && !isEmailValid ? "Please enter a valid email address." : null;
  const passwordMeetsMinimum = PASSWORD_REQUIREMENTS.every((req) => req.test(password));
  const isSubmitDisabled = isPending || !isEmailValid || !passwordMeetsMinimum;

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="mb-4">
        <label htmlFor="display-name" className={AUTH_LABEL}>Name</label>
        <input
          id="display-name"
          type="text"
          autoComplete="name"
          className={AUTH_INPUT}
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Jane Smith"
        />
      </div>
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
          placeholder="you@stanford.edu"
          aria-describedby={emailError ? "email-error" : undefined}
          aria-invalid={emailError ? true : false}
        />
        {emailError && (
          <p id="email-error" role="alert" className={AUTH_ERROR}>{emailError}</p>
        )}
      </div>
      <div className="mb-6">
        <label htmlFor="password" className={AUTH_LABEL}>Password</label>
        <div className="relative mt-1.5">
          <input
            id="password"
            type={passwordVisible ? "text" : "password"}
            autoComplete="new-password"
            className={`${AUTH_INPUT} mt-0 pr-10`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
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
        <PasswordStrengthMeter password={password} />
      </div>
      {error && (
        <p role="alert" className={`mb-4 ${AUTH_ERROR}`}>{error}</p>
      )}
      <Button type="submit" size="lg" disabled={isSubmitDisabled} className="w-full">
        {isPending ? (
          <>
            <Loader2 className="motion-safe:animate-spin" aria-hidden="true" />
            Creating account…
          </>
        ) : (
          "Create account"
        )}
      </Button>
    </form>
  );
}
