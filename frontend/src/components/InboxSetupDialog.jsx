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

function StepOne({ onNext }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
        <Mail className="h-5 w-5 text-primary" aria-hidden="true" />
      </div>
      <DialogHeader>
        <DialogTitle>Use a job-search inbox</DialogTitle>
        <DialogDescription>
          Pipelined works best with a dedicated Gmail account for your job search — not your personal inbox.
        </DialogDescription>
      </DialogHeader>
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
        <p className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Why a separate inbox?</p>
        <ul className="flex flex-col gap-1.5">
          {WHY_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-foreground">
              <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <p className="text-sm text-muted-foreground">
        Don&apos;t have one yet?{" "}
        <a
          href="https://accounts.google.com/signup"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-primary underline-offset-2 hover:underline"
        >
          Create a Gmail account
          <ExternalLink className="h-3 w-3" aria-hidden="true" />
        </a>
      </p>
      <div className="flex justify-end">
        <Button type="button" onClick={onNext} className="gap-1.5">
          Continue
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </div>
  );
}

function StepTwo({ onBack, onConnect }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleConnect = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed) { setError("Enter the Gmail address you want to connect."); return; }
    if (!/^[^\s@]+@gmail\.com$/.test(trimmed)) { setError("Must be a @gmail.com address."); return; }
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
      <DialogHeader>
        <DialogTitle>Connect your job-search inbox</DialogTitle>
        <DialogDescription>
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
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          onKeyDown={(e) => { if (e.key === "Enter") handleConnect(); }}
          autoFocus
          autoComplete="email"
        />
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
      <div className="rounded-lg border border-border bg-muted/40 px-4 py-3">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">What we never do</p>
        <ul className="flex flex-col gap-1.5">
          {NEVER_DO_ITEMS.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-muted-foreground/50" aria-hidden="true" />
              {item}
            </li>
          ))}
        </ul>
      </div>
      <div className="flex justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>Back</Button>
        <Button type="button" onClick={handleConnect} disabled={loading} className="gap-1.5">
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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        {step === 1 ? (
          <StepOne onNext={() => setStep(2)} />
        ) : (
          <StepTwo onBack={() => setStep(1)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

export default InboxSetupDialog;
