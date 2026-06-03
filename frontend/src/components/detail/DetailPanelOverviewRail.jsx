/** Sticky overview rail: stage selector + fit score chip + compact Scout strip. */

import { useCallback } from "react";

import { useAuth } from "../../context/AuthContext";
import { OPEN_COPILOT_EVENT } from "../../lib/constants";
import { StageSelector } from "../DetailPanelSections";
import ScoutTake from "../scout/ScoutTake";

function fitTone(score) {
  if (score == null) return "text-text-3";
  if (score >= 85) return "text-brand-700 dark:text-brand-300";
  if (score >= 65) return "text-text-1";
  return "text-text-2";
}

function FitChip({ application }) {
  const score = application.fit_score;
  const noResume = application.fit_score_status === "no_resume";
  const scoring = score == null && !noResume;
  return (
    <div className="flex flex-col items-end gap-0.5 text-right" aria-label="Fit score">
      <span className="text-[0.625rem] font-medium uppercase tracking-wider text-text-3">Fit</span>
      {score != null && (
        <span className="flex items-baseline gap-1">
          <span className={`text-xl font-semibold tabular-nums leading-none ${fitTone(score)}`}>{score}</span>
          <span className="text-[0.625rem] text-text-3">/100</span>
        </span>
      )}
      {scoring && (
        <span className="text-[0.625rem] text-text-3" aria-live="polite">Scoring…</span>
      )}
      {noResume && (
        <a href="/settings" className="text-[0.625rem] font-medium text-brand-600 hover:underline">
          Add resume →
        </a>
      )}
    </div>
  );
}

function DetailPanelOverviewRail({ application, onStageChange }) {
  const { user } = useAuth();
  const stageOptions = user?.default_stages ?? [];

  const handleAskScout = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_COPILOT_EVENT));
  }, []);

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border-1 bg-surface-0 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[0.625rem] font-medium uppercase tracking-wider text-text-3">Stage</span>
          <StageSelector
            stageOptions={stageOptions}
            currentStage={application.current_stage}
            onStageChange={onStageChange}
          />
        </div>
        <FitChip application={application} />
      </div>
      <ScoutTake application={application} onAskScout={handleAskScout} variant="strip" />
    </div>
  );
}

export default DetailPanelOverviewRail;
