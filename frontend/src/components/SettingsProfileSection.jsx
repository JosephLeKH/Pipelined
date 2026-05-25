/** Settings profile section — avatar, display name, email, and timezone. */

import { useState, useCallback } from "react";

import SettingsPageShell, {
  SettingsFieldBlock,
  SettingsSectionDivider,
} from "./SettingsPageShell";
import TimezoneSelector from "./TimezoneSelector";
import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";
import { COPY_RESET_MS } from "../lib/constants";
import { Input } from "./ui/input";

const AVATAR_COLORS = [
  "bg-brand-600",
  "bg-status-info",
  "bg-amber-400 dark:bg-amber-500",
  "bg-emerald-500 dark:bg-emerald-600",
  "bg-brand-700",
  "bg-sky-500 dark:bg-sky-600",
];

function avatarColor(name) {
  const code = ((name ?? "U").toUpperCase().charCodeAt(0) - 65 + 26) % 26;
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

function resolveTimezone(user) {
  return user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/New_York";
}

function SettingsProfileSection() {
  const { user } = useAuth();
  const { mutateAsync, isPending } = useUpdateUser();

  const seed = user?.display_name ?? user?.email ?? "";
  const initial = (seed[0] ?? "U").toUpperCase();
  const color = avatarColor(seed);

  const savedDisplayName = user?.display_name ?? "";
  const savedTimezone = resolveTimezone(user);

  const [displayName, setDisplayName] = useState(savedDisplayName);
  const [timezone, setTimezone] = useState(savedTimezone);
  const [savedAck, setSavedAck] = useState(false);
  const [error, setError] = useState(null);

  const dirty = displayName !== savedDisplayName || timezone !== savedTimezone;

  const handleCancel = useCallback(() => {
    setDisplayName(savedDisplayName);
    setTimezone(savedTimezone);
    setError(null);
  }, [savedDisplayName, savedTimezone]);

  const handleSave = useCallback(async () => {
    setSavedAck(false);
    setError(null);
    try {
      await mutateAsync({ display_name: displayName, timezone });
      setSavedAck(true);
      window.setTimeout(() => setSavedAck(false), COPY_RESET_MS);
    } catch (err) {
      setError(err?.message ?? "Failed to save. Please try again.");
    }
  }, [displayName, timezone, mutateAsync]);

  return (
    <SettingsPageShell
      title="Profile"
      subtitle="Update your display name, email, time zone, and avatar."
      dirty={dirty}
      isSaving={isPending}
      savedAck={savedAck}
      onSave={handleSave}
      onCancel={handleCancel}
      error={error}
    >
      <SettingsFieldBlock
        label="Display name"
        htmlFor="display-name"
        help="The name shown in your dashboard and shared timelines."
      >
        <Input
          id="display-name"
          type="text"
          value={displayName}
          onChange={(event) => setDisplayName(event.target.value)}
        />
      </SettingsFieldBlock>

      <SettingsSectionDivider />

      <SettingsFieldBlock label="Email" help="Used for sign-in and notifications.">
        <p className="text-sm text-text-1">{user?.email ?? "—"}</p>
      </SettingsFieldBlock>

      <SettingsSectionDivider />

      <SettingsFieldBlock
        label="Time zone"
        help="Determines Morning Brief and report delivery times."
      >
        <TimezoneSelector value={timezone} onChange={setTimezone} />
      </SettingsFieldBlock>

      <SettingsSectionDivider />

      <SettingsFieldBlock
        label="Avatar"
        help={
          user?.avatar_url
            ? "GitHub avatar from your connected account."
            : "Initials avatar · GitHub avatar available with GitHub login."
        }
      >
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
        </div>
      </SettingsFieldBlock>
    </SettingsPageShell>
  );
}

export default SettingsProfileSection;
