/** Landing page: public marketing entry point explaining Pipelined's features. */

import { Link, Navigate } from "react-router-dom";

import BarChart2 from "lucide-react/dist/esm/icons/bar-chart-2";
import Bell from "lucide-react/dist/esm/icons/bell";
import BriefcaseIcon from "lucide-react/dist/esm/icons/briefcase";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar";
import GitBranch from "lucide-react/dist/esm/icons/git-branch";
import SearchIcon from "lucide-react/dist/esm/icons/search";
import ZapIcon from "lucide-react/dist/esm/icons/zap";

import { useAuth } from "../context/AuthContext";
import HeroSection from "../components/HeroSection";
import {
  BUTTON_PRIMARY,
  CARD_BASE,
  NAV_BRAND,
  NAV_LINK,
} from "../lib/designTokens";

const FEATURES = [
  {
    icon: ZapIcon,
    title: "One-Click Chrome Extension",
    description:
      "Capture job details from LinkedIn, Greenhouse, Lever, Ashby, and Workday in one click — no copy-paste.",
  },
  {
    icon: BarChart2,
    title: "AI Resume Scoring",
    description:
      "See how well your resume matches each role. GPT-powered fit scores surface the best opportunities.",
  },
  {
    icon: BriefcaseIcon,
    title: "Pipeline Dashboard",
    description:
      "Track every application from Applied to Offer. Kanban and list views with full stage history.",
  },
  {
    icon: CalendarIcon,
    title: "Interview Calendar",
    description:
      "Keep every phone screen, technical, and onsite interview organized on a built-in calendar.",
  },
  {
    icon: SearchIcon,
    title: "Curated Job Board",
    description:
      "Browse listings synced from GitHub job repos — all in one place with role, remote, and level filters.",
  },
  {
    icon: Bell,
    title: "Smart Notifications",
    description:
      "Follow-up reminders, stale app alerts, and interview countdowns so nothing slips through the cracks.",
  },
];

const FOOTER_LINKS = {
  Product: [
    { label: "Dashboard", to: "/dashboard" },
    { label: "Job Board", to: "/jobs" },
  ],
  Company: [
    { label: "About", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Careers", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "#" },
    { label: "Terms of Service", href: "#" },
  ],
};

function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border-default bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <Link to="/" className={`${NAV_BRAND} flex items-center gap-2`}>
          <GitBranch className="h-5 w-5 text-brand-500" aria-hidden="true" />
          Pipelined
        </Link>
        <nav className="flex items-center gap-2">
          <a href="#features" className={`${NAV_LINK} hidden sm:block`}>
            Features
          </a>
          <Link to="/login" className={NAV_LINK}>
            Log in
          </Link>
          <Link to="/register" className={BUTTON_PRIMARY}>
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24 md:px-10">
      <h2 className="mb-4 text-center text-3xl font-display font-semibold tracking-tight text-gray-900">
        Everything you need to land the job
      </h2>
      <p className="mx-auto mb-12 max-w-2xl text-center font-sans text-lg leading-relaxed text-gray-500">
        From the first click to the final offer, Pipelined has every step covered.
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div key={title} className={`${CARD_BASE} flex flex-col gap-3 p-6`}>
            <Icon className="h-6 w-6 text-gray-400" aria-hidden="true" />
            <h3 className="text-base font-display font-semibold text-gray-900">{title}</h3>
            <p className="font-sans text-sm leading-relaxed text-gray-500">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="bg-surface-secondary py-24 text-center">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="mb-4 text-3xl font-display font-semibold tracking-tight text-gray-900">
          Start tracking your applications today
        </h2>
        <p className="mb-8 font-sans text-lg leading-relaxed text-gray-500">
          Free forever. No credit card required.
        </p>
        <Link to="/register" className={`${BUTTON_PRIMARY} inline-flex items-center`}>
          Get Started Free
        </Link>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-border-default bg-white">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">
        <div className="mb-10 grid grid-cols-2 gap-8 sm:grid-cols-3">
          {Object.entries(FOOTER_LINKS).map(([heading, items]) => (
            <div key={heading}>
              <p className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-gray-400">
                {heading}
              </p>
              <ul className="space-y-2">
                {items.map(({ label, to, href }) => (
                  <li key={label}>
                    {to ? (
                      <Link
                        to={to}
                        className="font-sans text-sm text-gray-500 transition-colors hover:text-gray-900"
                      >
                        {label}
                      </Link>
                    ) : (
                      <a
                        href={href}
                        className="font-sans text-sm text-gray-500 transition-colors hover:text-gray-900"
                      >
                        {label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-border-default pt-6 text-center font-sans text-sm text-gray-400">
          © {new Date().getFullYear()} Pipelined. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function LandingPage() {
  const { user } = useAuth();
  if (user) return <Navigate to="/dashboard" replace />;

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <LandingNav />
      <main>
        <HeroSection />
        <FeaturesSection />
        <BottomCTA />
      </main>
      <LandingFooter />
    </div>
  );
}

export default LandingPage;
