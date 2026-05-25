/** Dismissable onboarding checklist — three agent setup steps for new users. */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Circle from "lucide-react/dist/esm/icons/circle";

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
      {done
        ? <><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" /><span className="sr-only">Completed</span></>
        : <><Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground/30" aria-hidden="true" /><span className="sr-only">Incomplete</span></>
      }
      <div className="min-w-0">
        <p className={`text-sm font-medium ${done ? "text-muted-foreground" : "text-foreground"}`}>
          {label}
        </p>
        {!done && description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
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
      <div className="mb-4 rounded-lg border border-border border-l-4 border-l-primary bg-card p-4 text-center">
        <p className="font-semibold text-primary">You are all set!</p>
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-border border-l-4 border-l-primary bg-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className=" font-semibold text-foreground">Get started with your agent</h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleDismiss}
          className="text-muted-foreground hover:text-foreground"
        >
          Dismiss
        </Button>
      </div>
      <div className="mb-3">
        <div className="mb-1 flex items-center text-xs text-muted-foreground">
          <span>{completedSteps.length} of {ONBOARDING_STEPS} steps complete</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all"
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
              className="ml-8 h-auto p-0 text-xs"
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
              className="ml-8 h-auto p-0 text-xs"
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
              className="ml-8 h-auto p-0 text-xs"
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
