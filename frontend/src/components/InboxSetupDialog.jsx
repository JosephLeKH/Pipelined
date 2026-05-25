/** Two-step dialog for connecting a dedicated job-search Gmail inbox. */

import { useState } from "react";

import { fetchGmailAuthUrl } from "../api/email";
import ArrowRight from "lucide-react/dist/esm/icons/arrow-right";
import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import ExternalLink from "lucide-react/dist/esm/icons/external-link";
import Mail from "lucide-react/dist/esm/icons/mail";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";

const TOTAL_STEPS = 2;

const NEVER_DO_ITEMS = [
  "Read personal or non-job emails",
  "Store email content — only structured job data",
  "Send emails without your explicit approval",
];

const WHY_ITEMS = [
  "Only job emails are ever processed",
  "Your personal inbox stays completely private",
  "Easier to see everything job-related in one place",
];

function StepIndicator({ step }) {
  return (
    <p className="absolute right-12 top-4 text-xs text-text-3" aria-live="polite">
      {step} of {TOTAL_STEPS}
    </p>
  );
}

function StepOne({ onNext, onCancel }) {
  return (
    <div className="flex flex-col gap-5">
      <StepIndicator step={1} />
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 dark:bg-brand-900/30">
        <Mail className="h-5 w-5 text-brand-700 dark:text-brand-400" aria-hidden="true" />
      </div>
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-text-1">
          Use a job-search inbox
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-text-2">
          Pipelined works best with a dedicated Gmail account for your job search — not your personal inbox.
        </DialogDescription>
      </DialogHeader>
      <div className="rounded-lg border border-border-1 bg-surface-1 px-4 py-3">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-text-3">
          Why a separate inbox?
        </p>
        <ul className="flex flex-col gap-1.5">
          {WHY_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-text-1">
              <CheckCircle
                className="mt-0.5 h-4 w-4 shrink-0 text-brand-600 dark:text-brand-400"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-text-2">
        Don&apos;t have one yet?{" "}
        <a
          href="https://accounts.google.com/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-brand-600 underline-offset-2 hover:underline dark:text-brand-400"
        >
          Create a Gmail account
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </p>
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-text-2 transition-colors duration-hover ease-out hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
        >
          Cancel
        </button>
        <Button type="button" size="sm" onClick={onNext} className="gap-1.5">
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function StepTwo({ onBack, onCancel, onConnect }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      setError("Enter the Gmail address you want to connect.");
      return;
    }
    if (!/^[^\s@]+@gmail\.com$/.test(trimmed)) {
      setError("Must be a @gmail.com address.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      const result = await fetchGmailAuthUrl(trimmed);
      const authUrl = result?.auth_url ?? result;
      window.location.href = authUrl;
    } catch {
      setError("Could not start Gmail connection. Try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <StepIndicator step={2} />
      <DialogHeader>
        <DialogTitle className="text-base font-semibold text-text-1">
          Connect your job-search inbox
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-text-2">
          Enter the Gmail address you&apos;ll use exclusively for job applications.
        </DialogDescription>
      </DialogHeader>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="inbox-email">Job-search Gmail address</Label>
        <Input
          id="inbox-email"
          type="email"
          placeholder="jobs@gmail.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleConnect();
          }}
          autoFocus
          autoComplete="email"
        />
        {error && <p className="text-xs text-brand-700 dark:text-brand-400">{error}</p>}
      </div>
      <div className="rounded-lg border border-border-1 bg-surface-1 px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-3">
          What we never do
        </p>
        <ul className="flex flex-col gap-1.5">
          {NEVER_DO_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-text-2">
              <span
                className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-text-3"
                aria-hidden="true"
              />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-text-2 transition-colors duration-hover ease-out hover:text-text-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:focus-visible:outline-1"
          >
            Cancel
          </button>
          <Button type="button" variant="ghost" size="sm" onClick={onBack}>
            Back
          </Button>
        </div>
        <Button type="button" size="sm" onClick={handleConnect} disabled={loading} className="gap-1.5">
          {loading ? "Redirecting…" : "Connect this inbox"}
          {!loading && <ArrowRight className="h-4 w-4" aria-hidden="true" />}
        </Button>
      </div>
    </div>
  );
}

function InboxSetupDialog({ open, onOpenChange }) {
  const [step, setStep] = useState(1);

  const handleOpenChange = (isOpen) => {
    if (!isOpen) setStep(1);
    onOpenChange(isOpen);
  };

  const handleCancel = () => handleOpenChange(false);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md gap-0">
        {step === 1 ? (
          <StepOne onNext={() => setStep(2)} onCancel={handleCancel} />
        ) : (
          <StepTwo onBack={() => setStep(1)} onCancel={handleCancel} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default InboxSetupDialog;
