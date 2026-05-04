/** Landing page: public marketing entry point explaining Pipelined's features. */

import { useEffect, useRef } from "react";
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
import { Button } from "../components/ui/button";

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
    { label: "About", href: "/about" },
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 md:px-10">
        <Link to="/" className="font-display font-semibold text-lg tracking-tight text-foreground flex items-center gap-2">
          <GitBranch className="h-5 w-5 text-primary" aria-hidden="true" />
          Pipelined
        </Link>
        <nav className="flex items-center gap-2">
          <a href="#features" className="text-muted-foreground hover:text-foreground text-sm font-display font-medium transition-colors px-3 py-2 rounded-md hidden sm:block">
            Features
          </a>
          <Link to="/login" className="text-muted-foreground hover:text-foreground text-sm font-display font-medium transition-colors px-3 py-2 rounded-md">
            Log in
          </Link>
          <Button asChild>
            <Link to="/register">Get Started</Link>
          </Button>
        </nav>
      </div>
    </header>
  );
}

const STAGGER_MS = 80;

function FeaturesSection() {
  const gridRef = useRef(null);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;

    const cards = Array.from(grid.querySelectorAll(".scroll-reveal"));
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          const index = cards.indexOf(entry.target);
          setTimeout(() => entry.target.classList.add("in-view"), index * STAGGER_MS);
          observer.unobserve(entry.target);
        });
      },
      { threshold: 0.1 },
    );

    cards.forEach((card) => observer.observe(card));
    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-24 md:px-10">
      <h2 className="mb-4 text-center text-3xl font-display font-semibold tracking-tight text-foreground">
        Everything you need to land the job
      </h2>
      <p className="mx-auto mb-12 max-w-2xl text-center font-sans text-lg leading-relaxed text-muted-foreground">
        From the first click to the final offer, Pipelined has every step covered.
      </p>
      <div ref={gridRef} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }) => (
          <div key={title} className="rounded-xl bg-card border border-border scroll-reveal flex flex-col gap-3 p-6">
            <Icon className="h-6 w-6 text-muted-foreground" aria-hidden="true" />
            <h3 className="text-base font-display font-semibold text-foreground">{title}</h3>
            <p className="font-sans text-sm leading-relaxed text-muted-foreground">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="bg-muted py-24 text-center">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="mb-4 text-3xl font-display font-semibold tracking-tight text-foreground">
          Start tracking your applications today
        </h2>
        <p className="mb-8 font-sans text-lg leading-relaxed text-muted-foreground">
          Free forever. No credit card required.
        </p>
        <Button asChild className="inline-flex items-center">
          <Link to="/register">Get Started Free</Link>
        </Button>
      </div>
    </section>
  );
}

function LandingFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">
        <div className="mb-10 grid grid-cols-2 gap-8 sm:grid-cols-3">
          {Object.entries(FOOTER_LINKS).map(([heading, items]) => (
            <div key={heading}>
              <p className="mb-3 font-display text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {heading}
              </p>
              <ul className="space-y-2">
                {items.map(({ label, to, href }) => (
                  <li key={label}>
                    {to ? (
                      <Link
                        to={to}
                        className="font-sans text-sm text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {label}
                      </Link>
                    ) : (
                      <a
                        href={href}
                        className="font-sans text-sm text-muted-foreground transition-colors hover:text-foreground"
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
        <div className="border-t border-border pt-6 text-center font-sans text-sm text-muted-foreground">
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
    <div className="flex min-h-screen flex-col bg-background">
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
