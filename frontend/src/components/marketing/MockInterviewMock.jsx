/** Mock Interview session card with question and transcript bubbles — used in marketing. */

import Mic from "lucide-react/dist/esm/icons/mic";
import User from "lucide-react/dist/esm/icons/user";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";

const TRANSCRIPT = [
  {
    role: "interviewer",
    text: "Walk me through a time you had to ship something with an aggressive deadline. What did you cut, and why?",
  },
  {
    role: "you",
    text: "Last quarter at Carta, we had a feature-flag rollout blocked on a config UI. I shipped a CLI-only path first, batched the UI for the following sprint…",
  },
  {
    role: "interviewer",
    text: "Good. What signal told you the CLI cut was safe to ship without the UI?",
  },
];

const DEBRIEF_ITEMS = [
  { icon: CheckCircle2, color: "text-status-good", label: "Strong: concrete metrics on impact" },
  { icon: AlertCircle, color: "text-status-warn", label: "Drill: tighten the STAR opening" },
];

function MessageBubble({ role, text }) {
  const isYou = role === "you";
  return (
    <div className={`flex gap-2 ${isYou ? "flex-row-reverse" : ""}`}>
      <div
        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${
          isYou ? "bg-brand-600 text-white" : "bg-surface-2 text-text-2"
        }`}
      >
        {isYou ? (
          <User className="h-3 w-3" aria-hidden="true" />
        ) : (
          <Sparkles className="h-3 w-3" aria-hidden="true" />
        )}
      </div>
      <div
        className={`max-w-[78%] rounded-2xl px-3 py-2 text-[0.6875rem] leading-relaxed ${
          isYou
            ? "rounded-tr-sm bg-brand-50 text-text-1"
            : "rounded-tl-sm bg-surface-2 text-text-1"
        }`}
      >
        {text}
      </div>
    </div>
  );
}

function DebriefCard() {
  return (
    <div className="absolute -bottom-5 -left-4 w-[15.5rem] rounded-xl border border-border-2 bg-surface-0 p-3 shadow-[0_14px_38px_-12px_rgba(140,21,21,0.28),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[0.6875rem] font-semibold text-text-1">Debrief</span>
        <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[0.5625rem] font-semibold text-brand-700">
          82 / 100
        </span>
      </div>
      <ul className="space-y-1.5">
        {DEBRIEF_ITEMS.map(({ icon: Icon, color, label }) => (
          <li key={label} className="flex items-start gap-1.5">
            <Icon className={`mt-0.5 h-3 w-3 shrink-0 ${color}`} aria-hidden="true" />
            <span className="text-[0.625rem] leading-snug text-text-2">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function MockInterviewMock() {
  return (
    <div className="relative">
      <div
        aria-hidden="true"
        className="absolute -inset-x-8 -inset-y-6 -z-10 rounded-[2.25rem] bg-gradient-to-br from-brand-100/40 via-transparent to-brand-50/0 blur-2xl"
      />
      <div className="overflow-hidden rounded-2xl border border-border-2 bg-surface-0 shadow-[0_24px_70px_-30px_rgba(140,21,21,0.18),0_2px_6px_-1px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-border-1 bg-surface-1 px-4 py-3">
          <div className="flex items-center gap-2">
            <Mic className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-text-1">Mock Interview</span>
            <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[0.5625rem] font-medium text-brand-700">
              Behavioural
            </span>
          </div>
          <span className="inline-flex items-center gap-1.5 text-[0.6875rem] text-text-3">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-status-bad" aria-hidden="true" />
            12:34 · Live
          </span>
        </div>

        <div className="relative px-5 pb-10 pt-5">
          <div className="mb-4 rounded-lg border border-brand-200/60 bg-brand-50/40 p-3">
            <p className="text-[0.5625rem] font-medium uppercase tracking-[0.08em] text-brand-700">
              Question 3 of 6
            </p>
            <p className="mt-1 text-xs font-medium leading-relaxed text-text-1">
              Tell me about a time you had to make a trade-off between scope and quality.
            </p>
          </div>

          <div className="space-y-2.5">
            {TRANSCRIPT.map((message, i) => (
              <MessageBubble key={i} {...message} />
            ))}
          </div>
          <DebriefCard />
        </div>
      </div>
    </div>
  );
}
