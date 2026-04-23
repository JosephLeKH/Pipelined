/** Settings page — sidebar-navigated settings with organized card sections. */

import { useState } from "react";

import BarChart2 from "lucide-react/dist/esm/icons/bar-chart-2";
import Bell from "lucide-react/dist/esm/icons/bell";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar";
import Download from "lucide-react/dist/esm/icons/download";
import FileText from "lucide-react/dist/esm/icons/file-text";
import Gift from "lucide-react/dist/esm/icons/gift";
import LayoutTemplate from "lucide-react/dist/esm/icons/layout-template";
import Layers from "lucide-react/dist/esm/icons/layers";
import Settings2 from "lucide-react/dist/esm/icons/settings-2";
import Share2 from "lucide-react/dist/esm/icons/share-2";
import User from "lucide-react/dist/esm/icons/user";

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

const SIDEBAR_ITEMS = [
  { id: "pipeline", label: "Pipeline", icon: Layers },
  { id: "profile", label: "Profile", icon: User },
  { id: "calendar", label: "Calendar", icon: CalendarIcon },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "resume", label: "Resume & AI", icon: FileText },
  { id: "templates", label: "Templates", icon: LayoutTemplate },
  { id: "sharing", label: "Sharing", icon: Share2 },
  { id: "reports", label: "Reports", icon: Download },
  { id: "referral", label: "Invite Friends", icon: Gift },
  { id: "usage", label: "Usage & Plan", icon: BarChart2 },
  { id: "account", label: "Account", icon: Settings2 },
];

function CalendarSectionContent({ timezone, saved, error, isPending, onTimezoneChange, onSave }) {
  return (
    <div className="rounded-card border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">Calendar</h2>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
        Calendar events will display times in your selected timezone.
      </p>
      <TimezoneSelector value={timezone} onChange={onTimezoneChange} />
      {saved && !isPending && (
        <p role="alert" className="mt-4 rounded bg-green-50 px-3 py-2 text-sm text-green-700 dark:bg-green-900/30 dark:text-green-300">
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
          className="rounded-button bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:ring-offset-2"
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
    <div className="rounded-card border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <h2 className="mb-1 text-lg font-semibold text-gray-900 dark:text-gray-100">Sharing</h2>
      <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">
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

function MobileTabBar({ activeSection, onSelect }) {
  return (
    <div className="flex overflow-x-auto border-b border-gray-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-800 md:hidden">
      {SIDEBAR_ITEMS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onSelect(id)}
          className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-3 text-sm font-medium border-b-2 transition-colors ${
            activeSection === id
              ? "border-brand-600 text-brand-700 dark:border-brand-400 dark:text-brand-300"
              : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          }`}
        >
          <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {label}
        </button>
      ))}
    </div>
  );
}

function SettingsSidebar({ activeSection, onSelect }) {
  return (
    <aside className="hidden w-56 shrink-0 md:block">
      <nav className="flex flex-col gap-0.5">
        {SIDEBAR_ITEMS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`flex w-full items-center gap-2.5 rounded-button px-3 py-2 text-sm font-medium transition-colors ${
              activeSection === id
                ? "bg-brand-50 text-brand-700 dark:bg-brand-900/20 dark:text-brand-300"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-100"
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            {label}
          </button>
        ))}
      </nav>
    </aside>
  );
}

function Settings() {
  const { user } = useAuth();
  const [activeSection, setActiveSection] = useState("pipeline");

  return (
    <div className="flex min-h-screen flex-col bg-gray-50 dark:bg-gray-900">
      <NavBar />
      <MobileTabBar activeSection={activeSection} onSelect={setActiveSection} />
      <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
        <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
        <div className="flex gap-8">
          <SettingsSidebar activeSection={activeSection} onSelect={setActiveSection} />
          <main className="min-w-0 flex-1">
            {renderSection(activeSection, user)}
          </main>
        </div>
      </div>
    </div>
  );
}

export default Settings;
