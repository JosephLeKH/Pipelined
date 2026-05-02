/** Settings notifications section — custom toggle switches for alert preferences. */

import { useState, useCallback } from "react";

import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";

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
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-5" : "translate-x-1"
          }`}
        />
      </button>
    </div>
  );
}

const TOGGLES = [
  {
    field: "stale_alerts_enabled",
    label: "Stale application alerts",
    description: "Get notified when applications haven't had activity in 2+ weeks.",
    defaultVal: true,
  },
  {
    field: "interview_reminders",
    label: "Interview reminders",
    description: "Reminders 24 hours before scheduled interviews.",
    defaultVal: true,
  },
  {
    field: "follow_up_reminders",
    label: "Follow-up due",
    description: "Alerts when a follow-up email is due after an interview.",
    defaultVal: true,
  },
  {
    field: "digest_enabled",
    label: "Weekly digest email",
    description: "A weekly summary of your job search activity every Monday.",
    defaultVal: true,
  },
];

function SettingsNotificationsSection() {
  const { user } = useAuth();
  const { mutateAsync, isPending } = useUpdateUser();

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

  return (
    <div className="rounded-xl bg-card border border-border p-6">
      <h2 className="mb-1 font-display text-lg font-semibold text-foreground">
        Notifications
      </h2>
      <p className="mb-2 text-sm text-muted-foreground">
        Control which alerts and digests you receive.
      </p>
      {saveError && (
        <p role="alert" className="mb-3 text-sm text-destructive">{saveError}</p>
      )}
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
