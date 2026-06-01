/** Settings — Integrations tab: manage the connected job-search Gmail inbox. */

import { useState } from "react";
import { toast } from "sonner";

import CheckCircle from "lucide-react/dist/esm/icons/check-circle";
import Mail from "lucide-react/dist/esm/icons/mail";
import RefreshCw from "lucide-react/dist/esm/icons/refresh-cw";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";
import Trash2 from "lucide-react/dist/esm/icons/trash-2";
import Zap from "lucide-react/dist/esm/icons/zap";

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
import { useGmailActivity } from "../hooks/useGmailActivity";
import {
  useGmailDisconnectMutation,
  useGmailSettingsMutation,
  useGmailStatus,
  useGmailSyncMutation,
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

function formatDateTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "";
  }
}

function ToggleRow({ label, description, id, checked, onChange, disabled }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5">
      <div>
        <p id={id} className="text-sm font-medium text-text-1">{label}</p>
        {description && <p className="mt-0.5 text-sm text-text-2">{description}</p>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-labelledby={id}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative mt-0.5 inline-flex h-6 w-10 shrink-0 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-600/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${checked ? "bg-brand-600" : "bg-surface-2"}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white dark:bg-surface-0 shadow transition-transform ${checked ? "translate-x-5" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}



const EVENT_LABELS = {
  application_tracked: "Application tracked",
  status_updated: "Status updated",
};

function formatActivityTime(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

function GmailActivityFeed() {
  const { data, isLoading } = useGmailActivity();

  if (isLoading) {
    return <div className="mt-3 h-16 animate-pulse rounded-lg bg-surface-1/40" />;
  }

  const events = data?.events ?? [];
  if (!events.length) {
    return (
      <p className="mt-3 text-xs text-text-2">
        No recent email activity yet. Events appear after the next sync. We never store email bodies.
      </p>
    );
  }

  return (
    <ul className="mt-3 divide-y divide-border-1 rounded-lg border border-border-1">
      {events.map((event, idx) => (
        <li key={`${event.timestamp}-${idx}`} className="px-3 py-2.5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-medium text-text-1">
                {EVENT_LABELS[event.event_type] ?? event.event_type}
              </p>
              <p className="truncate text-xs text-text-2">
                {[event.company, event.role_title].filter(Boolean).join(" · ") || "Job email classified"}
              </p>
            </div>
            <time className="shrink-0 text-xs text-text-2" dateTime={event.timestamp}>
              {formatActivityTime(event.timestamp)}
            </time>
          </div>
        </li>
      ))}
    </ul>
  );
}

function ConnectedState({ status, onDisconnect }) {
  const settingsMutation = useGmailSettingsMutation();
  const syncMutation = useGmailSyncMutation();

  const handleToggle = (key) => (val) => {
    settingsMutation.mutate(
      { [key]: val },
      { onError: () => toast.error("Couldn't update Gmail settings. Try again.") },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border-1 bg-surface-0 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-brand-600" aria-hidden="true" />
            <span className="text-sm font-semibold text-text-1">Connected</span>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs text-brand-700 hover:bg-brand-600/10 hover:text-brand-700"
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
        <div className="flex items-center gap-2.5 rounded-lg border border-border-1 bg-surface-1/50 px-3 py-2.5">
          <Mail className="h-4 w-4 shrink-0 text-brand-600" aria-hidden="true" />
          <div className="flex-1">
            <p className="text-sm font-medium text-text-1">{status.email}</p>
            {status.connected_at && (
              <p className="text-xs text-text-2">
                Connected {formatDate(status.connected_at)}
              </p>
            )}
          </div>
        </div>
        {status.apps_tracked > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-text-2">
            <Sparkles className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
            Your agent has tracked {status.apps_tracked} application{status.apps_tracked === 1 ? "" : "s"} automatically.
          </div>
        )}
      </div>

      <div className="rounded-lg border border-border-1 bg-surface-0 p-5">
        <h3 className="mb-1 text-sm font-semibold text-text-1">Automation settings</h3>
        <p className="mb-3 text-sm text-text-2">
          Choose what Pipelined does when it reads a job email.
        </p>
        <div className="divide-y divide-border-1">
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
            description="The prep agent researches the company and role automatically. Ready before your first interview."
            checked={status.interview_prep}
            onChange={handleToggle("interview_prep")}
            disabled={settingsMutation.isPending}
          />
        </div>
      </div>

      <div className="rounded-lg border border-border-1 bg-surface-0 p-5">
        <h3 className="mb-3 text-sm font-semibold text-text-1">Activity (last 30 days)</h3>
        {status.last_sync_at && (
          <p className="mb-3 text-xs text-text-2">
            Last sync: {formatDateTime(status.last_sync_at)}
          </p>
        )}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Emails scanned", value: status.emails_scanned ?? 0 },
            { label: "Apps tracked", value: status.apps_tracked ?? 0 },
            { label: "Status updates", value: status.status_updates_count ?? 0 },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg border border-border-1 bg-surface-1/40 p-3 text-center">
              <p className="text-lg font-semibold text-text-1">{value === 0 ? "N/A" : value}</p>
              <p className="text-xs text-text-2">{label}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 border-t border-border-1 pt-4">
          <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-text-2">Recent activity</h4>
          <p className="text-xs text-text-2">Last 5 classification events: no email content stored.</p>
          <GmailActivityFeed />
        </div>
        <div className="mt-2.5 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-1.5 text-xs"
            aria-busy={syncMutation.isPending}
            disabled={syncMutation.isPending}
            onClick={() =>
              syncMutation.mutate(undefined, {
                onSuccess: () => toast.success("Gmail sync started"),
                onError: () => toast.error("Couldn't sync Gmail. Try again."),
              })
            }
          >
            <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
            Sync Now
          </Button>
        </div>
      </div>
    </div>
  );
}

function DisconnectedState({ onSetupOpen }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-lg border border-border-1 bg-surface-0 p-6 text-center">
        <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-surface-1">
          <Mail className="h-5 w-5 text-text-2" aria-hidden="true" />
        </div>
        <h3 className="mb-1 text-sm font-semibold text-text-1">No inbox connected</h3>
        <p className="mb-4 text-sm text-text-2">
          Connect a dedicated job-search Gmail account to start auto-tracking applications.
        </p>
        <Button type="button" onClick={onSetupOpen}>Connect job-search inbox</Button>
      </div>

      <div className="rounded-lg border border-border-1 bg-surface-0 p-6">
        <h3 className="mb-4 text-sm font-semibold text-text-1">How it works</h3>
        <div className="flex flex-col gap-3">
          {[
            { icon: Mail, label: "Connect your job-search Gmail" },
            { icon: Sparkles, label: "Agent reads job emails automatically" },
            { icon: Zap, label: "Dashboard updates without lifting a finger" },
          ].map(({ icon: Icon, label }, idx) => (
            <div key={idx} className="flex items-start gap-3">
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-600/10">
                <Icon className="h-3.5 w-3.5 text-brand-600" aria-hidden="true" />
              </div>
              <p className="text-sm text-text-1">{label}</p>
            </div>
          ))}
        </div>
      </div>
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
          <h2 className="text-sm font-semibold text-text-1">Integrations</h2>
        </div>
        <div className="h-40 animate-pulse rounded-lg bg-surface-1/40" />
      </div>
    );
  }

  const connected = status?.connected ?? false;

  return (
    <div className="flex flex-col gap-2">
      <div className="mb-2">
        <h2 className="text-sm font-semibold text-text-1">Integrations</h2>
        <p className="text-xs text-text-2">
          Pipelined works with your job-search inbox to track applications automatically.
        </p>
      </div>
      {connected ? (
        <ConnectedState
          status={status}
          onDisconnect={() =>
            disconnectMutation.mutate(undefined, {
              onError: () => toast.error("Couldn't disconnect Gmail. Try again."),
            })
          }
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
