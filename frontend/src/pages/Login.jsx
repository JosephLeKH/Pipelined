/** Login page: split-screen layout with brand panel and email/password sign-in form. */

import { useState, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useLogin } from "../hooks/useAuth";
import AuthLayout from "../components/AuthLayout";
import GoogleAuthButton from "../components/GoogleAuthButton";
import GithubAuthButton from "../components/GithubAuthButton";
import { INPUT_BASE, BUTTON_PRIMARY } from "../lib/designTokens";
import { identifyUser } from "../lib/analytics";

function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const { mutateAsync: signIn, isPending } = useLogin();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      setError("");

      if (!email.trim()) {
        setError("Email is required.");
        return;
      }
      if (!password) {
        setError("Password is required.");
        return;
      }

      try {
        const user = await signIn({ email: email.trim(), password });
        login(user);
        identifyUser(user.id, {
          email: user.email,
          created_at: user.created_at,
          tier: user.tier ?? "free",
          has_resume: Boolean(user.resume_filename),
          application_count: user.application_count ?? 0,
          referral_source: user.referral_source ?? null,
        });
        navigate("/dashboard", { replace: true });
      } catch (err) {
        setError(err?.message ?? "Incorrect email or password.");
      }
    },
    [email, password, signIn, login, navigate]
  );

  const handleGoogleSuccess = useCallback(() => {
    navigate("/dashboard", { replace: true });
  }, [navigate]);

  const handleGoogleError = useCallback((message) => {
    setError(message);
  }, []);

  return (
    <AuthLayout>
      <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Welcome back</h1>
      <p className="mt-1 mb-6 text-sm text-slate-500 dark:text-slate-400">Sign in to your account</p>

      <GoogleAuthButton
        label="Continue with Google"
        onSuccess={handleGoogleSuccess}
        onError={handleGoogleError}
      />

      <div className="mt-3">
        <GithubAuthButton label="Continue with GitHub" />
      </div>

      <div className="my-5 flex items-center gap-3">
        <hr className="flex-1 border-slate-200 dark:border-slate-700" />
        <span className="text-xs text-slate-400">or</span>
        <hr className="flex-1 border-slate-200 dark:border-slate-700" />
      </div>

      <form onSubmit={handleSubmit} noValidate>
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
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
              Password
            </label>
            <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline">
              Forgot password?
            </Link>
          </div>
          <input
            id="password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={INPUT_BASE}
            placeholder="••••••••"
          />
        </div>

        {error && (
          <p role="alert" className="mb-4 rounded-lg bg-rose-50 border border-rose-200 px-3 py-2 text-sm text-rose-800 dark:bg-rose-900/20 dark:border-rose-800 dark:text-rose-300">
            {error}
          </p>
        )}

        <button type="submit" disabled={isPending} className={`w-full ${BUTTON_PRIMARY}`}>
          {isPending ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Don&apos;t have an account?{" "}
        <Link to="/register" className="font-medium text-brand-600 hover:underline">
          Sign up
        </Link>
      </p>
    </AuthLayout>
  );
}

export default Login;
