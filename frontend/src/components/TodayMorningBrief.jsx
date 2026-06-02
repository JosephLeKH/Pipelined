/** Collapsible morning brief section for the Today page. */

import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";

import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";
import ChevronRight from "lucide-react/dist/esm/icons/chevron-right";
import Sun from "lucide-react/dist/esm/icons/sun";

import BriefInfoPopover from "./BriefInfoPopover";
import MorningBriefHistoryPanel, { HISTORY_DAYS } from "./MorningBriefHistoryPanel";
import MorningBriefSectionCard from "./MorningBriefSectionCard";
import { Button } from "./ui/button";
import { useBriefHistory } from "../hooks/useBriefHistory";
import { BRIEF_SECTION_ORDER, formatBriefHour } from "../lib/briefConstants";
import { getBriefExpandedForDate, setBriefExpandedForDate } from "../lib/todayUtils";

function useBriefExpanded(brief, forceOpen, setSearchParams) {
  const [expanded, setExpanded] = useState(() => {
    if (forceOpen) return true;
    return getBriefExpandedForDate(brief?.date);
  });

  useEffect(() => {
    if (forceOpen && brief?.date) {
      setExpanded(true);
      setBriefExpandedForDate(brief.date, true);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete("brief");
        return next;
      }, { replace: true });
    }
  }, [forceOpen, brief?.date, setSearchParams]);

  useEffect(() => {
    if (!brief?.date || forceOpen) return;
    setExpanded(getBriefExpandedForDate(brief.date));
  }, [brief?.date, forceOpen]);

  const toggleExpanded = () => {
    const next = !expanded;
    setExpanded(next);
    if (brief?.date) setBriefExpandedForDate(brief.date, next);
  };

  return { expanded, toggleExpanded };
}

function BriefSectionHeading({ children }) {
  return (
    <h2 className="text-xs font-medium uppercase tracking-wider text-text-3">
      {children}
    </h2>
  );
}

function BriefEmptyState({ brief, emptyMessage, onGenerateBrief, isGenerating, generateError }) {
  const errorMessage = generateError
    ? generateError?.response?.data?.detail?.message
        ?? generateError?.message
        ?? "Could not generate brief. Try again in a bit."
    : null;
  const headline = brief?.summary_line ?? "Scout's still scanning";
  return (
    <div className="px-1 py-2 text-center">
      <Sun className="mx-auto mb-2 h-6 w-6 text-text-3" aria-hidden="true" />
      <p className="text-sm font-medium text-text-1">{headline}</p>
      <p className="mt-1 text-xs text-text-3">
        {brief ? emptyMessage : "Scout's working on today's briefing. Check back at your usual time, or generate one now."}
      </p>
      {onGenerateBrief && (
        <div>
          <Button
            type="button"
            onClick={onGenerateBrief}
            disabled={isGenerating}
            size="sm"
            className="mt-3"
          >
            {isGenerating ? "Generating..." : "Generate brief"}
          </Button>
        </div>
      )}
      {errorMessage && (
        <p role="alert" className="mt-2 text-xs text-brand-700 dark:text-brand-300">
          {errorMessage}
        </p>
      )}
    </div>
  );
}

function TodayMorningBriefContent({
  brief,
  emptyMessage,
  onGenerateBrief,
  isGenerating,
  generateError,
}) {
  const sections = brief?.sections ?? {};
  const hasItems = BRIEF_SECTION_ORDER.some(({ key }) => sections[key]?.length > 0);

  if (!hasItems) {
    return (
      <BriefEmptyState
        brief={brief}
        emptyMessage={emptyMessage}
        onGenerateBrief={onGenerateBrief}
        isGenerating={isGenerating}
        generateError={generateError}
      />
    );
  }

  return (
    <div className="space-y-4 pt-2">
      {brief.summary_line && (
        <p className="text-sm text-text-2">{brief.summary_line}</p>
      )}
      {BRIEF_SECTION_ORDER.map(({ key, label }) => (
        <MorningBriefSectionCard
          key={key}
          sectionKey={key}
          label={label}
          items={sections[key]}
        />
      ))}
    </div>
  );
}

