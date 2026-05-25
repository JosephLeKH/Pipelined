/** Form fields for the Login page: email, password inputs + forgot password link + error + submit. */

import { useState } from "react";

import { Link } from "react-router-dom";

import { PASSWORD_MIN_LENGTH } from "../lib/constants";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

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
        <Label htmlFor="email" className="mb-1.5 block text-sm font-medium">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={handleEmailChange}
          onBlur={() => setEmailTouched(true)}
          placeholder="you@example.com"
          aria-describedby={emailError ? "email-error" : undefined}
          aria-invalid={!!emailError}
        />
        {emailError && <p id="email-error" role="alert" className="mt-1 text-xs text-destructive">{emailError}</p>}
      </div>
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between">
          <Label htmlFor="password" className=" text-sm font-medium">Password</Label>
          <Link to="/forgot-password" className="text-primary hover:text-primary/80 transition-colors text-sm">Forgot password?</Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => setPasswordTouched(true)}
          placeholder="••••••••"
          aria-describedby={passwordError ? "password-error" : undefined}
          aria-invalid={!!passwordError}
        />
        {passwordError && <p id="password-error" role="alert" className="mt-1 text-xs text-destructive">{passwordError}</p>}
      </div>
      {error && (
        <p role="alert" className="mb-4 rounded-lg bg-destructive/10 border border-destructive/20 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      <Button type="submit" disabled={isPending || isInvalid} className="w-full">
        {isPending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
