/** Register page: split-screen layout with brand panel and sign-up form. */

import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useRegister } from "../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import GoogleAuthButton from "../components/GoogleAuthButton";
import { INPUT_BASE, BUTTON_PRIMARY } from "../lib/designTokens";
import { identifyUser } from "../lib/analytics";
import { PASSWORD_MIN_LENGTH } from "../lib/constants";

function Register() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { mutateAsync: signUp, isPending } = useRegister();

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");

      if (!displayName.trim()) {
        setError("Name is required.");
        return;
      }
      if (!email.trim()) {
        setError("Email is required.");
        return;
      }
      if (password.length < PASSWORD_MIN_LENGTH) {
        setError(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
        return;
      }

      try {
        const user = await signUp({
          email: email.trim(),
          password,
          display_name: displayName.trim(),
        });
        login(user);
        identifyUser(user.id, {
          email: user.email,
          created_at: user.created_at,
          tier: user.tier ?? "free",
          has_resume: Boolean(user.resume_filename),
          application_count: 0,
          referral_source: user.referral_source ?? null,
        });
        navigate("/dashboard", { replace: true });
      } catch (err) {
        setError(err?.message ?? "Registration failed. Please try again.");
      }
    },
    [displayName, email, password, signUp, login, navigate]
  );

  const handleGoogleSuccess = useCallback(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  const handleGoogleError = useCallback((message) => {
    setError(message);
  }, []);

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Create your account</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">Start tracking your job search today</p>

      <GoogleAuthButton
        label="Sign up with Google"
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
      />

      <div className="my-5 flex items-center gap-3">
        <hr className="flex-1 border-slate-200 dark:border-slate-700" />
        <span className="text-xs text-slate-400">or</span>
        <hr className="flex-1 border-slate-200 dark:border-slate-700" />
      </div>

      <form onSubmit={handleSubmit} noValidate>
        <div className="mb-4">
          <label htmlFor="display-name" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Name
          </label>
          <input
            id="display-name"
            type="text"
            autoComplete="name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className={INPUT_BASE}
            placeholder="Jane Smith"
          />
        </div>

        <div className="mb-4">
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

        <div className="mb-5">
          <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
            Password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_BASE}
            placeholder="Min. 8 characters"
          />
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={isPending} className={`w-full ${BUTTON_PRIMARY}`}>
          {isPending ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Already have an account?{" "}
        <Link to="/login" className="font-medium text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Register;
