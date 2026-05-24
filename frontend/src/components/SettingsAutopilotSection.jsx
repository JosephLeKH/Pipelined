/** Settings autopilot section — enable toggle, min score, max daily, explainer copy. */

import { useState, useCallback } from "react";
import { Link } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";
import {
  AUTOPILOT_MAX_DAILY_MAX,
  AUTOPILOT_MAX_DAILY_MIN,
  AUTOPILOT_MIN_SCORE_MAX,
  AUTOPILOT_MIN_SCORE_MIN,
  DEFAULT_AUTOPILOT_MAX_DAILY,
  DEFAULT_AUTOPILOT_MIN_MATCH_SCORE,
} from "../lib/constants";
import { Button } from "./ui/button";

const AUTOPILOT_EXPLAINER = "We never submit applications for you. Autopilot finds matches overnight and queues them for your review.";

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

function SettingsAutopilotSection() {
  const { user } = useAuth();
  const { mutateAsync, isPending } = useUpdateUser();
  const [enabled, setEnabled] = useState(() => user?.autopilot_enabled ?? false);
  const [minScore, setMinScore] = useState(
    () => user?.autopilot_min_match_score ?? DEFAULT_AUTOPILOT_MIN_MATCH_SCORE
  );
  const [maxDaily, setMaxDaily] = useState(
    () => user?.autopilot_max_daily ?? DEFAULT_AUTOPILOT_MAX_DAILY
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const handleToggle = useCallback(async (next) => {
    setEnabled(next);
    setSaved(false);
    setError(null);
    try {
      await mutateAsync({ autopilot_enabled: next });
      setSaved(true);
    } catch {
      setEnabled(!next);
      setError("Failed to save autopilot setting.");
    }
  }, [mutateAsync]);

  const handleSavePrefs = async () => {
    setSaved(false);
    setError(null);
    try {
      await mutateAsync({
        autopilot_min_match_score: minScore,
        autopilot_max_daily: maxDaily,
      });
      setSaved(true);
    } catch {
      setError("Failed to save autopilot preferences.");
    }
  };

  const needsResume = !user?.has_resume;

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl bg-card border border-border p-6">
        <h2 className="font-display mb-1 text-lg font-semibold text-foreground">Autopilot</h2>
        <p className="mb-5 text-sm text-muted-foreground">{AUTOPILOT_EXPLAINER}</p>

        {needsResume && (
          <div
            role="alert"
            className="mb-5 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-200"
          >
            Upload a resume to enable autopilot.{" "}
            <Link to="/settings?section=resume" className="font-medium underline">
              Go to Resume & AI
            </Link>
          </div>
        )}

        {error && <p role="alert" className="mb-4 text-sm text-destructive">{error}</p>}
        {saved && !error && (
          <p role="alert" className="mb-4 rounded-lg bg-primary/10 border border-primary/20 px-3 py-3 text-sm text-primary">
            Autopilot settings saved.
          </p>
        )}

        <ToggleSwitch
          id="autopilot-enabled-label"
          label="Enable autopilot"
          description="Scan job listings overnight and queue high-fit matches for review."
          checked={enabled}
          onChange={handleToggle}
          disabled={isPending || needsResume}
        />

        <div className="border-t border-border py-4">
          <label htmlFor="autopilot-min-score" className="text-sm font-medium text-foreground">
            Minimum match score ({minScore})
          </label>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Only queue jobs scoring at or above this threshold.
          </p>
          <input
            id="autopilot-min-score"
            type="range"
            min={AUTOPILOT_MIN_SCORE_MIN}
            max={AUTOPILOT_MIN_SCORE_MAX}
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="mt-3 w-full accent-primary"
            aria-valuemin={AUTOPILOT_MIN_SCORE_MIN}
            aria-valuemax={AUTOPILOT_MIN_SCORE_MAX}
            aria-valuenow={minScore}
          />
        </div>

        <div className="border-t border-border py-4">
          <label htmlFor="autopilot-max-daily" className="text-sm font-medium text-foreground">
            Max matches per day ({maxDaily})
          </label>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Cap how many opportunities autopilot queues each night.
          </p>
          <input
            id="autopilot-max-daily"
            type="range"
            min={AUTOPILOT_MAX_DAILY_MIN}
            max={AUTOPILOT_MAX_DAILY_MAX}
            value={maxDaily}
            onChange={(e) => setMaxDaily(Number(e.target.value))}
            className="mt-3 w-full accent-primary"
            aria-valuemin={AUTOPILOT_MAX_DAILY_MIN}
            aria-valuemax={AUTOPILOT_MAX_DAILY_MAX}
            aria-valuenow={maxDaily}
          />
        </div>

        <div className="mt-2 flex justify-end">
          <Button type="button" onClick={handleSavePrefs} disabled={isPending}>
            Save preferences
          </Button>
        </div>
      </div>
    </div>
  );
}

export default SettingsAutopilotSection;
