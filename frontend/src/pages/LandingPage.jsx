/** Landing page: public marketing entry point explaining Pipelined's features. */

import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";

import BarChart2 from "lucide-react/dist/esm/icons/bar-chart-2";
import Bell from "lucide-react/dist/esm/icons/bell";
import BriefcaseIcon from "lucide-react/dist/esm/icons/briefcase";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar";
import GitBranch from "lucide-react/dist/esm/icons/git-branch";
import Globe from "lucide-react/dist/esm/icons/globe";
import PuzzleIcon from "lucide-react/dist/esm/icons/puzzle";
import SearchIcon from "lucide-react/dist/esm/icons/search";
import ZapIcon from "lucide-react/dist/esm/icons/zap";

import { useAuth } from "../context/AuthContext";
import HeroSection from "../components/HeroSection";

const CHROME_EXTENSION_URL = "https://chrome.google.com/webstore/detail/pipelined";

const FEATURES = [
  { icon: ZapIcon, title: "One-Click Chrome Extension", description: "Capture job details from LinkedIn, Greenhouse, Lever, Ashby, and Workday in one click — no copy-paste." },
  { icon: BarChart2, title: "AI Resume Scoring", description: "See how well your resume matches each role. GPT-powered fit scores surface the best opportunities." },
  { icon: BriefcaseIcon, title: "Pipeline Dashboard", description: "Track every application from Applied to Offer. Kanban and list views with full stage history." },
  { icon: CalendarIcon, title: "Interview Calendar", description: "Keep every phone screen, technical, and onsite interview organized on a built-in calendar." },
  { icon: SearchIcon, title: "Curated Job Board", description: "Browse listings synced from GitHub job repos — all in one place with role, remote, and level filters." },
  { icon: Bell, title: "Smart Notifications", description: "Follow-up reminders, stale app alerts, and interview countdowns so nothing slips through the cracks." },
];

const STEPS = [
  { num: "1", icon: PuzzleIcon, title: "Install the Extension", desc: "Add Pipelined to Chrome in one click — works on 10+ job boards." },
  { num: "2", icon: Globe, title: "Browse & Apply", desc: "Hit Save on any job listing. We capture the role, company, and posting automatically." },
  { num: "3", icon: BarChart2, title: "Track Everything", desc: "Your pipeline, calendar, contacts, and AI fit scores — all in one place." },
];

const STATS = [
  { value: "10,000+", label: "Applications Tracked" },
  { value: "500+", label: "Active Users" },
  { value: "10", label: "Job Boards Supported" },
];

function useInView(ref) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setVisible(true); obs.disconnect(); }
    }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return visible;
}

function LandingNav() {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/60 bg-white/80 backdrop-blur-md dark:border-slate-700/60 dark:bg-slate-900/80">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5 md:px-10">
        <Link to="/" className="flex items-center gap-2 text-xl font-bold text-slate-900 dark:text-white">
          <GitBranch className="h-5 w-5 text-brand-600" aria-hidden="true" />
          Pipelined
        </Link>
        <nav className="flex items-center gap-2">
          <a href="#features" className="hidden px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:block">
            Features
          </a>
          <a href="#jobs" className="hidden px-3 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white sm:block">
            Job Board
          </a>
          <Link to="/login" className="rounded-button px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
            Log in
          </Link>
          <Link to="/register" className="rounded-button bg-gradient-to-r from-brand-600 to-brand-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-brand-700 hover:to-brand-600 active:scale-[0.98] transition-all duration-150">
            Get Started
          </Link>
        </nav>
      </div>
    </header>
  );
}

