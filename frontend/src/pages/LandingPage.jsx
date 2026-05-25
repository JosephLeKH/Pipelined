/** Landing page: Linear-inspired marketing surface with numbered product sections. */

import { Navigate } from "react-router-dom";

import { useAuth } from "../context/AuthContext";
import HeroSection from "../components/HeroSection";
import MarketingNav from "../components/marketing/MarketingNav";
import MarketingFooter from "../components/marketing/MarketingFooter";
import NumberedSection from "../components/marketing/NumberedSection";
import LandingChangelog from "../components/marketing/LandingChangelog";
import TestimonialGrid from "../components/marketing/TestimonialGrid";
import FinalCTA from "../components/marketing/FinalCTA";
import { LANDING_SECTIONS } from "../components/marketing/landingSections";

function LandingPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/today" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-surface-0 font-sans">
      <MarketingNav />
      <main>
        <HeroSection />
        {LANDING_SECTIONS.map((section) => (
          <NumberedSection key={section.id} {...section} />
        ))}
        <LandingChangelog />
        <TestimonialGrid />
        <FinalCTA />
      </main>
      <MarketingFooter />
    </div>
  );
}

export default LandingPage;
