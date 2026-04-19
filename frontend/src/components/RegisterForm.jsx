/** Form fields for the Register page: name, email, password inputs + error + submit. */

import { INPUT_BASE, BUTTON_PRIMARY } from "../lib/designTokens";

export function RegisterForm({ displayName, setDisplayName, email, setEmail, password, setPassword, error, isPending, onSubmit }) {
  return (
    <form onSubmit={onSubmit} noValidate>
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
        <input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_BASE} placeholder="you@example.com" />
      </div>
      <div className="mb-5">
        <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
          Password
        </label>
        <input id="password" type="password" autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className={INPUT_BASE} placeholder="Min. 8 characters" />
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
  );
}
