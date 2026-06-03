/** Overview tab: role facts, links, tags, follow-up, contacts, interview prep checklist, offer. */

import ContactsSection from "../../ContactsSection";
import OfferDetailsSection from "../../OfferDetailsSection";
import OfferSummarySection from "../../OfferSummarySection";
import {
  ApplicationPrepSection,
  DetailField,
  DetailPanelMetaRow,
  FollowUpSection,
  JobPostingLink,
  TagsSection,
} from "../../DetailPanelSections";

function FactsBlock({ application }) {
  return (
    <div className="rounded-lg border border-border-1 bg-surface-0 p-4">
      <h3 className="mb-3 text-[0.625rem] font-semibold uppercase tracking-wider text-text-3">
        Quick facts
      </h3>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        <DetailField label="Location" value={application.location} />
        <DetailField label="Remote" value={application.remote_status} />
        <DetailField label="Compensation" value={application.compensation} />
        <DetailField label="Company type" value={application.company_type} />
      </div>
      <div className="mt-3 border-t border-border-1 pt-3">
        <JobPostingLink url={application.source_url} />
        <DetailPanelMetaRow application={application} />
      </div>
    </div>
  );
}

function GroupCard({ title, children }) {
  return (
    <div className="rounded-lg border border-border-1 bg-surface-0 p-4">
      <h3 className="mb-3 text-[0.625rem] font-semibold uppercase tracking-wider text-text-3">
        {title}
      </h3>
      {children}
    </div>
  );
}

function OfferBlock({ application, onUpdate }) {
  if (application.current_stage !== "Offer") return null;
  return (
    <>
      <OfferSummarySection application={application} />
      <OfferDetailsSection application={application} onUpdate={onUpdate} />
    </>
  );
}

function OverviewTab({ application, onUpdate }) {
  return (
    <div className="flex flex-col gap-6">
      <FactsBlock application={application} />
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <GroupCard title="Tags">
          <TagsSection application={application} onUpdate={onUpdate} />
        </GroupCard>
        <GroupCard title="Follow-up">
          <FollowUpSection application={application} onUpdate={onUpdate} />
        </GroupCard>
      </div>
      <GroupCard title="Contacts">
        <ContactsSection applicationId={application.id} />
      </GroupCard>
      <GroupCard title="Interview prep checklist">
        <ApplicationPrepSection
          applicationId={application.id}
          initialChecklist={application.prep_checklist}
        />
      </GroupCard>
      <OfferBlock application={application} onUpdate={onUpdate} />
    </div>
  );
}

export default OverviewTab;
