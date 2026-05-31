/** Dismissable onboarding checklist — five setup steps for new users on Today. */

import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import Check from "lucide-react/dist/esm/icons/check";
import Circle from "lucide-react/dist/esm/icons/circle";
import X from "lucide-react/dist/esm/icons/x";

import InboxSetupDialog from "./InboxSetupDialog";
import { useResendVerification } from "../hooks/useAuth";
import { useAuth } from "../context/AuthContext";
import { useApplicationStats } from "../hooks/useApplications";
import { useGmailStatus } from "../hooks/useGmailStatus";
import { trackEvent } from "../lib/analytics";
import {
  CHROME_EXTENSION_URL,
  EXTENSION_STEP_CLICKED_KEY,
  ONBOARDING_DISMISSED_KEY,
} from "../lib/constants";

const ONBOARDING_STEPS = 4;

function OnboardingStepRow({ label, done, actionLabel, onClick, to, href, external, disabled }) {
  const rowClass = [
    "flex w-full items-center justify-between gap-3 rounded-md py-1 px-1 -mx-1 text-left",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600",
    "dark:focus-visible:outline-1",
    done ? "cursor-default" : "hover:bg-surface-2",
    disabled ? "cursor-default opacity-70" : "",
  ].join(" ");

  const content = (
    <>
      <div className="flex min-w-0 items-center gap-2.5">
        {done ? (
          <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
        ) : (
          <Circle className="h-3.5 w-3.5 shrink-0 text-text-3" strokeWidth={1.5} aria-hidden="true" />
        )}
        <span className={`text-sm ${done ? "text-text-3" : "text-text-1"}`}>{label}</span>
      </div>
      {!done && actionLabel && (
        <span className="shrink-0 text-sm text-brand-600">{actionLabel}</span>
      )}
    </>
  );

  if (to) {
    return (
      <Link
        to={done ? "#" : to}
        className={rowClass}
        onClick={(e) => {
          if (done) e.preventDefault();
          else onClick?.(e);
        }}
        aria-disabled={done || undefined}
        tabIndex={done ? -1 : undefined}
      >
        {content}
      </Link>
    );
  }

  if (href) {
    return (
      <a
        href={done ? undefined : href}
        target={external && !done ? "_blank" : undefined}
        rel={external && !done ? "noopener noreferrer" : undefined}
        className={rowClass}
        onClick={(e) => {
          if (done) e.preventDefault();
          else onClick?.(e);
        }}
        aria-disabled={done || undefined}
        tabIndex={done ? -1 : undefined}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={done || disabled}
      className={rowClass}
    >
      {content}
    </button>
  );
}

function OnboardingChecklist() {
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem(ONBOARDING_DISMISSED_KEY) === "true",
  );
  const [extensionClicked, setExtensionClicked] = useState(
    () => localStorage.getItem(EXTENSION_STEP_CLICKED_KEY) === "true",
  );
  const [gmailDialogOpen, setGmailDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: stats } = useApplicationStats();
  const { data: gmailStatus } = useGmailStatus();
  const { mutateAsync: resendVerification, isPending: isResending } = useResendVerification();

  const emailDone = user?.email_verified !== false;
  const applicationDone = (stats?.total_applied ?? 0) > 0;
  const gmailDone = Boolean(gmailStatus?.connected);
  const goalDone = typeof user?.weekly_goal === 'number';
  const extensionDone = extensionClicked;

  const steps = useMemo(
    () => [
      { id: "save_application", label: "Save your first application", done: applicationDone },
      { id: "set_weekly_goal", label: "Set a weekly goal", done: goalDone },
      { id: "install_extension", label: "Open extension page", done: extensionDone },
      { id: "verify_email", label: "Verify your email", done: emailDone },
    ],
    [emailDone, applicationDone, gmailDone, goalDone, extensionDone],
  );

  const completedCount = steps.filter((step) => step.done).length;
  const allDone = completedCount === ONBOARDING_STEPS;
  const hasIncomplete = completedCount < ONBOARDING_STEPS;

  useEffect(() => {
    steps
      .filter((step) => step.done)
      .forEach((step) => trackEvent("onboarding_step_completed", { step: step.id }));
  }, [steps]);

  useEffect(() => {
    if (!allDone || dismissed) return;
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    setDismissed(true);
  }, [allDone, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem(ONBOARDING_DISMISSED_KEY, "true");
    setDismissed(true);
    trackEvent("onboarding_dismissed", { completed_steps: completedCount });
  };

  const handleResendEmail = async () => {
    try {
      await resendVerification();
    } catch {
      toast.error("Couldn't send verification email. Try again in a minute.");
    }
  };

  const handleInstallExtension = () => {
    localStorage.setItem(EXTENSION_STEP_CLICKED_KEY, "true");
    setExtensionClicked(true);
  };

  if (dismissed || !hasIncomplete) return null;

  return (
    <>
      <section
        aria-label="Get started"
        className="rounded-lg border border-border-1 bg-surface-0 p-3"
      >
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
            <h2 className="text-xs font-medium uppercase tracking-wider text-text-3">Get started</h2>
            <span className="text-xs text-text-3">
              {completedCount} of {ONBOARDING_STEPS} complete
            </span>
          </div>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss checklist"
            className={[
              "rounded-md p-1 text-text-3 hover:text-text-1 hover:bg-surface-2",
              "focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600",
              "dark:focus-visible:outline-1",
            ].join(" ")}
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <div className="space-y-1">
          <OnboardingStepRow
            label="Save your first application"
            done={applicationDone}
            actionLabel="→ Add application"
            onClick={() => navigate("/dashboard")}
          />
          <OnboardingStepRow
            label="Set a weekly goal"
            done={goalDone}
            actionLabel="→ Set goal"
            to="/settings?section=pipeline"
          />
          <OnboardingStepRow
            label="Open extension page"
            done={extensionDone}
            actionLabel="→ Open"
            href={CHROME_EXTENSION_URL}
            external
            onClick={handleInstallExtension}
          />
          <OnboardingStepRow
            label="Verify your email"
            done={emailDone}
            actionLabel={isResending ? "Sending…" : "→ Resend email"}
            onClick={handleResendEmail}
            disabled={isResending}
          />
        </div>
      </section>

      <InboxSetupDialog open={gmailDialogOpen} onOpenChange={setGmailDialogOpen} />
    </>
  );
}

export default OnboardingChecklist;
