/** Interview Prep Agent — intelligence briefing UI with tab navigation. */

import AlertCircle from "lucide-react/dist/esm/icons/alert-circle";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import Building2 from "lucide-react/dist/esm/icons/building-2";
import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import TrendingUp from "lucide-react/dist/esm/icons/trending-up";
import User from "lucide-react/dist/esm/icons/user";
import { useState } from "react";

import { useInterviewPrep } from "../hooks/useInterviewPrep";
import AiSection from "./AiSection";
import { Button } from "./ui/button";

// ── Primitives ─────────────────────────────────────────────────────────────────

function Tag({ children, variant = "default" }) {
  const cls = {
    default: "bg-primary/10 text-primary dark:bg-primary/20",
    success: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
    danger: "bg-destructive/10 text-destructive",
    muted: "bg-muted text-muted-foreground",
  }[variant];
  return (
    <span className={`inline-block rounded-badge px-2 py-0.5 text-xs font-medium ${cls}`}>
      {children}
    </span>
  );
}

function RowList({ items, variant = "default" }) {
  if (!items?.length) return null;
  const dot = {
    default: "text-muted-foreground",
    success: "text-emerald-500",
    danger: "text-destructive",
    warning: "text-warning",
  }[variant];
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2 text-sm leading-relaxed">
          <span className={`mt-1.5 h-1 w-1 shrink-0 rounded-full ${dot} bg-current`} />
          <span className="text-foreground/85">{item}</span>
        </li>
      ))}
    </ul>
  );
}

function SubLabel({ children }) {
  return <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{children}</span>;
}

// ── Tab strip ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: "you", label: "For You", icon: User },
  { id: "comp", label: "Comp", icon: TrendingUp },
  { id: "process", label: "Process", icon: Sparkles },
  { id: "company", label: "Company", icon: Building2 },
];

