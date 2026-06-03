/** Overview tab: role facts, posting link + JD, tags, follow-up, contacts, interview prep checklist, offer. */

import { useState } from "react";

import ExternalLink from "lucide-react/dist/esm/icons/external-link";

import { JOB_DESCRIPTION_MAX_LENGTH } from "../../../lib/constants";
import ContactsSection from "../../ContactsSection";
import OfferDetailsSection from "../../OfferDetailsSection";
import OfferSummarySection from "../../OfferSummarySection";
import {
  ApplicationPrepSection,
  DetailField,
  DetailPanelMetaRow,
  FollowUpSection,
  TagsSection,
} from "../../DetailPanelSections";
import { Textarea } from "../../ui/textarea";

function isSafeHttpUrl(value) {
  if (!value) return false;
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

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
        <DetailPanelMetaRow application={application} />
      </div>
    </div>
  );
}

function GroupCard({ title, children, action }) {
  return (
    <div className="rounded-lg border border-border-1 bg-surface-0 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[0.625rem] font-semibold uppercase tracking-wider text-text-3">
          {title}
        </h3>
        {action}
      </div>
      {children}
    </div>
  );
}

function PostingUrlField({ application, onUpdate }) {
  const [value, setValue] = useState(application.source_url ?? "");
  const stored = application.source_url ?? "";
  const dirty = value.trim() !== stored.trim();
  const showOpenLink = isSafeHttpUrl(application.source_url);

  function handleBlur() {
    if (!dirty) return;
    const next = value.trim();
    if (next && !isSafeHttpUrl(next)) return;
    onUpdate({ source_url: next || null });
  }

  return (
    <GroupCard
      title="Job posting URL"
      action={
        showOpenLink ? (
          <a
            href={application.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-brand-600 hover:text-brand-700 hover:underline"
            aria-label="Open job posting in new tab"
          >
            <ExternalLink className="h-3 w-3" aria-hidden="true" />
            Open
          </a>
        ) : null
      }
    >
      <input
        type="url"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        placeholder="https://company.com/careers/role-id"
        className="w-full rounded border border-border-1 bg-surface-1 px-2 py-1.5 text-sm text-text-1 placeholder:text-text-3 focus:border-brand-600 focus:outline-none"
      />
    </GroupCard>
  );
}

function JobDescriptionField({ application, onUpdate }) {
  const [value, setValue] = useState(application.job_description ?? "");
  const stored = application.job_description ?? "";
  const dirty = value !== stored;

  function handleBlur() {
    if (!dirty) return;
    onUpdate({ job_description: value.trim() ? value : null });
  }

  return (
    <GroupCard title="Job description">
      <Textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onBlur={handleBlur}
        maxLength={JOB_DESCRIPTION_MAX_LENGTH}
        rows={8}
        placeholder="Paste or auto-fetch the job description. Used by Resume Insights, Apply Pack, and Interview Prep."
        className="text-sm"
      />
      <p className="mt-2 text-[0.6875rem] text-text-3">
        {value.length.toLocaleString()} / {JOB_DESCRIPTION_MAX_LENGTH.toLocaleString()} characters
      </p>
    </GroupCard>
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
      <PostingUrlField application={application} onUpdate={onUpdate} />
      <JobDescriptionField application={application} onUpdate={onUpdate} />
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
