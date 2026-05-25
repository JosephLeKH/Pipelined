/** Form fields for the Register page: name, email, password inputs + error + submit. */

import { useState } from "react";

import { PASSWORD_MIN_LENGTH } from "../lib/constants";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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
          <li key={req.key} className={`flex items-center gap-1.5 text-xs ${met ? "text-primary" : "text-muted-foreground"}`}>
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
        <Label htmlFor="display-name" className="mb-1.5 block text-sm font-medium">Name</Label>
        <Input id="display-name" type="text" autoComplete="name" value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Jane Smith" />
      </div>
      <div className="mb-4">
        <Label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => setEmailTouched(true)}
          placeholder="you@example.com"
          aria-describedby={emailError ? "email-error" : undefined}
          aria-invalid={!!emailError}
        />
        {emailError && <p id="email-error" role="alert" className="mt-1 text-xs text-destructive">{emailError}</p>}
      </div>
      <div className="mb-5">
        <Label htmlFor="password" className="mb-1.5 block text-sm font-medium">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min. 8 characters" />
        <PasswordStrengthList password={password} />
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isSubmitDisabled} className="w-full">
        {isPending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
