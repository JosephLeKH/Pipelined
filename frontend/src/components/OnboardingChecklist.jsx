/** Dismissable onboarding checklist — three agent setup steps for new users. */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Circle from "lucide-react/dist/esm/icons/circle";
import X from "lucide-react/dist/esm/icons/x";

import { useAuth } from "../context/AuthContext";
import { trackEvent } from "../lib/analytics";
import {
  COPILOT_TRIED_KEY,
  ONBOARDING_CONFETTI_DISMISS_MS,
  ONBOARDING_DISMISSED_KEY,
  OPEN_COPILOT_EVENT,
  TODAY_VISITED_KEY,
} from "../lib/constants";
import { Button } from "./ui/button";

const ONBOARDING_STEPS = 3;

const BANNER_FOCUS_RING =
  "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1";

function hasAgentProfile(user) {
  const profile = user?.agent_profile ?? {};
  return Boolean(
    profile.career_goals?.trim() ||
    (Array.isArray(profile.target_roles) && profile.target_roles.length > 0)
  );
}

function StepRow({ label, description, done }) {
  return (
    <div className="flex items-start gap-3">
      {done ? (
        <>
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" aria-hidden="true" />
          <span className="sr-only">Completed</span>
        </>
      ) : (
        <>
          <Circle className="mt-0.5 h-5 w-5 shrink-0 text-text-4" aria-hidden="true" />
          <span className="sr-only">Incomplete</span>
        </>
      )}
      <div className="min-w-0">
        <p className={`text-sm font-medium ${done ? "text-text-3" : "text-text-1"}`}>{label}</p>
        {!done && description && <p className="text-xs text-text-2">{description}</p>}
      </div>
    </div>
  );
}

function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true"
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const [copilotTried, setCopilotTried] = useState(
    () => localStorage.getItem(COPILOT_TRIED_KEY) === "true"
  );
  const [todayVisited, setTodayVisited] = useState(
    () => localStorage.getItem(TODAY_VISITED_KEY) === "true"
  );
  const navigate = useNavigate();
  const { user } = useAuth();

  const profileDone = hasAgentProfile(user);
  const allDone = profileDone && copilotTried && todayVisited;

  useEffect(() => {
    if (!allDone || dismissed) return;
    setShowSuccess(true);
    const t = setTimeout(() => {
      localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
      setDismissed(true);
    }, ONBOARDING_CONFETTI_DISMISS_MS);
    return () => clearTimeout(t);
  }, [allDone, dismissed]);

  const completedSteps = [
    profileDone && "set_agent_profile",
    copilotTried && "try_copilot",
    todayVisited && "open_today",
  ].filter(Boolean);

  useEffect(() => {
    completedSteps.forEach((step) => trackEvent("onboarding_step_completed", { step }));
  }, [profileDone, copilotTried, todayVisited]);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    setDismissed(true);
    trackEvent("onboarding_dismissed", { completed_steps: completedSteps.length });
  };

  const handleTryCopilot = () => {
    localStorage.setItem(COPILOT_TRIED_KEY, "true");
    setCopilotTried(true);
    window.dispatchEvent(new CustomEvent(OPEN_COPILOT_EVENT));
  };

  const handleOpenToday = () => {
    localStorage.setItem(TODAY_VISITED_KEY, "true");
    setTodayVisited(true);
    navigate("/today");
  };

  if (dismissed) return null;

  if (showSuccess) {
    return (
      <div className="mb-4 rounded-lg border border-border-1 bg-surface-1 p-4 text-center">
        <p className="font-semibold text-brand-700 dark:text-brand-200">You are all set!</p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-border-1 bg-surface-1 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="font-semibold text-text-1">Get started with your agent</h2>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          className={`inline-flex h-4 w-4 shrink-0 items-center justify-center rounded text-text-3 hover:bg-surface-2 hover:text-text-1 motion-reduce:transition-none transition-colors duration-hover ease-out ${BANNER_FOCUS_RING}`}
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
      <div className="mb-3">
        <div className="mb-1 flex items-center text-xs text-text-2">
          <span>
            {completedSteps.length} of {ONBOARDING_STEPS} steps complete
          </span>
        </div>
        <div className="h-1 overflow-hidden rounded-sm bg-surface-2">
          <div
            className="h-full rounded-sm bg-brand-600 motion-reduce:transition-none transition-all duration-hover ease-out"
            style={{ width: `${(completedSteps.length / ONBOARDING_STEPS) * 100}%` }}
          />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <div>
          <StepRow
            label="Set agent profile"
            description="Tell the co-pilot your target roles and goals."
            done={profileDone}
          />
          {!profileDone && (
            <Button
              type="button"
              variant="link"
              onClick={() => navigate("/settings?section=agent")}
              className="ml-8 h-auto p-0 text-xs text-brand-700 hover:text-brand-800 dark:text-brand-300"
            >
              Go to Agent settings
            </Button>
          )}
        </div>
        <div>
          <StepRow
            label="Try co-pilot"
            description="Ask a question grounded in your pipeline."
            done={copilotTried}
          />
          {!copilotTried && (
            <Button
              type="button"
              variant="link"
              onClick={handleTryCopilot}
              className="ml-8 h-auto p-0 text-xs text-brand-700 hover:text-brand-800 dark:text-brand-300"
            >
              Open co-pilot
            </Button>
          )}
        </div>
        <div>
          <StepRow
            label="Open Today"
            description="See your ranked missions for the day."
            done={todayVisited}
          />
          {!todayVisited && (
            <Button
              type="button"
              variant="link"
              onClick={handleOpenToday}
              className="ml-8 h-auto p-0 text-xs text-brand-700 hover:text-brand-800 dark:text-brand-300"
            >
              Go to Today
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingChecklist;
