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

function FitScoreDetails({ detail }) {
  const [showWhy, setShowWhy] = useState(false);

  return (
    <div className="flex flex-col gap-3">
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
  const quotaExceeded = hasResume && aiScoresRemainingToday === 0 && !detail;
  const showSkeleton = hasResume && !detail && isPending && !quotaExceeded;

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

  if (!hasResume && !detail && !quotaExceeded) {
    return null;
  }

  return (
    <AiSection title={FIT_SCORE_LABEL} icon={Sparkles} id="ai-fit">
      {quotaExceeded && (
        <p className="text-sm text-amber-600 dark:text-amber-400">{AI_LIMIT_MESSAGE}</p>
      )}
      {showSkeleton && <FitScoreSkeleton />}
      {!showSkeleton && detail && <FitScoreDetails detail={detail} />}
      {!showSkeleton && !detail && hasResume && !quotaExceeded && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAnalyzeFit}
          disabled={isLoading}
          className="w-full min-h-[44px] sm:min-h-0 sm:w-auto"
        >
          <Sparkles className="h-3.5 w-3.5 mr-1.5" aria-hidden="true" />
          {isLoading ? "Analyzing…" : "Analyze fit"}
        </Button>
      )}
    </AiSection>
  );
}

export default AiFitSection;
