/** Settings profile section — avatar, display name, email, and timezone. */

import { useState, useCallback } from "react";

import Loader2 from "lucide-react/dist/esm/icons/loader-2";

import TimezoneSelector from "./TimezoneSelector";
import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

const AVATAR_COLORS = [
  "bg-primary",
  "bg-accent-blue",
  "bg-amber-400",
  "bg-emerald-500 dark:bg-emerald-600",
  "bg-destructive",
  "bg-sky-500 dark:bg-sky-600", // intentional palette color; bg-accent-blue already used above
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
    <div className="rounded-xl bg-card border border-border p-6">
      <h2 className="mb-1 text-lg font-semibold font-display text-foreground">Profile</h2>
      <p className="mb-6 text-sm text-muted-foreground">
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
            <p className="text-sm font-medium text-foreground">Profile picture</p>
            <p className="text-xs text-muted-foreground">
              {user?.avatar_url ? "GitHub avatar" : "Initials avatar · GitHub avatar available with GitHub login"}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="display-name">Display name</Label>
          <Input
            id="display-name"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email-display">Email</Label>
          <Input
            id="email-display"
            type="email"
            value={user?.email ?? ""}
            readOnly
            disabled
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Timezone</Label>
          <TimezoneSelector value={timezone} onChange={setTimezone} />
        </div>
      </div>

      {saved && !isPending && (
        <p role="alert" className="mt-4 rounded-lg bg-primary/10 border border-primary/20 px-3 py-3 text-sm text-primary">
          Profile saved.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>
      )}

      <div className="mt-5 flex justify-end">
        <Button type="button" onClick={handleSave} disabled={isPending} className="flex items-center gap-2">
          {isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Save profile
        </Button>
      </div>
    </div>
  );
}

export default SettingsProfileSection;
