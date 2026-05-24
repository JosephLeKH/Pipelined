/** Pending approval inbox — review autopilot matches before adding to pipeline. */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import Inbox from "lucide-react/dist/esm/icons/inbox";

import EmptyState from "../components/EmptyState";
import NavBar from "../components/NavBar";
import PendingOpportunityCard from "../components/PendingOpportunityCard";
import {
  usePendingOpportunities,
  useApprovePendingOpportunity,
  useDismissPendingOpportunity,
} from "../hooks/usePendingOpportunities";

const APPROVE_TOAST = "Added to pipeline — apply when ready";

function PendingInboxLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-hidden="true">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-primary" />
    </div>
  );
}

function PendingInboxPage() {
  const navigate = useNavigate();
  const { data: opportunities, isLoading, isError } = usePendingOpportunities();
  const { mutateAsync: approve, isPending: isApproving } = useApprovePendingOpportunity();
  const { mutateAsync: dismiss, isPending: isDismissing } = useDismissPendingOpportunity();
  const [activeId, setActiveId] = useState(null);

  const handleApprove = async (opportunityId) => {
    setActiveId(opportunityId);
    try {
      const result = await approve(opportunityId);
      toast.success(APPROVE_TOAST);
      navigate(`/dashboard?selected=${result.application_id}`);
    } catch {
      toast.error("Failed to approve opportunity.");
    } finally {
      setActiveId(null);
    }
  };

  const handleDismiss = async (opportunityId) => {
    setActiveId(opportunityId);
    try {
      await dismiss(opportunityId);
    } catch {
      toast.error("Failed to dismiss opportunity.");
    } finally {
      setActiveId(null);
    }
  };

  const items = opportunities ?? [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <NavBar />
      <main className="flex-1 px-4 py-8 sm:px-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <header>
            <h1 className="font-display text-2xl font-semibold text-foreground">
              Pending approvals
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Review overnight matches. We never submit applications for you.
            </p>
          </header>

          {isLoading && <PendingInboxLoading />}

          {!isLoading && isError && (
            <EmptyState
              icon={Inbox}
              title="Could not load inbox"
              description="Please refresh and try again."
            />
          )}

          {!isLoading && !isError && items.length === 0 && (
            <EmptyState
              icon={Inbox}
              title="Inbox empty"
              description="Enable autopilot in settings to queue overnight matches for review. We never submit applications for you."
              actionButton={{
                label: "Autopilot settings",
                onClick: () => navigate("/settings?section=autopilot"),
              }}
            />
          )}

          {!isLoading && !isError && items.length > 0 && (
            <div className="flex flex-col gap-4">
              {items.map((opp) => (
                <PendingOpportunityCard
                  key={opp.id}
                  opportunity={opp}
                  onApprove={handleApprove}
                  onDismiss={handleDismiss}
                  isApproving={isApproving && activeId === opp.id}
                  isDismissing={isDismissing && activeId === opp.id}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default PendingInboxPage;