function BriefCollapsedButton({ ToggleIcon, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-expanded={false}
      className={[
        "flex h-14 w-full items-center gap-3 rounded-lg border border-border-1",
        "bg-surface-1 p-4 text-left hover:bg-surface-2",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600",
        "dark:focus-visible:outline-1",
        "motion-safe:transition-colors motion-safe:duration-hover",
      ].join(" ")}
    >
      <ToggleIcon className="h-4 w-4 shrink-0 text-text-3" aria-hidden="true" />
      <span className="text-sm text-text-2">Tap to read Scout's briefing</span>
    </button>
  );
}

function BriefExpandedView({ ToggleIcon, timeLabel, toggleExpanded, brief, emptyMessage, onGenerateBrief, isGenerating, generateError }) {
  return (
    <div className="rounded-lg border border-border-1 bg-surface-1 p-4">
      <button
        type="button"
        onClick={toggleExpanded}
        aria-expanded
        className={[
          "mb-2 flex w-full items-center gap-2 text-left text-sm text-text-2",
          "hover:text-text-1 focus-visible:outline focus-visible:outline-2",
          "focus-visible:outline-brand-600 dark:focus-visible:outline-1",
        ].join(" ")}
      >
        <ToggleIcon className="h-4 w-4 shrink-0" aria-hidden="true" />
        <span>Morning brief · {timeLabel}</span>
      </button>
      <TodayMorningBriefContent
        brief={brief}
        emptyMessage={emptyMessage}
        onGenerateBrief={onGenerateBrief}
        isGenerating={isGenerating}
        generateError={generateError}
      />
    </div>
  );
}

function BriefHeader({ timeLabel, hasHistory, onHistoryClick }) {
  return (
    <div className="mb-2 flex items-center justify-between gap-3">
      <BriefSectionHeading>
        Morning brief · {timeLabel}
        <BriefInfoPopover />
      </BriefSectionHeading>
      {hasHistory && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onHistoryClick}
          className="h-auto shrink-0 px-2 py-1 text-xs text-brand-600 hover:text-brand-700 hover:underline"
        >
          History
        </Button>
      )}
    </div>
  );
}

function BriefContent({ expanded, ToggleIcon, toggleExpanded, timeLabel, brief, emptyMessage, onGenerateBrief, isGenerating, generateError }) {
  if (!expanded) {
    return <BriefCollapsedButton ToggleIcon={ToggleIcon} onClick={toggleExpanded} />;
  }
  return (
    <BriefExpandedView
      ToggleIcon={ToggleIcon}
      timeLabel={timeLabel}
      toggleExpanded={toggleExpanded}
      brief={brief}
      emptyMessage={emptyMessage}
      onGenerateBrief={onGenerateBrief}
      isGenerating={isGenerating}
      generateError={generateError}
    />
  );
}

function TodayMorningBrief({
  brief,
  briefHour,
  emptyMessage,
  forceOpen,
  onGenerateBrief,
  isGenerating,
  generateError,
}) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [historyOpen, setHistoryOpen] = useState(false);
  const { data: historyData } = useBriefHistory(HISTORY_DAYS);
  const { expanded, toggleExpanded } = useBriefExpanded(brief, forceOpen, setSearchParams);

  const pastBriefs = (historyData?.data ?? []).slice(1);
  const hasHistory = pastBriefs.length > 0;
  const ToggleIcon = expanded ? ChevronDown : ChevronRight;
  const timeLabel = formatBriefHour(briefHour);

  return (
    <section aria-label="Morning brief">
      <BriefHeader
        timeLabel={timeLabel}
        hasHistory={hasHistory}
        onHistoryClick={() => setHistoryOpen(true)}
      />
      <BriefContent
        expanded={expanded}
        ToggleIcon={ToggleIcon}
        toggleExpanded={toggleExpanded}
        timeLabel={timeLabel}
        brief={brief}
        emptyMessage={emptyMessage}
        onGenerateBrief={onGenerateBrief}
        isGenerating={isGenerating}
        generateError={generateError}
      />
      <MorningBriefHistoryPanel open={historyOpen} onClose={() => setHistoryOpen(false)} />
    </section>
  );
}

export default TodayMorningBrief;
