/** Split-screen auth layout: brand story on the left, form on the right. */
import { Link } from "react-router-dom";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Zap from "lucide-react/dist/esm/icons/zap";
import Target from "lucide-react/dist/esm/icons/target";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";

const FEATURES = [
  {
    Icon: Zap,
    title: "One-click capture",
    body: "Chrome extension saves any LinkedIn, Greenhouse, or Workday posting in a second.",
  },
  {
    Icon: Target,
    title: "AI fit scoring",
    body: "Know which roles actually match your resume before you spend an hour applying.",
  },
  {
    Icon: CalendarClock,
    title: "Never miss a deadline",
    body: "Gmail sync parses OA deadlines and interview invites into your calendar automatically.",
  },
];

function BrandPanel() {
  return (
    <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-500 via-brand-600 to-brand-800 p-12 text-white lg:flex lg:flex-col lg:justify-between">
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-white/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -left-20 h-96 w-96 rounded-full bg-brand-900/40 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.08),transparent_50%)]" />

      <Link
        to="/"
        className="relative z-10 inline-flex items-center gap-2 font-display text-2xl font-bold text-white no-underline"
      >
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
          <Sparkles className="h-5 w-5" />
        </span>
        Pipelined
      </Link>

      <div className="relative z-10 max-w-md">
        <h2 className="font-display text-4xl font-bold leading-tight tracking-tight">
          Track every application.
          <br />
          <span className="text-white/80">Land every interview.</span>
        </h2>
        <p className="mt-4 text-base leading-relaxed text-white/75">
          Your AI-powered job search command center. Built for students and new grads chasing
          their next role.
        </p>

        <ul className="mt-10 space-y-5">
          {FEATURES.map(({ Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="mt-0.5 flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-white/15 backdrop-blur-sm">
                <Icon className="h-4 w-4" />
              </span>
              <div>
                <p className="font-display text-sm font-semibold">{title}</p>
                <p className="mt-0.5 text-sm text-white/70">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 border-l-2 border-white/30 pl-4 text-xs italic text-white/65">
        Built by a Stanford CS student who got tired of tracking job apps in a spreadsheet.
      </p>
    </div>
  );
}

function AuthLayout({ children }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <BrandPanel />
      <div className="flex items-center justify-center bg-background text-foreground px-6 py-12 lg:px-12">
        <div className="w-full max-w-md">
          <Link
            to="/"
            className="mb-10 inline-flex items-center gap-2 font-display text-xl font-bold text-foreground no-underline lg:hidden"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </span>
            Pipelined
          </Link>
          {children}
        </div>
      </div>
    </div>
  );
}

export default AuthLayout;
