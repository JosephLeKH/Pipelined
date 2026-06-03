/** Mock Apply Pack panel with tabs and cover letter preview — used in marketing. */

import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Copy from "lucide-react/dist/esm/icons/copy";
import FileText from "lucide-react/dist/esm/icons/file-text";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import Linkedin from "lucide-react/dist/esm/icons/linkedin";
import ListChecks from "lucide-react/dist/esm/icons/list-checks";

const TABS = [
  { icon: FileText, label: "Cover letter", active: true },
  { icon: MessageSquare, label: "Short answers", active: false },
  { icon: Linkedin, label: "LinkedIn note", active: false },
  { icon: ListChecks, label: "Talking points", active: false },
];

const COVER_LETTER_PARAGRAPHS = [
  "Dear Notion hiring team,",
  "I'm applying for the Software Engineer Intern role because Notion's collaborative document model is the cleanest answer I've seen to a problem I care about: making tools that fade into the background of real work.",
  "In my current role at Stanford Carta, I shipped a React + FastAPI feature flag system used by 12 internal teams, and the same instincts — small APIs, observable state, no clever abstractions — would carry over directly to your product surface.",
];

function CopilotChip() {
  return (
    <div className="absolute -right-4 -top-5 w-[15rem] rounded-xl border border-border-2 bg-surface-0 p-3 shadow-[0_14px_38px_-12px_rgba(140,21,21,0.28),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
      <div className="mb-1.5 flex items-center gap-1.5">
        <Sparkles className="h-3 w-3 text-brand-600" aria-hidden="true" />
        <span className="text-[0.6875rem] font-semibold text-text-1">Co-pilot</span>
        <span className="ml-auto text-[0.5625rem] text-text-3">Streaming</span>
      </div>
      <p className="text-[0.6875rem] leading-relaxed text-text-2">
        Cited from your résumé bullet on the Carta feature flag system and the JD's "small APIs" requirement.
      </p>
    </div>
  );
}

export default function ApplyPackMock() {
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
            <span className="text-sm font-semibold text-text-1">Apply pack</span>
            <span className="rounded-full bg-brand-50 px-1.5 py-0.5 text-[0.5625rem] font-medium text-brand-700">
              Notion · SWE Intern
            </span>
          </div>
          <span className="text-[0.5625rem] text-text-3">Generated 2m ago</span>
        </div>

        <div className="flex items-center gap-1 border-b border-border-1 bg-surface-0 px-3 py-2">
          {TABS.map(({ icon: Icon, label, active }) => (
            <div
              key={label}
              className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-[0.6875rem] font-medium ${
                active
                  ? "bg-brand-50 text-brand-700"
                  : "text-text-3"
              }`}
            >
              <Icon className="h-3 w-3" aria-hidden="true" />
              {label}
            </div>
          ))}
        </div>

        <div className="relative px-5 pb-6 pt-5">
          <div className="rounded-lg border border-border-1 bg-surface-1/40 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[0.6875rem] font-medium uppercase tracking-[0.08em] text-text-3">
                Cover letter
              </span>
              <span className="inline-flex items-center gap-1 text-[0.6875rem] font-medium text-brand-700">
                <Copy className="h-3 w-3" aria-hidden="true" />
                Copy
              </span>
            </div>
            <div className="space-y-3 font-sans text-xs leading-relaxed text-text-1">
              {COVER_LETTER_PARAGRAPHS.map((paragraph, i) => (
                <p key={i}>{paragraph}</p>
              ))}
              <div className="space-y-1.5 pt-1">
                <div className="h-1.5 w-full rounded bg-surface-2" />
                <div className="h-1.5 w-11/12 rounded bg-surface-2" />
                <div className="h-1.5 w-3/5 rounded bg-surface-2" />
              </div>
            </div>
          </div>
          <CopilotChip />
        </div>
      </div>
    </div>
  );
}
