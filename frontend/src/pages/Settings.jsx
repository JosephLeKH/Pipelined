/** Settings page — tab-navigated settings with organized card sections. */

import { useState } from "react";
import { useSearchParams } from "react-router-dom";

import NavBar from "../components/NavBar";
import SettingsAccountSection from "../components/SettingsAccountSection";
import SettingsNotificationsSection from "../components/SettingsNotificationsSection";
import SettingsPipelineSection from "../components/SettingsPipelineSection";
import SettingsAutopilotSection from "../components/SettingsAutopilotSection";
import SettingsProfileSection from "../components/SettingsProfileSection";
import SettingsResumeSection from "../components/SettingsResumeSection";
import SettingsTemplatesSection from "../components/SettingsTemplatesSection";
import SettingsReferralSection from "../components/SettingsReferralSection";
import SettingsReportSection from "../components/SettingsReportSection";
import SettingsIntegrationsSection from "../components/SettingsIntegrationsSection";
import SettingsUsageSection from "../components/SettingsUsageSection";
import SharePipeline from "../components/SharePipeline";
import ShareTimeline from "../components/ShareTimeline";
import TimezoneSelector from "../components/TimezoneSelector";
import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";
import { Button } from "../components/ui/button";

const NAV_ITEMS = [
  { id: "pipeline", label: "Pipeline" },
  { id: "profile", label: "Profile" },
  { id: "calendar", label: "Calendar" },
  { id: "notifications", label: "Notifications" },
  { id: "integrations", label: "Integrations" },
  { id: "autopilot", label: "Autopilot" },
  { id: "resume", label: "Resume & AI" },
  { id: "templates", label: "Templates" },
  { id: "sharing", label: "Sharing" },
  { id: "reports", label: "Reports" },
  { id: "referral", label: "Invite Friends" },
  { id: "usage", label: "Usage & Plan" },
  { id: "account", label: "Account" },
];

const SETTINGS_PANEL_ID = "settings-panel";

function TabNav({ activeSection, onSelect }) {
  return (
    <nav role="tablist" className="mb-6 flex flex-wrap gap-1 border-b border-border pb-3">
      {NAV_ITEMS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeSection === id}
          aria-controls={SETTINGS_PANEL_ID}
          onClick={() => onSelect(id)}
          className={
            activeSection === id
              ? "bg-primary/10 text-primary text-sm font-display font-semibold px-3 py-2 rounded-md"
              : "text-muted-foreground hover:text-foreground text-sm font-display font-medium transition-colors px-3 py-2 rounded-md"
          }
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function CalendarSectionContent({ timezone, saved, error, isPending, onTimezoneChange, onSave }) {
  return (
    <div className="rounded-xl bg-card border border-border p-6">
      <h2 className="mb-1 text-lg font-semibold font-display text-foreground">
        Calendar
      </h2>
      <p className="mb-5 text-sm font-sans text-muted-foreground">
        Calendar events will display times in your selected timezone.
      </p>
      <TimezoneSelector value={timezone} onChange={onTimezoneChange} />
      {saved && !isPending && (
        <p role="alert" className="mt-4 rounded-lg bg-primary/10 border border-primary/20 px-3 py-3 text-sm text-primary">
          Timezone saved.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-destructive">{error}</p>
      )}
      <div className="mt-4 flex justify-end">
        <Button type="button" onClick={onSave} disabled={isPending}>
          Save timezone
        </Button>
      </div>
    </div>
  );
}

function CalendarSection() {
  const { user } = useAuth();
  const { mutateAsync, isPending } = useUpdateUser();
  const [timezone, setTimezone] = useState(
    () => user?.timezone ?? Intl.DateTimeFormat().resolvedOptions().timeZone ?? "America/New_York"
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    setSaved(false);
    setError(null);
    try {
      await mutateAsync({ timezone });
      setSaved(true);
    } catch (err) {
      setError(err?.message ?? "Failed to save timezone.");
    }
  };

  return (
    <CalendarSectionContent
      timezone={timezone}
      saved={saved}
      error={error}
      isPending={isPending}
      onTimezoneChange={setTimezone}
      onSave={handleSave}
    />
  );
}

function SharingSection() {
  return (
    <div className="rounded-xl bg-card border border-border p-6">
      <h2 className="mb-1 text-lg font-semibold font-display text-foreground">
        Sharing
      </h2>
      <p className="mb-5 text-sm font-sans text-muted-foreground">
        Generate read-only public links to share your pipeline or timeline with recruiters and friends.
      </p>
      <div className="flex flex-col gap-4">
        <SharePipeline />
        <ShareTimeline />
      </div>
    </div>
  );
}

function renderSection(activeSection, user) {
  switch (activeSection) {
    case "profile": return <SettingsProfileSection />;
    case "pipeline": return <SettingsPipelineSection />;
    case "calendar": return <CalendarSection />;
    case "notifications": return <SettingsNotificationsSection />;
    case "integrations": return <SettingsIntegrationsSection />;
    case "autopilot": return <SettingsAutopilotSection />;
    case "resume": return <SettingsResumeSection />;
    case "templates": return <SettingsTemplatesSection />;
    case "sharing": return <SharingSection />;
    case "reports": return <SettingsReportSection />;
    case "referral": return <SettingsReferralSection user={user} />;
    case "usage": return <SettingsUsageSection user={user} />;
    case "account": return <SettingsAccountSection />;
    default: return null;
  }
}

function Settings() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSection = searchParams.get("section") || "pipeline";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar />
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold font-display text-foreground">
          Settings
        </h1>
        <TabNav activeSection={activeSection} onSelect={(id) => setSearchParams({ section: id })} />
        <main id={SETTINGS_PANEL_ID} role="tabpanel">
          {renderSection(activeSection, user)}
        </main>
      </div>
    </div>
  );
}

export default Settings;
