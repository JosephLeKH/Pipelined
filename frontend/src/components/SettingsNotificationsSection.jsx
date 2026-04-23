/** Settings notifications section — custom toggle switches for alert preferences. */

import { useState, useCallback } from "react";

import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";
import { CARD_BASE } from "../lib/designTokens";

function ToggleSwitch({ checked, onChange, disabled, label, description, id }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div>
        <p
          id={id}
          className="text-sm font-medium text-gray-800 dark:text-gray-200"
        >
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? "bg-brand-500" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            checked ? "trangray-x-5" : "trangray-x-1"
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

  const handleToggle = useCallback(
    async (field, next) => {
      setValues((prev) => ({ ...prev, [field]: next }));
      try {
        await mutateAsync({ [field]: next });
      } catch {
        setValues((prev) => ({ ...prev, [field]: !next }));
      }
    },
    [mutateAsync]
  );

  return (
    <div className={`${CARD_BASE} p-6`}>
      <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Notifications
      </h2>
      <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
        Control which alerts and digests you receive.
      </p>
      <div className="divide-y divide-gray-100 dark:divide-gray-700">
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