function TabStrip({ active, onChange }) {
  return (
    <div className="flex gap-0 border-b border-border">
      {TABS.map(({ id, label, icon: Icon }) => {
        const isActive = active === id;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`relative flex flex-1 items-center justify-center gap-1.5 px-1 py-2.5 text-xs font-medium transition-colors
              ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}
          >
            <Icon className="h-3 w-3 shrink-0" />
            <span>{label}</span>
            {isActive && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-primary" />
            )}
          </button>
        );
      })}
    </div>
  );
}

// ── Briefing tabs ──────────────────────────────────────────────────────────────

function ForYouTab({ notes }) {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
      {notes.salary_context && (
        <div className="rounded-md border-l-2 border-primary bg-accent/40 px-3 py-2.5 text-sm text-foreground/90 leading-relaxed">
          {notes.salary_context}
        </div>
      )}
      {notes.relevant_experience?.length > 0 && (
        <div className="flex flex-col gap-2">
          <SubLabel>Highlight from your background</SubLabel>
          <RowList items={notes.relevant_experience} variant="success" />
        </div>
      )}
      {notes.experience_gaps?.length > 0 && (
        <div className="flex flex-col gap-2">
          <SubLabel>Brush up on</SubLabel>
          <RowList items={notes.experience_gaps} variant="warning" />
        </div>
      )}
      {notes.questions_to_ask?.length > 0 && (
        <div className="flex flex-col gap-2">
          <SubLabel>Questions to ask them</SubLabel>
          <ol className="flex flex-col gap-1.5">
            {notes.questions_to_ask.map((q, i) => (
              <li key={i} className="flex gap-2 text-sm leading-relaxed">
                <span className="mt-0.5 w-4 shrink-0 text-xs font-semibold text-primary">{i + 1}.</span>
                <span className="text-foreground/85">{q}</span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function CompTab({ comp }) {
  const tiers = [
    { label: "P25", value: comp.p25_total_comp, muted: true },
    { label: "Median", value: comp.median_total_comp, muted: false },
    { label: "P75", value: comp.p75_total_comp, muted: true },
  ];
  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="flex items-stretch gap-0 rounded-lg border border-border overflow-hidden">
        {tiers.map(({ label, value, muted }, i) => (
          <div key={label} className={`flex flex-1 flex-col items-center gap-0.5 px-2 py-3
            ${!muted ? "bg-primary/8 dark:bg-primary/12" : "bg-transparent"}
            ${i < tiers.length - 1 ? "border-r border-border" : ""}`}
          >
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
            <span className={`text-sm font-bold ${!muted ? "text-primary" : "text-foreground"}`}>{value}</span>
          </div>
        ))}
      </div>
      {comp.base_range && (
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Base range</span>
          <span className="font-medium text-foreground">{comp.base_range}</span>
        </div>
      )}
      {comp.notes && <p className="text-sm text-muted-foreground leading-relaxed">{comp.notes}</p>}
      {comp.sources?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {comp.sources.map((s) => <Tag key={s} variant="muted">{s}</Tag>)}
        </div>
      )}
    </div>
  );
}

function ProcessTab({ proc }) {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="flex gap-3 text-xs text-muted-foreground">
        {proc.duration_weeks && <span>{proc.duration_weeks}</span>}
        {proc.duration_weeks && proc.difficulty && <span>·</span>}
        {proc.difficulty && (
          <Tag variant={proc.difficulty === "Hard" ? "danger" : proc.difficulty === "Medium" ? "default" : "success"}>
            {proc.difficulty}
          </Tag>
        )}
      </div>
      {proc.rounds?.length > 0 && (
        <div className="flex flex-col gap-2">
          <SubLabel>Rounds</SubLabel>
          <div className="flex flex-col gap-1.5">
            {proc.rounds.map((round, i) => (
              <div key={i} className="flex gap-3">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{round.name}</span>
                  <span className="text-xs text-muted-foreground">{round.what_to_expect}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {proc.recent_questions?.length > 0 && (
        <div className="flex flex-col gap-2">
          <SubLabel>Questions asked</SubLabel>
          <RowList items={proc.recent_questions} />
        </div>
      )}
      {proc.tips?.length > 0 && (
        <div className="flex flex-col gap-2">
          <SubLabel>Tips</SubLabel>
          <RowList items={proc.tips} variant="success" />
        </div>
      )}
      {proc.sources?.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {proc.sources.map((s) => <Tag key={s} variant="muted">{s}</Tag>)}
        </div>
      )}
    </div>
  );
}

function CompanyTab({ intel }) {
  return (
    <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-1 duration-200">
      {intel.what_theyre_building && (
        <p className="text-sm text-foreground/85 leading-relaxed">{intel.what_theyre_building}</p>
      )}
      {intel.tech_stack?.length > 0 && (
        <div className="flex flex-col gap-2">
          <SubLabel>Tech stack</SubLabel>
          <div className="flex flex-wrap gap-1">{intel.tech_stack.map((t) => <Tag key={t}>{t}</Tag>)}</div>
        </div>
      )}
      {(intel.green_flags?.length > 0 || intel.red_flags?.length > 0) && (
        <div className="grid grid-cols-2 gap-3">
          {intel.green_flags?.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <SubLabel>Green flags</SubLabel>
              <RowList items={intel.green_flags} variant="success" />
            </div>
          )}
          {intel.red_flags?.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <SubLabel>Red flags</SubLabel>
              <RowList items={intel.red_flags} variant="danger" />
            </div>
          )}
        </div>
      )}
      {intel.recent_news?.length > 0 && (
        <div className="flex flex-col gap-2">
          <SubLabel>Recent news</SubLabel>
          <RowList items={intel.recent_news} />
        </div>
      )}
      {intel.culture_signals?.length > 0 && (
        <div className="flex flex-col gap-2">
          <SubLabel>Culture</SubLabel>
          <div className="flex flex-wrap gap-1">{intel.culture_signals.map((s) => <Tag key={s} variant="muted">{s}</Tag>)}</div>
        </div>
      )}
    </div>
  );
}

// ── State views ────────────────────────────────────────────────────────────────

function IdleView({ onStart }) {
  return (
    <div className="flex flex-col gap-3 rounded-card border border-accent bg-accent/25 p-4 dark:bg-accent/10">
      <div className="flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/15 dark:bg-primary/20">
          <BookOpen className="h-4 w-4 text-primary" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-semibold text-foreground">Interview Briefing</span>
          <span className="text-xs text-muted-foreground leading-relaxed">
            Researches salary bands, interview rounds, and company culture — personalized to your resume.
          </span>
        </div>
      </div>
      <Button onClick={onStart} size="sm" className="w-full gap-2">
        <Sparkles className="h-3.5 w-3.5" />
        Start Research
      </Button>
    </div>
  );
}

function RunningView({ steps }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <div className="flex gap-1">
          {[0, 150, 300].map((delay) => (
            <span
              key={delay}
              className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse"
              style={{ animationDelay: `${delay}ms` }}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-foreground">Researching…</span>
      </div>
      {steps.length > 0 && (
        <ul className="flex flex-col gap-1 pl-1">
          {steps.map((s, i) => (
            <li
              key={i}
              className="flex items-start gap-2 text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-300"
            >
              <CheckCircle2 className="mt-0.5 h-3 w-3 shrink-0 text-emerald-500" />
              <span>{s.step}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ErrorView({ message, onRetry }) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-destructive/30 bg-destructive/5 p-3">
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
        <p className="text-sm text-foreground/85">{message}</p>
      </div>
      <Button variant="outline" size="sm" onClick={onRetry} className="w-fit gap-2">
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </Button>
    </div>
  );
}

function DoneView({ briefing, onRefresh }) {
  const [tab, setTab] = useState("you");
  return (
    <div className="flex flex-col gap-0 rounded-card border border-border overflow-hidden">
      <div className="flex items-center justify-between border-b border-border bg-muted/30 px-3 py-2">
        <div className="flex items-center gap-1.5">
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
          <span className="text-xs font-medium text-foreground">{briefing.company}</span>
        </div>
        <button
          type="button"
          onClick={onRefresh}
          className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3" />
          Refresh
        </button>
      </div>
      <TabStrip active={tab} onChange={setTab} />
      <div className="p-4">
        {tab === "you" && <ForYouTab notes={briefing.personalized} />}
        {tab === "comp" && <CompTab comp={briefing.compensation} />}
        {tab === "process" && <ProcessTab proc={briefing.interview_process} />}
        {tab === "company" && <CompanyTab intel={briefing.company_intel} />}
      </div>
    </div>
  );
}

// ── Main ───────────────────────────────────────────────────────────────────────

export function InterviewPrepAgent({
  applicationId,
  briefing: appBriefing,
  generatedAt,
  prepStatus = null,
}) {
  const { status, progressSteps, briefing, errorMessage, start, refresh, STATUS } =
    useInterviewPrep(applicationId, appBriefing, prepStatus);
  const showAutoGeneratedNotice = appBriefing && generatedAt;
  const activeBriefing = briefing ?? appBriefing;
  const isBackgroundGenerating = prepStatus === "generating" && status === STATUS.RUNNING;

  return (
    <AiSection title="Interview prep" icon={BookOpen} id="interview-prep">
      {showAutoGeneratedNotice && (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Sparkles className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
          Auto-generated when interview invite detected
        </div>
      )}
      {status === STATUS.IDLE && (
        <IdleView onStart={start} />
      )}
      {status === STATUS.RUNNING && (
        <RunningView steps={progressSteps} shimmerOnly={isBackgroundGenerating} />
      )}
      {status === STATUS.ERROR && <ErrorView message={errorMessage} onRetry={start} />}
      {status === STATUS.DONE && activeBriefing && (
        <DoneView briefing={activeBriefing} onRefresh={refresh} />
      )}
    </AiSection>
  );
}