function TrustBar() {
  return (
    <section className="border-y border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/50">
      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
        <p className="mb-5 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
          Trusted by students at top universities
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
          {["Stanford", "MIT", "UC Berkeley", "Carnegie Mellon", "Georgia Tech"].map((u) => (
            <span key={u} className="text-sm font-semibold text-slate-300 dark:text-slate-600">{u}</span>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeaturesSection() {
  const ref = useRef(null);
  const visible = useInView(ref);
  return (
    <section id="features" className="mx-auto max-w-6xl px-6 py-20 md:px-10">
      <h2 className="mb-12 text-center text-3xl font-bold text-slate-900 dark:text-white">
        Everything you need to land the job
      </h2>
      <div ref={ref} className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, description }, i) => (
          <div
            key={title}
            className={`scroll-reveal${visible ? " in-view" : ""} flex flex-col gap-3 rounded-xl border border-slate-200/60 bg-white p-6 shadow-card hover:shadow-card-hover transition-shadow dark:border-slate-700 dark:bg-slate-800`}
            style={{ transitionDelay: `${i * 80}ms` }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/30">
              <Icon className="h-5 w-5 text-brand-600 dark:text-brand-400" aria-hidden="true" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatsBar() {
  return (
    <section aria-label="Stats" className="bg-brand-600 dark:bg-brand-700">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-8 px-6 py-14 sm:flex-row sm:justify-around md:px-10">
        {STATS.map(({ value, label }) => (
          <div key={label} className="flex flex-col items-center gap-1 text-center">
            <span className="text-3xl font-bold text-white">{value}</span>
            <span className="text-sm text-brand-200">{label}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const ref = useRef(null);
  const visible = useInView(ref);
  return (
    <section className="mx-auto max-w-4xl px-6 py-20 md:px-10">
      <h2 className="mb-12 text-center text-3xl font-bold text-slate-900 dark:text-white">How it works</h2>
      <div ref={ref} className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        {STEPS.map(({ num, icon: Icon, title, desc }, i) => (
          <div
            key={num}
            className={`scroll-reveal${visible ? " in-view" : ""} flex flex-col items-center gap-3 text-center`}
            style={{ transitionDelay: `${i * 120}ms` }}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
              {num}
            </div>
            <Icon className="h-6 w-6 text-brand-600 dark:text-brand-400" aria-hidden="true" />
            <h3 className="font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
            <p className="text-sm text-slate-600 dark:text-slate-400">{desc}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="bg-gradient-to-r from-brand-600 to-violet-600 py-20 text-center">
      <div className="mx-auto max-w-2xl px-6">
        <h2 className="mb-3 text-3xl font-bold text-white">Start tracking your applications today</h2>
        <p className="mb-8 text-brand-200">Free forever. No credit card required.</p>
        <Link
          to="/register"
          className="inline-block rounded-button bg-white px-8 py-3.5 text-base font-semibold text-brand-700 shadow-lg hover:bg-brand-50 active:scale-[0.98] transition-all duration-150"
        >
          Get Started Free
        </Link>
      </div>
    </section>
  );
}

function LandingFooter() {
  const links = {
    Product: [{ label: "Dashboard", to: "/dashboard" }, { label: "Job Board", to: "/jobs" }, { label: "Extension", href: CHROME_EXTENSION_URL }],
    Company: [{ label: "About", href: "#" }, { label: "Blog", href: "#" }, { label: "Careers", href: "#" }],
    Legal: [{ label: "Privacy Policy", href: "#" }, { label: "Terms of Service", href: "#" }],
  };
  return (
    <footer className="bg-slate-900 text-slate-400">
      <div className="mx-auto max-w-6xl px-6 py-12 md:px-10">
        <div className="mb-10 grid grid-cols-2 gap-8 sm:grid-cols-3">
          {Object.entries(links).map(([heading, items]) => (
            <div key={heading}>
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-500">{heading}</p>
              <ul className="space-y-2">
                {items.map(({ label, to, href }) => (
                  <li key={label}>
                    {to ? (
                      <Link to={to} className="text-sm hover:text-white transition-colors">{label}</Link>
                    ) : (
                      <a href={href} className="text-sm hover:text-white transition-colors">{label}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="border-t border-slate-800 pt-6 text-center text-sm">
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
    <div className="flex min-h-screen flex-col bg-white dark:bg-slate-900">
      <LandingNav />
      <main>
        <HeroSection />
        <TrustBar />
        <FeaturesSection />
        <StatsBar />
        <HowItWorksSection />
        <BottomCTA />
      </main>
      <LandingFooter />
    </div>
  );
}

export default LandingPage;
