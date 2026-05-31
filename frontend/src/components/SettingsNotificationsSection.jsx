/** Settings notifications section — timezone and morning brief preferences (auto-save). */

import { useState, useCallback } from "react";
import { toast } from "sonner";

import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";
import {
  DEFAULT_MORNING_BRIEF_HOUR,
  formatBriefHour,
} from "../lib/briefConstants";
import { INPUT_BASE, INPUT_LABEL } from "../lib/designTokens";
import TimezoneSelector from "./TimezoneSelector";

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);

function ToggleSwitch({ checked, onChange, disabled, label, description, id }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div>
        <p id={id} className="text-sm font-medium text-text-1">{label}</p>
        {description && (
          <p className="mt-0.5 text-sm text-text-2">{description}</p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${
          checked ? "bg-brand-600" : "bg-surface-2"
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface-1 shadow transition-transform ${
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
  {
    field: "weekly_review_enabled",
    label: "Weekly pipeline review",
    description: "Show response rate, ghost rate, and velocity on your Today page.",
    defaultVal: true,
  },
];

function SettingsNotificationsSection() {
  const { user } = useAuth();
  const { mutateAsync } = useUpdateUser();
  const [error, setError] = useState(null);

  const [timezone, setTimezone] = useState(
    () => user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/New_York"
  );
  const [briefHour, setBriefHour] = useState(
    () => user?.morning_brief_hour ?? DEFAULT_MORNING_BRIEF_HOUR
  );
  const [values, setValues] = useState(() =>
    Object.fromEntries(TOGGLES.map((t) => [t.field, user?.[t.field] ?? t.defaultVal]))
  );

  const handleToggle = useCallback(
    async (field, next) => {
      setError(null);
      setValues((prev) => ({ ...prev, [field]: next }));
      try {
        await mutateAsync({ [field]: next });
        toast.success("Saved");
      } catch {
        setValues((prev) => ({ ...prev, [field]: !next }));
        setError("Failed to save. Please try again.");
        toast.error("Failed to save. Please try again.");
      }
    },
    [mutateAsync]
  );

  const handleTimezoneChange = useCallback(
    async (nextTimezone) => {
      setTimezone(nextTimezone);
      try {
        await mutateAsync({ timezone: nextTimezone });
        toast.success("Saved");
      } catch {
        toast.error("Failed to save timezone. Please try again.");
      }
    },
    [mutateAsync]
  );

  const handleBriefHourChange = useCallback(
    async (event) => {
      const nextHour = Number(event.target.value);
      setBriefHour(nextHour);
      try {
        await mutateAsync({ morning_brief_hour: nextHour });
        toast.success("Saved");
      } catch {
        setBriefHour(user?.morning_brief_hour ?? DEFAULT_MORNING_BRIEF_HOUR);
        toast.error("Failed to save delivery hour. Please try again.");
      }
    },
    [mutateAsync, user?.morning_brief_hour]
  );

  return (
    <div>
      <h2 className="text-display-md text-text-1">Notifications</h2>
      <p className="mt-6 text-sm text-text-2">
        Control your daily morning brief, timezone, and weekly digest.
      </p>

      {error && <p role="alert" className="mt-4 text-sm text-brand-700">{error}</p>}

      <div className="mt-8 flex flex-col gap-6">
        <div>
          <p className="mb-2 text-sm font-medium text-text-1">Timezone</p>
          <p className="mb-3 text-xs text-text-3">
            Your morning brief uses this timezone for delivery scheduling.
          </p>
          <TimezoneSelector value={timezone} onChange={handleTimezoneChange} />
        </div>

        <div className="border-t border-border-1 pt-8" />

        <div>
          <label htmlFor="morning-brief-hour" className={INPUT_LABEL}>
            Morning brief delivery hour
          </label>
          <p className="mb-2 text-xs text-text-3">
            Currently set to {formatBriefHour(briefHour)} in {timezone}.
          </p>
          <select
            id="morning-brief-hour"
            value={briefHour}
            onChange={handleBriefHourChange}
            className={INPUT_BASE}
          >
            {HOUR_OPTIONS.map((hour) => (
              <option key={hour} value={hour}>
                {formatBriefHour(hour)}
              </option>
            ))}
          </select>
        </div>

        <div className="border-t border-border-1 pt-8" />

        <div className="flex flex-col">
          <p className="mb-4 text-sm font-medium text-text-1">Notification channels</p>
          <div className="divide-y divide-border-1">
            {TOGGLES.map((t) => (
              <ToggleSwitch
                key={t.field}
                id={`notif-${t.field}`}
                checked={values[t.field]}
                onChange={(v) => handleToggle(t.field, v)}
                label={t.label}
                description={t.description}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsNotificationsSection;
