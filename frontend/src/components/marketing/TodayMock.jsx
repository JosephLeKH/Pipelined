/** Mock Today page with mission list and morning brief preview — used in marketing. */

import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import CalendarClock from "lucide-react/dist/esm/icons/calendar-clock";
import Bell from "lucide-react/dist/esm/icons/bell";
import Sun from "lucide-react/dist/esm/icons/sun";
import Clock from "lucide-react/dist/esm/icons/clock";
import Mail from "lucide-react/dist/esm/icons/mail";

const MISSIONS = [
  {
    icon: CalendarClock,
    iconColor: "text-status-info",
    title: "Confirm Stripe phone screen — tomorrow 2:00 PM",
    meta: "Interview · Due today",
    priority: "P1",
  },
  {
    icon: Bell,
    iconColor: "text-brand-600",
    title: "Follow up with Linear recruiter (no reply in 6 days)",
    meta: "Follow-up · Stage: Phone Screen",
    priority: "P1",
  },
  {
    icon: Sparkles,
    iconColor: "text-status-violet",
    title: "Draft cover letter for Notion — SWE Intern",
    meta: "Apply Pack · Saved 2h ago",
    priority: "P2",
  },
  {
    icon: Clock,
    iconColor: "text-text-3",
    title: "Vercel application stale — 14 days no movement",
    meta: "Ghost watch · Stage: Applied",
    priority: "P3",
  },
];

function MissionRow({ icon: Icon, iconColor, title, meta, priority }) {
  return (
    <div className="flex items-start gap-3 border-b border-border-1 px-4 py-3 last:border-b-0">
      <Icon className={`mt-0.5 h-4 w-4 shrink-0 ${iconColor}`} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-1">{title}</p>
        <p className="mt-0.5 text-[0.6875rem] text-text-3">{meta}</p>
      </div>
      <span className="shrink-0 rounded-full bg-surface-2 px-2 py-0.5 text-[0.5625rem] font-semibold uppercase tracking-wide text-text-2">
        {priority}
      </span>
    </div>
  );
}

function MorningBriefCard() {
  return (
    <div className="absolute -bottom-6 -right-4 w-[15.5rem] rounded-xl border border-border-2 bg-surface-0 p-3.5 shadow-[0_14px_38px_-12px_rgba(140,21,21,0.28),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
      <div className="mb-2 flex items-center gap-1.5">
        <Sun className="h-3.5 w-3.5 text-status-warn" aria-hidden="true" />
        <span className="text-[0.6875rem] font-semibold text-text-1">Morning Brief</span>
        <span className="ml-auto inline-flex items-center gap-1 text-[0.5625rem] text-text-3">
          <Mail className="h-2.5 w-2.5" aria-hidden="true" />
          8:02 AM
        </span>
      </div>
      <p className="text-[0.6875rem] leading-relaxed text-text-2">
        4 missions queued. 1 interview tomorrow, 2 follow-ups due, 1 stale application worth a nudge.
      </p>
      <div className="mt-2.5 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-brand-600" aria-hidden="true" />
        <span className="text-[0.5625rem] font-medium text-brand-700">Open Today →</span>
      </div>
    </div>
  );
}

export default function TodayMock() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-x-8 -inset-y-6 -z-10 rounded-[2.25rem] bg-gradient-to-br from-brand-100/40 via-transparent to-brand-50/0 blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-border-2 bg-surface-0 shadow-[0_24px_70px_-30px_rgba(140,21,21,0.18),0_2px_6px_-1px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-border-1 bg-surface-1 px-4 py-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-text-1">Today</span>
            <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[0.5625rem] font-medium text-brand-700">
              4 missions
            </span>
          </div>
          <span className="text-[0.6875rem] text-text-3">Tue, Jun 2</span>
        </div>
        <div className="relative pb-12">
          {MISSIONS.map((mission) => (
            <MissionRow key={mission.title} {...mission} />
          ))}
          <MorningBriefCard />
        </div>
      </div>
    </div>
  );
}
