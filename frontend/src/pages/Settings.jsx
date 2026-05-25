/** Settings page — two-column layout with nested sub-routes. */

import { Navigate, Route, Routes, useSearchParams } from "react-router-dom";

import SettingsAccountSection from "../components/SettingsAccountSection";
import SettingsAgentActivitySection from "../components/SettingsAgentActivitySection";
import SettingsAgentProfileSection from "../components/SettingsAgentProfileSection";
import SettingsAppearanceSection from "../components/SettingsAppearanceSection";
import SettingsAutopilotSection from "../components/SettingsAutopilotSection";
import SettingsGitHubSection from "../components/SettingsGitHubSection";
import SettingsIntegrationsSection from "../components/SettingsIntegrationsSection";
import SettingsLayout from "../components/SettingsLayout";
import SettingsNotificationsSection from "../components/SettingsNotificationsSection";
import SettingsPipelineSection from "../components/SettingsPipelineSection";
import SettingsProfileSection from "../components/SettingsProfileSection";
import SettingsReferralSection from "../components/SettingsReferralSection";
import SettingsReportSection from "../components/SettingsReportSection";
import SettingsResumeSection from "../components/SettingsResumeSection";
import SettingsSharingSection from "../components/SettingsSharingSection";
import SettingsTemplatesSection from "../components/SettingsTemplatesSection";
import SettingsUsageSection from "../components/SettingsUsageSection";
import SettingsWatchlistSection from "../components/SettingsWatchlistSection";
import { useAuth } from "../context/AuthContext";
import { SETTINGS_LEGACY_REDIRECTS } from "../lib/settingsRoutes";

function SettingsRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route element={<SettingsLayout />}>
        <Route index element={<Navigate to="profile" replace />} />
        <Route path="profile" element={<SettingsProfileSection />} />
        <Route path="notifications" element={<SettingsNotificationsSection />} />
        <Route path="appearance" element={<SettingsAppearanceSection />} />
        <Route path="stages" element={<SettingsPipelineSection />} />
        <Route path="templates" element={<SettingsTemplatesSection />} />
        <Route path="agent-profile" element={<SettingsAgentProfileSection />} />
        <Route path="autopilot" element={<SettingsAutopilotSection />} />
        <Route path="watchlist" element={<SettingsWatchlistSection />} />
        <Route path="resume" element={<SettingsResumeSection />} />
        <Route path="agent-notifications" element={<SettingsNotificationsSection />} />
        <Route path="integrations/gmail" element={<SettingsIntegrationsSection />} />
        <Route path="integrations/github" element={<SettingsGitHubSection />} />
        <Route path="billing" element={<SettingsUsageSection user={user} />} />
        <Route path="referral" element={<SettingsReferralSection user={user} />} />
        <Route path="account" element={<SettingsAccountSection />} />
        <Route path="sharing" element={<SettingsSharingSection />} />
        <Route path="reports" element={<SettingsReportSection />} />
        <Route path="agent-activity" element={<SettingsAgentActivitySection />} />
      </Route>
    </Routes>
  );
}

function Settings() {
  const [searchParams] = useSearchParams();
  const section = searchParams.get("section");
  const legacyTarget = section ? SETTINGS_LEGACY_REDIRECTS[section] : null;

  if (legacyTarget) {
    return <Navigate to={`/settings/${legacyTarget}`} replace />;
  }

  return <SettingsRoutes />;
}

export default Settings;
