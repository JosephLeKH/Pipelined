/** Pending approval inbox — review autopilot matches before adding to pipeline. */

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";

import Inbox from "lucide-react/dist/esm/icons/inbox";

import EmptyState from "../components/EmptyState";
import PendingOpportunityCard from "../components/PendingOpportunityCard";
import {
  usePendingOpportunities,
  useApprovePendingOpportunity,
  useDismissPendingOpportunity,
} from "../hooks/usePendingOpportunities";

const APPROVE_TOAST = "Added to pipeline. Apply when ready.";
const EMPTY_DESCRIPTION =
  "Scout hasn't queued anything yet. Configure Autopilot in Settings → Scout → Autopilot.";

function PendingInboxLoading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center" aria-hidden="true">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-border-1 border-t-brand-600 motion-reduce:animate-none" />
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
      navigate(`/applications/${result.application_id}`);
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
  const reviewCount = items.length;

  return (
    <main className="flex-1 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-2xl space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-text-1">
              Scout's Drafts
              {reviewCount > 0 && (
                <span className="font-normal text-text-2">{` · ${reviewCount} to review`}</span>
              )}
            </h1>
            <p className="mt-1 text-sm text-text-2">
              Roles Scout found and cover letters Scout drafted. Approve to add them to your pipeline.
            </p>
          </div>
          {reviewCount > 0 && (
            <Link
              to="/settings?section=autopilot"
              className="text-sm font-medium text-brand-600 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-600 focus-visible:outline-offset-2 dark:text-brand-400"
            >
              Pause autopilot
            </Link>
          )}
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
            title="No pending matches"
            description={EMPTY_DESCRIPTION}
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
  );
}

export default PendingInboxPage;
