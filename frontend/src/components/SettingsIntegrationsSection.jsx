/** Settings — Integrations tab: manage the connected job-search Gmail inbox. */

import { useState } from "react";

import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import Mail from "lucide-react/dist/esm/icons/mail";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";

import InboxSetupDialog from "./InboxSetupDialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";
import { Button, buttonVariants } from "./ui/button";
import {
  useGmailDisconnectMutation,
  useGmailSettingsMutation,
  useGmailStatus,
} from "../hooks/useGmailStatus";

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return "";
  }
}

function ToggleRow({ label, description, id, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div>
        <p id={id} className="text-sm font-medium text-foreground">{label}</p>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${checked ? "bg-primary" : "bg-muted"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-gray-100 shadow transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}

function ConnectedState({ status, onDisconnect }) {
  const settingsMutation = useGmailSettingsMutation();

  const handleToggle = (key) => (val) => {
    settingsMutation.mutate({ [key]: val });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-border bg-card p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" aria-hidden="true" />
            <span className="text-sm font-semibold text-foreground">Connected</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                Disconnect
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Disconnect job-search inbox?</AlertDialogTitle>
                <AlertDialogDescription>
                  Pipelined will stop auto-tracking applications from this inbox. Your existing tracked applications will not be deleted.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  className={buttonVariants({ variant: "destructive" })}
                  onClick={onDisconnect}
                >
                  Disconnect
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
        <div className="flex items-center gap-2.5 rounded-lg border border-border bg-muted/50 px-3 py-2.5">
          <Mail className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <div>
            <p className="text-sm font-medium text-foreground">{status.email}</p>
            {status.connected_at && (
              <p className="text-xs text-muted-foreground">
                Connected {formatDate(status.connected_at)}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-1 text-sm font-semibold text-foreground">Automation settings</h3>
        <p className="mb-3 text-sm text-muted-foreground">
          Choose what Pipelined does when it reads a job email.
        </p>
        <div className="divide-y divide-border">
          <ToggleRow
            id="toggle-auto-track"
            label="Auto-track applications"
            description="Create a record whenever a confirmation email arrives"
            checked={status.auto_track}
            onChange={handleToggle("auto_track")}
            disabled={settingsMutation.isPending}
          />
          <ToggleRow
            id="toggle-status-updates"
            label="Status updates"
            description="Move applications to OA, Interviewing, or Rejected automatically"
            checked={status.status_updates}
            onChange={handleToggle("status_updates")}
            disabled={settingsMutation.isPending}
          />
          <ToggleRow
            id="toggle-interview-prep"
            label="Auto-generate interview prep"
            description="Start a briefing the moment an interview invite arrives"
            checked={status.interview_prep}
            onChange={handleToggle("interview_prep")}
            disabled={settingsMutation.isPending}
          />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h3 className="mb-3 text-sm font-semibold text-foreground">Activity (last 30 days)</h3>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Emails scanned", value: status.emails_scanned ?? "—" },
            { label: "Apps tracked", value: status.apps_tracked ?? "—" },
            { label: "Status updates", value: status.status_updates_count ?? "—" },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border bg-muted/40 p-3 text-center">
              <p className="text-lg font-semibold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground">{label}</p>
            </div>
          ))}
        </div>
        {status.last_sync_at && (
          <p className="mt-2.5 text-xs text-muted-foreground">
            Last synced {formatDate(status.last_sync_at)}
          </p>
        )}
      </div>
    </div>
  );
}

function DisconnectedState({ onSetupOpen }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
        <Mail className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
      </div>
      <h3 className="mb-1 text-sm font-semibold text-foreground">No inbox connected</h3>
      <p className="mb-4 text-sm text-muted-foreground">
        Connect a dedicated job-search Gmail account to start auto-tracking applications.
      </p>
      <Button type="button" onClick={onSetupOpen}>Connect job-search inbox</Button>
    </div>
  );
}

function SettingsIntegrationsSection() {
  const { data: status, isLoading } = useGmailStatus();
  const disconnectMutation = useGmailDisconnectMutation();
  const [dialogOpen, setDialogOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <div className="mb-2">
          <h2 className="text-lg font-semibold font-display text-foreground">Integrations</h2>
        </div>
        <div className="h-40 animate-pulse rounded-xl bg-muted/40" />
      </div>
    );
  }

  const connected = status?.connected ?? false;

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-2">
        <h2 className="text-lg font-semibold font-display text-foreground">Integrations</h2>
        <p className="text-sm text-muted-foreground">
          Pipelined works with your job-search inbox to track applications automatically.
        </p>
      </div>
      {connected ? (
        <ConnectedState
          status={status}
          onDisconnect={() => disconnectMutation.mutate()}
        />
      ) : (
        <>
          <DisconnectedState onSetupOpen={() => setDialogOpen(true)} />
          <InboxSetupDialog open={dialogOpen} onOpenChange={setDialogOpen} />
        </>
      )}
    </div>
  );
}

export default SettingsIntegrationsSection;
