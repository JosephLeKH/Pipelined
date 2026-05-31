/** Landing page: agentic, AI-native positioning with Stanford Cardinal Red accent. */

import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import HeroSection from "../components/HeroSection";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import AutopilotFlow from "../components/marketing/AutopilotFlow";
import FeatureBento from "../components/marketing/FeatureBento";
import NumberedSection from "../components/marketing/NumberedSection";
import LandingChangelog from "../components/marketing/LandingChangelog";
import { LANDING_SECTIONS } from "../components/marketing/landingSections";

function LandingPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/today" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-surface-0 font-sans">
      <MarketingNav />
      <main>
        <HeroSection />
        <AutopilotFlow />
        <FeatureBento />
        {LANDING_SECTIONS.map((section) => (
          <NumberedSection key={section.id} {...section} />
        ))}
        <LandingChangelog />
      </main>
      <MarketingFooter />
    </div>
  );
}

export default LandingPage;
