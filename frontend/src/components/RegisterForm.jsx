/** Form fields for the Register page: name, email, password inputs + error + submit. */

import { useState } from "react";

import { INPUT_BASE, BUTTON_PRIMARY } from "../lib/designTokens";
import { PASSWORD_MIN_LENGTH } from "../lib/constants";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PASSWORD_REQUIREMENTS = [
  { key: "length", label: `At least ${PASSWORD_MIN_LENGTH} characters`, test: (p) => p.length >= PASSWORD_MIN_LENGTH },
  { key: "uppercase", label: "One uppercase letter", test: (p) => /[A-Z]/.test(p) },
  { key: "number", label: "One number", test: (p) => /[0-9]/.test(p) },
];

function PasswordStrengthList({ password }) {
  if (!password.length) return null;
  return (
    <ul className="mt-2 space-y-1" aria-label="Password requirements">
      {PASSWORD_REQUIREMENTS.map((req) => {
        const met = req.test(password);
        return (
          <li key={req.key} className={`flex items-center gap-1.5 text-xs ${met ? "text-green-600" : "text-gray-500"}`}>
            <span aria-hidden="true">{met ? "✓" : "○"}</span>
            {req.label}
          </li>
        );
      })}
    </ul>
  );
}

export function RegisterForm({ displayName, setDisplayName, email, setEmail, password, setPassword, error, isPending, onSubmit }) {
  const [emailTouched, setEmailTouched] = useState(false);

  const isEmailValid = EMAIL_REGEX.test(email);
  const emailError = emailTouched && !isEmailValid ? "Please enter a valid email address." : null;
  const passwordMeetsMinimum = PASSWORD_REQUIREMENTS.every((req) => req.test(password));
  const isSubmitDisabled = isPending || !isEmailValid || !passwordMeetsMinimum;

  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="mb-4">
        <label htmlFor="display-name" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Name
        </label>
        <input id="display-name" type="text" autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} className={INPUT_BASE} placeholder="Jane Smith" />
      </div>
      <div className="mb-4">
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          className={INPUT_BASE}
          placeholder="you@example.com"
          aria-describedby={emailError ? "email-error" : undefined}
        />
        {emailError && <p id="email-error" className="mt-1 text-xs text-red-600">{emailError}</p>}
      </div>
      <div className="mb-5">
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
          Password
        </label>
        <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT_BASE} placeholder="Min. 8 characters" />
        <PasswordStrengthList password={password} />
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
          {error}
        </p>
      )}
      <button type="submit" disabled={isSubmitDisabled} className={`w-full ${BUTTON_PRIMARY}`}>
        {isPending ? "Creating account…" : "Create account"}
      </button>
    </form>
  );
}
