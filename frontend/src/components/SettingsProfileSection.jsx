/** Settings profile section — avatar, display name, email, and timezone. */

import { useState, useCallback } from "react";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import TimezoneSelector from "./TimezoneSelector";
import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";

const AVATAR_COLORS = [
  "bg-brand-500",
  "bg-accent-blue",
  "bg-amber-500",
  "bg-emerald-500",
  "bg-rose-500",
  "bg-sky-500",
];

function avatarColor(name) {
  const code = ((name ?? "U").toUpperCase().charCodeAt(0) - 65 + 26) % 26;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function SettingsProfileSection() {
  const { user } = useAuth();
  const { mutateAsync, isPending } = useUpdateUser();

  const seed = user?.display_name ?? user?.email ?? "";
  const initial = (seed[0] ?? "U").toUpperCase();
  const color = avatarColor(seed);

  const [displayName, setDisplayName] = useState(() => user?.display_name ?? "");
  const [timezone, setTimezone] = useState(
    () => user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/New_York"
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = useCallback(async () => {
    setSaved(false);
    setError(null);
    try {
      await mutateAsync({ display_name: displayName, timezone });
      setSaved(true);
    } catch (err) {
      setError(err?.message ?? "Failed to save. Please try again.");
    }
  }, [displayName, timezone, mutateAsync]);

  return (
    <div className="rounded-card border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">Profile</h2>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Manage your display name, email, and timezone.
      </p>

      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4">
          {user?.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.display_name ?? "Profile"}
              className="h-16 w-16 shrink-0 rounded-full object-cover"
            />
          ) : (
            <div
              className={`flex h-16 w-16 shrink-0 items-center justify-center rounded-full text-2xl font-semibold text-white ${color}`}
              aria-hidden="true"
            >
              {initial}
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile picture</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {user?.avatar_url ? "GitHub avatar" : "Initials avatar · GitHub avatar available with GitHub login"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="display-name"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Display name
          </label>
          <input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="rounded-input border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500/20 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="email-display"
            className="text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Email
          </label>
          <input
            id="email-display"
            type="email"
            value={user?.email ?? ""}
            readOnly
            className="rounded-input border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Timezone
          </label>
          <TimezoneSelector value={timezone} onChange={setTimezone} />
        </div>
      </div>

      {saved && !isPending && (
        <p role="alert" className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
          Profile saved.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      <div className="mt-5 flex justify-end">
        <button
          type="button"
          onClick={handleSave}
          disabled={isPending}
          className="flex items-center gap-2 rounded-button bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Save profile
        </button>
      </div>
    </div>
  );
}

export default SettingsProfileSection;
