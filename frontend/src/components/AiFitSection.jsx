/** Unified AI fit section — one badge, background scoring skeleton, single analyze CTA. */

import { useEffect, useState } from "react";

import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import { toast } from "sonner";

import { useQuery, useQueryClient } from "@tanstack/react-query";

import { generateFitScore, fetchApplication } from "../api/applications";
import { KEYS } from "../hooks/useApplications";
import { QUERY_STALE_TIME_MS } from "../lib/constants";
import {
  AI_LIMIT_MESSAGE,
  FIT_SCORE_LABEL,
  getAiToastError,
} from "../lib/aiConstants";
import {
  BACKGROUND_SCORE_POLL_MS,
  getUnifiedFitDetail,
  isBackgroundScoringPending,
  formatAiFreshness,
} from "../lib/fitDisplay";
import { trackEvent } from "../lib/analytics";
import AiSection from "./AiSection";
import FitBadge from "./FitBadge";
import { Button } from "./ui/button";

const SHIMMER = "shimmer-bg animate-shimmer";

function FitScoreSkeleton() {
  return (
    <div className="flex flex-col gap-2" aria-busy="true" aria-label="Calculating fit score">
      <div className={`h-6 w-16 rounded-full ${SHIMMER}`} />
      <div className={`h-3 w-full max-w-sm rounded ${SHIMMER}`} />
      <div className={`h-3 w-4/5 max-w-xs rounded ${SHIMMER}`} />
    </div>
  );
}

function FitScoreDetails({ detail, application }) {
  const [showWhy, setShowWhy] = useState(false);
  const freshness = application
    ? formatAiFreshness(application.ai_analysis?.scored_at ?? application.fit_score_computed_at)
    : null;

  return (
    <div className="flex flex-col gap-3">
      {freshness && (
        <p className="text-xs text-muted-foreground">Generated {freshness}</p>
      )}
      <p className="text-xs text-muted-foreground">Based on your resume + this job description</p>
      <div className="flex flex-wrap items-center gap-2">
        <FitBadge score={detail.score} />
        {detail.reason && (
          <button
            type="button"
            onClick={() => setShowWhy((prev) => !prev)}
            aria-expanded={showWhy}
            className="text-xs font-medium text-brand-600 hover:underline dark:text-brand-400"
          >
            Why?
          </button>
        )}
      </div>
      {showWhy && detail.reason && (
        <p className="text-sm text-muted-foreground">{detail.reason}</p>
      )}
      {detail.matchedSkills.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Matched skills</span>
          <div className="flex flex-wrap gap-1">
            {detail.matchedSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary dark:bg-primary/20"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
      {detail.missingSkills.length > 0 && (
        <div className="flex flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground">Missing skills</span>
          <div className="flex flex-wrap gap-1">
            {detail.missingSkills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive"
              >
                {skill}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AiFitSection({ application, hasResume, aiScoresRemainingToday, onScoreGenerated }) {
  const [localOverride, setLocalOverride] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const isPending = isBackgroundScoringPending(application, hasResume);
  const { data: polledApp } = useQuery({
    queryKey: KEYS.detail(application.id),
    queryFn: () => fetchApplication(application.id),
    enabled: Boolean(application.id) && isPending,
    refetchInterval: isPending ? BACKGROUND_SCORE_POLL_MS : false,
    staleTime: QUERY_STALE_TIME_MS,
  });
  const liveApplication = polledApp ?? application;

  useEffect(() => {
    if (!polledApp) return;
    const polledDetail = getUnifiedFitDetail(polledApp);
    if (!polledDetail) return;
    onScoreGenerated({
      fit_score: polledApp.fit_score,
      fit_score_reason: polledApp.fit_score_reason,
      ai_analysis: polledApp.ai_analysis,
    });
  }, [polledApp, onScoreGenerated]);

  const detail = localOverride ?? getUnifiedFitDetail(liveApplication);
  const backgroundError = liveApplication.fit_score_status === "error";
  const quotaExceeded = hasResume && aiScoresRemainingToday === 0 && !detail;
  const showSkeleton = hasResume && !detail && isPending && !quotaExceeded && !backgroundError;

  useEffect(() => {
    if (detail?.score != null) {
      trackEvent("fit_score_viewed", { score: detail.score });
    }
  }, [detail?.score]);

  async function handleAnalyzeFit() {
    setIsLoading(true);
    try {
      const result = await generateFitScore(application.id);
      const next = {
        score: result.score,
        reason: result.reason,
        matchedSkills: [],
        missingSkills: [],
        source: "fit_score",
      };
      setLocalOverride(next);
      onScoreGenerated({ fit_score: result.score, fit_score_reason: result.reason });
      queryClient.invalidateQueries({ queryKey: KEYS.detail(application.id) });
    } catch (error) {
      toast.error(getAiToastError(error, "Could not analyze fit. Try again."));
    } finally {
      setIsLoading(false);
    }
  }

  async function handleRetryFitScore() {
    await handleAnalyzeFit();
  }

  const elapsedSeconds = application.fit_score_requested_at
    ? Math.floor((Date.now() - new Date(application.fit_score_requested_at).getTime()) / 1000)
    : 0;
  const takingTooLong = !detail && isPending && elapsedSeconds > 60;

  if (!hasResume && !detail && !quotaExceeded && !backgroundError) {
    return null;
  }

  return (
    <AiSection title={FIT_SCORE_LABEL} icon={Sparkles} id="ai-fit">
      <p className="text-xs text-muted-foreground">Based on your resume + this job description</p>
      {quotaExceeded && (
        <p className="text-sm text-amber-600 dark:text-amber-400">{AI_LIMIT_MESSAGE}</p>
      )}
      {backgroundError && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-destructive">Fit score calculation failed. Please retry.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRetryFitScore}
            disabled={isLoading}
            className="w-full min-h-[2.75rem] sm:min-h-0 sm:w-auto"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            {isLoading ? "Retrying…" : "Retry fit score"}
          </Button>
        </div>
      )}
      {showSkeleton && <FitScoreSkeleton />}
      {takingTooLong && (
        <div className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">Taking longer than expected — would you like to retry?</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleRetryFitScore}
            disabled={isLoading}
            className="w-full min-h-[2.75rem] sm:min-h-0 sm:w-auto"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
            {isLoading ? "Retrying…" : "Retry fit score"}
          </Button>
        </div>
      )}
      {!showSkeleton && !takingTooLong && detail && <FitScoreDetails detail={detail} application={liveApplication} />}
      {!showSkeleton && !takingTooLong && !detail && hasResume && !quotaExceeded && !backgroundError && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAnalyzeFit}
          disabled={isLoading}
          className="w-full min-h-[2.75rem] sm:min-h-0 sm:w-auto"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          {isLoading ? "Analyzing…" : "Analyze fit"}
        </Button>
      )}
    </AiSection>
  );
}

export default AiFitSection;
