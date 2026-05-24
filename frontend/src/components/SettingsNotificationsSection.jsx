/** Settings notifications section — timezone and morning brief preferences. */

import { useState, useCallback } from "react";

import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";
import TimezoneSelector from "./TimezoneSelector";

function ToggleSwitch({ checked, onChange, disabled, label, description, id }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div>
        <p id={id} className="text-sm font-medium text-foreground">{label}</p>
        {description && (
          <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? "bg-primary" : "bg-muted"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-100 shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

const TOGGLES = [
  {
    field: "morning_brief_enabled",
    label: "Morning brief",
    description: "Daily prioritized action list at your chosen hour.",
    defaultVal: true,
  },
  {
    field: "morning_brief_email",
    label: "Morning brief email",
    description: "Receive your daily brief by email.",
    defaultVal: true,
  },
  {
    field: "morning_brief_in_app",
    label: "Morning brief in-app alert",
    description: "Get notified in Pipelined when your brief is ready.",
    defaultVal: true,
  },
  {
    field: "weekly_digest_enabled",
    label: "Weekly digest email",
    description: "A weekly summary of your job search activity every Monday.",
    defaultVal: false,
  },
];

function SettingsNotificationsSection() {
  const { user } = useAuth();
  const { mutateAsync, isPending } = useUpdateUser();

  const [timezone, setTimezone] = useState(
    () => user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/New_York"
  );
  const [values, setValues] = useState(() =>
    Object.fromEntries(TOGGLES.map((t) => [t.field, user?.[t.field] ?? t.defaultVal]))
  );
  const [saveError, setSaveError] = useState(null);

  const handleToggle = useCallback(
    async (field, next) => {
      setValues((prev) => ({ ...prev, [field]: next }));
      setSaveError(null);
      try {
        await mutateAsync({ [field]: next });
      } catch {
        setValues((prev) => ({ ...prev, [field]: !next }));
        setSaveError("Failed to save. Please try again.");
      }
    },
    [mutateAsync]
  );

  const handleTimezoneChange = useCallback(
    async (nextTimezone) => {
      setTimezone(nextTimezone);
      setSaveError(null);
      try {
        await mutateAsync({ timezone: nextTimezone });
      } catch {
        setSaveError("Failed to save timezone. Please try again.");
      }
    },
    [mutateAsync]
  );

  return (
    <div className="rounded-xl bg-card border border-border p-6">
      <h2 className="mb-1 font-display text-lg font-semibold text-foreground">
        Notifications
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Control your daily morning brief, timezone, and weekly digest.
      </p>
      {saveError && (
        <p role="alert" className="mb-3 text-sm text-destructive">{saveError}</p>
      )}
      <div className="mb-6">
        <p className="mb-2 text-sm font-medium text-foreground">Timezone</p>
        <p className="mb-3 text-sm text-muted-foreground">
          Your morning brief is delivered at 8:00 AM in this timezone.
        </p>
        <TimezoneSelector value={timezone} onChange={handleTimezoneChange} />
      </div>
      <div className="divide-y divide-border">
        {TOGGLES.map((t) => (
          <ToggleSwitch
            key={t.field}
            id={`notif-${t.field}`}
            checked={values[t.field]}
            onChange={(v) => handleToggle(t.field, v)}
            disabled={isPending}
            label={t.label}
            description={t.description}
          />
        ))}
      </div>
    </div>
  );
}

export default SettingsNotificationsSection;
