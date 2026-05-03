/** Dismissable onboarding checklist for new users — guides first-time setup. */

import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import CheckCircle2 from "lucide-react/dist/esm/icons/check-circle-2";
import Circle from "lucide-react/dist/esm/icons/circle";

import { useAuth } from "../context/AuthContext";
import { useApplications } from "../hooks/useApplications";
import { trackEvent } from "../lib/analytics";
import { Button } from "./ui/button";
import {
  ONBOARDING_CONFETTI_DISMISS_MS,
  ONBOARDING_DISMISSED_KEY,
  STAGES,
} from "../lib/constants";

const EXTENSION_STEP_HREF = "#install-extension";

function StepRow({ id, label, description, done }) {
  return (
    <div key={id} className="flex items-start gap-3">
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

function OnboardingChecklist({ onAdd }) {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true"
  );
  const [showSuccess, setShowSuccess] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: env } = useApplications({ limit: 100 });
  const apps = env?.data ?? [];
  const total = env?.meta?.total ?? apps.length;

  const hasExtensionApp = apps.some((a) => a.source === "extension");
  const hasAddedApp = total > 0;
  const hasCustomStages = Boolean(
    user?.default_stages &&
    JSON.stringify(user.default_stages) !== JSON.stringify(STAGES)
  );
  const allDone = hasExtensionApp && hasAddedApp && hasCustomStages;

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
    hasExtensionApp && "install_extension",
    hasAddedApp && "add_application",
    hasCustomStages && "customize_stages",
  ].filter(Boolean);

  useEffect(() => {
    const steps = [
      hasExtensionApp && "install_extension",
      hasAddedApp && "add_application",
      hasCustomStages && "customize_stages",
    ].filter(Boolean);
    steps.forEach((step) => trackEvent("onboarding_step_completed", { step }));
  }, [hasExtensionApp, hasAddedApp, hasCustomStages]);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    setDismissed(true);
    trackEvent("onboarding_dismissed", { completed_steps: completedSteps.length });
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
        <h2 className="font-display font-semibold text-foreground">Get started with Pipelined</h2>
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
      <div className="flex flex-col gap-3">
        <div>
          <StepRow
            id="extension"
            label="Install the Chrome extension"
            description="Save jobs in one click from any job board."
            done={hasExtensionApp}
          />
          {!hasExtensionApp && (
            <a
              href={EXTENSION_STEP_HREF}
              className="ml-8 text-xs text-primary underline hover:text-primary/80 transition-colors"
            >
              Get the extension
            </a>
          )}
        </div>
        <div>
          <StepRow
            id="add-app"
            label="Add your first application"
            description="Start tracking where you've applied."
            done={hasAddedApp}
          />
          {!hasAddedApp && (
            <Button
              type="button"
              variant="link"
              onClick={onAdd}
              className="ml-8 h-auto p-0 text-xs"
            >
              Add Application
            </Button>
          )}
        </div>
        <div>
          <StepRow
            id="stages"
            label="Customize your pipeline stages"
            description="Tailor the pipeline to match your job search process."
            done={hasCustomStages}
          />
          {!hasCustomStages && (
            <Button
              type="button"
              variant="link"
              onClick={() => navigate("/settings")}
              className="ml-8 h-auto p-0 text-xs"
            >
              Go to Settings
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export default OnboardingChecklist;
