/** Active mission rows plus collapsible completed group at the bottom. */

import { useCallback, useEffect, useMemo, useState } from "react";

import Check from "lucide-react/dist/esm/icons/check";
import ChevronDown from "lucide-react/dist/esm/icons/chevron-down";

import MissionCard from "./MissionCard";
import { MISSION_COMPLETE_ANIM_MS } from "../lib/constants";
import { getStoredCompletedMissions, storeCompletedMission } from "../lib/todayUtils";

function TodayEmptyState() {
  return (
    <div
      className="flex flex-col items-center py-16 text-center motion-safe:animate-fade-in-up"
      role="status"
    >
      <div
        className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30"
        aria-hidden="true"
      >
        <Check className="h-6 w-6 text-brand-600" />
      </div>
      <p className="text-base font-semibold text-text-1">You&apos;re caught up.</p>
      <p className="mt-1 max-w-sm text-sm text-text-3">
        Scout didn't rank any missions for you today.
      </p>
    </div>
  );
}

function CompletedMissionsGroup({ missions, totalCount, expanded, onToggle }) {
  if (totalCount === 0) return null;

  return (
    <div className="border-t border-border-1">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className={[
          "flex w-full items-center justify-between px-3 py-3 text-left text-sm text-text-2",
          "hover:bg-surface-1 focus-visible:outline focus-visible:outline-2",
          "focus-visible:outline-brand-600 focus-visible:outline-offset-[-2px]",
          "dark:focus-visible:outline-1",
          "motion-safe:transition-colors motion-safe:duration-hover",
        ].join(" ")}
      >
        <span>Completed ({totalCount})</span>
        <ChevronDown
          className={[
            "h-4 w-4 text-text-3 motion-safe:transition-transform motion-safe:duration-hover",
            expanded ? "rotate-180" : "",
          ].join(" ")}
          aria-hidden="true"
        />
      </button>
      {expanded && missions.length > 0 && (
        <ul>
          {missions.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              completed
              onSnooze={() => {}}
              onDone={() => {}}
              isSnoozing={false}
              isCompleting={false}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function TodayMissionsList({
  missions,
  briefDate,
  clearedCount,
  onSnooze,
  onDone,
  snoozePendingId,
  donePendingId,
}) {
  const [completedMissions, setCompletedMissions] = useState([]);
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [completingId, setCompletingId] = useState(null);

  useEffect(() => {
    setCompletedMissions(getStoredCompletedMissions(briefDate));
    setCompletedExpanded(false);
    setCompletingId(null);
  }, [briefDate]);

  const completedIds = useMemo(
    () => new Set(completedMissions.map((mission) => mission.id)),
    [completedMissions],
  );

  const activeMissions = useMemo(
    () => missions.filter((mission) => !completedIds.has(mission.id)),
    [missions, completedIds],
  );

  const completedTotal = Math.max(completedMissions.length, clearedCount ?? 0);

  const handleComplete = useCallback(
    (missionId) => {
      const mission = missions.find((item) => item.id === missionId);
      if (!mission || completingId) return;

      setCompletingId(missionId);
      window.setTimeout(() => {
        const stored = storeCompletedMission(briefDate, mission);
        setCompletedMissions(stored);
        setCompletingId(null);
        onDone(missionId);
      }, MISSION_COMPLETE_ANIM_MS);
    },
    [briefDate, completingId, missions, onDone],
  );

  if (!missions.length && completedTotal === 0) {
    return <TodayEmptyState />;
  }

  if (!activeMissions.length && completedTotal === 0) {
    return <TodayEmptyState />;
  }

  return (
    <section aria-label="Today's missions">
      <h2 className="mb-2 text-xs font-medium uppercase tracking-wider text-text-3">
        Scout ranked these for you
      </h2>
      <div className="overflow-hidden rounded-lg border border-border-1 bg-surface-0">
        {activeMissions.length > 0 && (
          <ul>
            {activeMissions.map((mission) => (
              <MissionCard
                key={mission.id}
                mission={mission}
                onSnooze={onSnooze}
                onDone={handleComplete}
                isSnoozing={snoozePendingId === mission.id}
                isCompleting={donePendingId === mission.id || completingId === mission.id}
              />
            ))}
          </ul>
        )}
        <CompletedMissionsGroup
          missions={completedMissions}
          totalCount={completedTotal}
          expanded={completedExpanded}
          onToggle={() => setCompletedExpanded((open) => !open)}
        />
      </div>
    </section>
  );
}

export default TodayMissionsList;
