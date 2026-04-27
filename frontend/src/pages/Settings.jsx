/** Settings page — tab-navigated settings with organized card sections. */

import { useState } from "react";

import NavBar from "../components/NavBar";
import SettingsAccountSection from "../components/SettingsAccountSection";
import SettingsNotificationsSection from "../components/SettingsNotificationsSection";
import SettingsPipelineSection from "../components/SettingsPipelineSection";
import SettingsProfileSection from "../components/SettingsProfileSection";
import SettingsResumeSection from "../components/SettingsResumeSection";
import SettingsTemplatesSection from "../components/SettingsTemplatesSection";
import SettingsReferralSection from "../components/SettingsReferralSection";
import SettingsReportSection from "../components/SettingsReportSection";
import SettingsUsageSection from "../components/SettingsUsageSection";
import SharePipeline from "../components/SharePipeline";
import ShareTimeline from "../components/ShareTimeline";
import TimezoneSelector from "../components/TimezoneSelector";
import { useAuth } from "../context/AuthContext";
import { useUpdateUser } from "../hooks/useAuth";
import { CARD_BASE, BUTTON_PRIMARY, NAV_LINK, NAV_LINK_ACTIVE, SUCCESS_BANNER } from "../lib/designTokens";

const NAV_ITEMS = [
  { id: "pipeline", label: "Pipeline" },
  { id: "profile", label: "Profile" },
  { id: "calendar", label: "Calendar" },
  { id: "notifications", label: "Notifications" },
  { id: "resume", label: "Resume & AI" },
  { id: "templates", label: "Templates" },
  { id: "sharing", label: "Sharing" },
  { id: "reports", label: "Reports" },
  { id: "referral", label: "Invite Friends" },
  { id: "usage", label: "Usage & Plan" },
  { id: "account", label: "Account" },
];

function TabNav({ activeSection, onSelect }) {
  return (
    <nav role="tablist" className="mb-6 flex flex-wrap gap-1 border-b border-border-default pb-3">
      {NAV_ITEMS.map(({ id, label }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={activeSection === id}
          aria-controls={"panel-" + id}
          onClick={() => onSelect(id)}
          className={activeSection === id ? NAV_LINK_ACTIVE : NAV_LINK}
        >
          {label}
        </button>
      ))}
    </nav>
  );
}

function CalendarSectionContent({ timezone, saved, error, isPending, onTimezoneChange, onSave }) {
  return (
    <div className={`${CARD_BASE} p-6`}>
      <h2 className="mb-1 text-lg font-semibold font-display text-gray-900 dark:text-gray-100">
        Calendar
      </h2>
      <p className="mb-5 text-sm font-sans text-gray-500 dark:text-gray-400">
        Calendar events will display times in your selected timezone.
      </p>
      <TimezoneSelector value={timezone} onChange={onTimezoneChange} />
      {saved && !isPending && (
        <p role="alert" className={`mt-4 ${SUCCESS_BANNER}`}>
          Timezone saved.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={onSave}
          disabled={isPending}
          className={BUTTON_PRIMARY}
        >
          Save timezone
        </button>
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
    <div className={`${CARD_BASE} p-6`}>
      <h2 className="mb-1 text-lg font-semibold font-display text-gray-900 dark:text-gray-100">
        Sharing
      </h2>
      <p className="mb-5 text-sm font-sans text-gray-500 dark:text-gray-400">
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
  const [activeSection, setActiveSection] = useState("pipeline");

  return (
    <div className="flex min-h-screen flex-col bg-surface-secondary">
      <NavBar />
      <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-8">
        <h1 className="mb-6 text-2xl font-semibold font-display text-gray-900 dark:text-gray-100">
          Settings
        </h1>
        <TabNav activeSection={activeSection} onSelect={setActiveSection} />
        <main id={"panel-" + activeSection} role="tabpanel">
          {renderSection(activeSection, user)}
        </main>
      </div>
    </div>
  );
}

export default Settings;
