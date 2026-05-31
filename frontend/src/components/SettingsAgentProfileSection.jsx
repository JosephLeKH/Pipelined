/** Settings agent profile section — co-pilot memory and preferences. */

import { useState } from "react";

import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";
import {
  CARD_BASE,
  BUTTON_PRIMARY,
  INPUT_BASE,
  INPUT_LABEL,
  INPUT_HELPER,
} from "../lib/designTokens";

const COMMUNICATION_STYLES = [
  { value: "concise", label: "Concise", description: "Short, direct answers." },
  { value: "balanced", label: "Balanced", description: "Clear explanations with enough context." },
  { value: "detailed", label: "Detailed", description: "Thorough guidance and rationale." },
];

const COPILOT_POLICY_NOTE =
  "The co-pilot suggests only. It never sends emails or submits applications for you.";

function TagInput({ id, label, helper, values, onChange, placeholder }) {
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const trimmed = draft.trim();
    if (!trimmed || values.includes(trimmed)) return;
    onChange([...values, trimmed]);
    setDraft("");
  };

  const removeTag = (tag) => {
    onChange(values.filter((item) => item !== tag));
  };

  return (
    <div>
      <label htmlFor={id} className={INPUT_LABEL}>{label}</label>
      {helper && <p className={INPUT_HELPER}>{helper}</p>}
      <div className="mt-2 flex flex-wrap gap-2">
        {values.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-surface-1 px-2.5 py-1 text-xs text-text-1"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove ${tag}`}
              onClick={() => removeTag(tag)}
              className="text-text-3 hover:text-text-1"
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <div className="mt-2 flex gap-2">
        <input
          id={id}
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addTag();
            }
          }}
          placeholder={placeholder}
          className={INPUT_BASE}
        />
        <button type="button" onClick={addTag} className="shrink-0 rounded-md border border-border-1 bg-surface-0 px-3 text-sm text-text-1 hover:bg-surface-2">
          Add
        </button>
      </div>
    </div>
  );
}

function SettingsAgentProfileSection() {
  const { user } = useAuth();
  const profile = user?.agent_profile ?? {};
  const { mutateAsync, isPending } = useUpdateUser();

  const [targetRoles, setTargetRoles] = useState(() => profile.target_roles ?? []);
  const [preferredLocations, setPreferredLocations] = useState(() => profile.preferred_locations ?? []);
  const [careerGoals, setCareerGoals] = useState(() => profile.career_goals ?? "");
  const [communicationStyle, setCommunicationStyle] = useState(
    () => profile.communication_style ?? "balanced"
  );
  const [memoryNotes, setMemoryNotes] = useState(() => profile.memory_notes ?? "");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setSaved(false);
    setError(null);
    try {
      await mutateAsync({
        agent_profile: {
          target_roles: targetRoles,
          preferred_locations: preferredLocations,
          career_goals: careerGoals,
          communication_style: communicationStyle,
          memory_notes: memoryNotes,
        },
      });
      setSaved(true);
    } catch {
      setError("Failed to save agent profile.");
    }
  };

  return (
    <div className={`${CARD_BASE} p-6`}>
      <h2 className="mb-1 text-sm font-semibold text-text-1">Agent Profile</h2>
      <p className="mb-5 text-xs text-text-2">
        Teach the co-pilot about your goals so answers stay grounded in your pipeline.
      </p>
      <p className="mb-5 rounded-lg border border-border-1 bg-surface-1 px-3 py-2 text-xs text-text-2">
        {COPILOT_POLICY_NOTE}
      </p>

      <div className="flex flex-col gap-5">
        <TagInput
          id="target-roles"
          label="Target roles"
          helper="Roles you are actively pursuing."
          values={targetRoles}
          onChange={setTargetRoles}
          placeholder="e.g. Staff Engineer"
        />

        <TagInput
          id="preferred-locations"
          label="Preferred locations"
          helper="Cities, regions, or remote preferences."
          values={preferredLocations}
          onChange={setPreferredLocations}
          placeholder="e.g. Remote"
        />

        <div>
          <label htmlFor="career-goals" className={INPUT_LABEL}>Career goals</label>
          <textarea
            id="career-goals"
            rows={3}
            value={careerGoals}
            onChange={(e) => setCareerGoals(e.target.value)}
            className={INPUT_BASE}
            placeholder="What kind of role and company are you aiming for?"
          />
        </div>

        <fieldset>
          <legend className={INPUT_LABEL}>Communication style</legend>
          <div className="mt-2 flex flex-col gap-2">
            {COMMUNICATION_STYLES.map(({ value, label, description }) => (
              <label
                key={value}
                className="flex cursor-pointer items-start gap-3 rounded-lg border border-border-1 px-3 py-2"
              >
                <input
                  type="radio"
                  name="communication-style"
                  value={value}
                  checked={communicationStyle === value}
                  onChange={() => setCommunicationStyle(value)}
                  className="mt-1 accent-brand-600"
                />
                <span>
                  <span className="block text-sm font-medium text-text-1">{label}</span>
                  <span className="block text-xs text-text-2">{description}</span>
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        <div>
          <label htmlFor="memory-notes" className={INPUT_LABEL}>Agent memory notes</label>
          <p className={INPUT_HELPER}>Persistent context the co-pilot should remember about you.</p>
          <textarea
            id="memory-notes"
            rows={4}
            value={memoryNotes}
            onChange={(e) => setMemoryNotes(e.target.value)}
            className={`${INPUT_BASE} mt-2`}
            placeholder="e.g. Prefer startup roles, targeting IC track, avoid finance."
          />
        </div>
      </div>

      {saved && !error && (
        <p role="status" className="mt-4 rounded-lg border border-brand-200 bg-brand-50 px-3 py-3 text-sm text-brand-900 dark:border-brand-800 dark:bg-brand-950/20 dark:text-brand-200">
          Agent profile saved.
        </p>
      )}
      {error && <p role="alert" className="mt-4 text-sm text-brand-700">{error}</p>}

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={handleSave} disabled={isPending} className={BUTTON_PRIMARY}>
          Save
        </button>
      </div>
    </div>
  );
}

export default SettingsAgentProfileSection;
