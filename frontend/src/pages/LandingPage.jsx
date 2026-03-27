/** Landing page: public marketing entry point explaining Pipelined's features. */

import { Link } from "react-router-dom";

import BriefcaseIcon from "lucide-react/dist/esm/icons/briefcase";
import ZapIcon from "lucide-react/dist/esm/icons/zap";
import CalendarIcon from "lucide-react/dist/esm/icons/calendar";
import SearchIcon from "lucide-react/dist/esm/icons/search";

const FEATURES = [
  {
    icon: BriefcaseIcon,
    title: "Pipeline Dashboard",
    description:
      "See every application at a glance. Track stages from Applied to Offer with full history and notes.",
  },
  {
    icon: ZapIcon,
    title: "One-Click Chrome Extension",
    description:
      "Capture job details from LinkedIn, Greenhouse, Lever, Ashby, and Workday without leaving the page.",
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
      "Browse listings synced from GitHub job repos, all in one place with filters for role and location.",
  },
];

function FeatureCard({ icon: Icon, title, description }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-50">
        <Icon className="h-5 w-5 text-blue-600" aria-hidden="true" />
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="text-sm leading-relaxed text-gray-600">{description}</p>
    </div>
  );
}

function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      <header className="flex items-center justify-between px-6 py-4 md:px-12">
        <span className="text-xl font-bold text-gray-900">Pipelined</span>
        <nav className="flex gap-3">
          <Link
            to="/login"
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Log in
          </Link>
          <Link
            to="/register"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Sign up free
          </Link>
        </nav>
      </header>

      <main className="flex flex-1 flex-col">
        <section className="flex flex-col items-center gap-6 px-6 py-20 text-center md:px-12 md:py-28">
          <h1 className="max-w-2xl text-4xl font-extrabold tracking-tight text-gray-900 md:text-5xl">
            Track every job application,{" "}
            <span className="text-blue-600">effortlessly.</span>
          </h1>
          <p className="max-w-xl text-lg text-gray-600">
            Pipelined keeps your job search organized from the first click to the final offer.
            Capture applications in one click, follow every stage, and never lose track of an
            interview.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              to="/register"
              className="rounded-lg bg-blue-600 px-7 py-3 text-base font-semibold text-white hover:bg-blue-700"
            >
              Get started — it's free
            </Link>
            <Link
              to="/login"
              className="rounded-lg border border-gray-300 bg-white px-7 py-3 text-base font-semibold text-gray-700 hover:bg-gray-50"
            >
              Log in
            </Link>
          </div>
        </section>

        <section className="px-6 pb-20 md:px-12" aria-labelledby="features-heading">
          <h2
            id="features-heading"
            className="mb-8 text-center text-2xl font-bold text-gray-900"
          >
            Everything you need in your job search
          </h2>
          <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </section>

        <section className="border-t border-gray-200 bg-white px-6 py-16 text-center md:px-12">
          <h2 className="mb-4 text-2xl font-bold text-gray-900">
            Ready to take control of your job search?
          </h2>
          <p className="mb-6 text-gray-600">
            Join job seekers who track their pipeline with Pipelined.
          </p>
          <Link
            to="/register"
            className="inline-block rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white hover:bg-blue-700"
          >
            Create your free account
          </Link>
        </section>
      </main>

      <footer className="border-t border-gray-200 px-6 py-6 text-center text-sm text-gray-500 md:px-12">
        © {new Date().getFullYear()} Pipelined. All rights reserved.
      </footer>
    </div>
  );
}

export default LandingPage;
