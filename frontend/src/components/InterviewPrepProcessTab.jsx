/** Interview prep process tab — interview rounds, recent questions, tips, sources. */

import Sparkles from "lucide-react/dist/esm/icons/sparkles";

function SubLabel({ children }) {
  return <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">{children}</span>;
}

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

export function InterviewPrepProcessTab({ proc }) {
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
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[0.625rem] font-bold text-muted-foreground">
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
