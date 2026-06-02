/** Tab strip with live running-agent badge on the Agents tab. */

export const TABS = [
  { id: "overview", label: "Overview" },
  { id: "agents", label: "Agents" },
  { id: "activity", label: "Activity" },
  { id: "notes", label: "Notes" },
];

function TabButton({ tab, active, runningCount, onSelect }) {
  const isAgents = tab.id === "agents";
  const showBadge = isAgents && runningCount > 0;
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      aria-controls={`detail-tabpanel-${tab.id}`}
      id={`detail-tab-${tab.id}`}
      onClick={() => onSelect(tab.id)}
      className={`relative -mb-px flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium transition-colors duration-120 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 ${
        active
          ? "border-b-2 border-brand-600 text-text-1"
          : "border-b-2 border-transparent text-text-3 hover:text-text-1"
      }`}
    >
      {tab.label}
      {showBadge && (
        <span
          className="inline-flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-brand-600 px-1 text-[0.625rem] font-semibold text-white"
          aria-label={`${runningCount} running`}
        >
          {runningCount}
        </span>
      )}
      {isAgents && runningCount > 0 && (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full bg-brand-600 motion-safe:animate-pulse"
        />
      )}
    </button>
  );
}

function DetailPanelTabs({ activeTab, onSelect, runningCount = 0 }) {
  return (
    <div
      role="tablist"
      aria-label="Application detail tabs"
      className="flex items-center gap-1 border-b border-border-1 bg-surface-0 px-4"
    >
      {TABS.map((tab) => (
        <TabButton
          key={tab.id}
          tab={tab}
          active={activeTab === tab.id}
          runningCount={runningCount}
          onSelect={onSelect}
        />
      ))}
    </div>
  );
}

export default DetailPanelTabs;
