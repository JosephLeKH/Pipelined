/** Form fields for the Login page: email, password inputs + forgot password link + error + submit. */

import { Link } from "react-router-dom";

import { INPUT_BASE, BUTTON_PRIMARY } from "../lib/designTokens";

export function LoginForm({ email, setEmail, password, setPassword, error, isPending, onSubmit }) {
  return (
    <form onSubmit={onSubmit} noValidate>
      <div className="mb-4">
        <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Email
        </label>
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_BASE} placeholder="you@example.com" />
      </div>
      <div className="mb-5">
        <div className="mb-1.5 flex items-center justify-between">
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Password
          </label>
          <Link to="/forgot-password" className="text-xs text-brand-600 hover:underline">Forgot password?</Link>
        </div>
        <input id="password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT_BASE} placeholder="••••••••" />
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
  );
}
