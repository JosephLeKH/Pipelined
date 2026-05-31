/** Interview prep company tab — tech stack, flags, news, culture. */

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

export function InterviewPrepCompanyTab({ intel }) {
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
