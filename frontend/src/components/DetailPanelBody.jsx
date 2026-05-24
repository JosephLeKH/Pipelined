/** PanelBody: detail layout composing fields, AI command center, and timeline. */

import { useAuth } from "../context/AuthContext";
import AiFitSection from "./AiFitSection";
import AiPanelGroup from "./AiPanelGroup";
import ContactsSection from "./ContactsSection";
import FollowUpDraftSection from "./FollowUpDraftSection";
import { DetailPanelNotes } from "./DetailPanelNotes";
import { DetailPanelTimeline } from "./DetailPanelTimeline";
import OfferDetailsSection from "./OfferDetailsSection";
import OfferSummarySection from "./OfferSummarySection";
import ApplyPackSection from "./ApplyPackSection";
import { InterviewPrepAgent } from "./InterviewPrepAgent";
import ResumeInsightsSection from "./ResumeInsightsSection";
import {
  ApplicationPrepSection,
  DetailField,
  FollowUpSection,
  JobPostingLink,
  StageSelector,
  TagsSection,
} from "./DetailPanelSections";
import { formatDate } from "../lib/dateUtils";

export function PanelBody({ application, handleStageChange, handleUpdate, onAddEvent, onDirtyChange, expandFollowUpDraft = false }) {
  const { user } = useAuth();
  const stageOptions = user?.default_stages ?? [];
  const dateApplied = formatDate(application.date_applied);

  function handleFitScoreUpdate(data) {
    handleUpdate(data);
  }

  return (
    <div className="flex flex-col gap-4 px-6 py-4">
      <div className="grid grid-cols-2 gap-3">
        <DetailField label="Date Applied" value={dateApplied} />
        <DetailField label="Location" value={application.location} />
        <DetailField label="Remote" value={application.remote_status} />
        <DetailField label="Compensation" value={application.compensation} />
        <DetailField label="Company Type" value={application.company_type} />
      </div>
      <JobPostingLink url={application.source_url} />
      <AiPanelGroup>
        <AiFitSection
          application={application}
          hasResume={Boolean(user?.has_resume)}
          aiScoresRemainingToday={user?.ai_scores_remaining_today}
          onScoreGenerated={handleFitScoreUpdate}
        />
        <ResumeInsightsSection
          application={application}
          onUpdate={handleUpdate}
          onInsightsGenerated={(insights) => handleUpdate({ resume_insights: insights })}
        />
        <ApplyPackSection
          application={application}
          onPackGenerated={(pack) => handleUpdate({ apply_pack: pack })}
        />
        <InterviewPrepAgent
          applicationId={application.id}
          briefing={application.interview_prep_briefing}
          generatedAt={application.interview_prep_generated_at}
          prepStatus={application.interview_prep_status}
        />
        <FollowUpDraftSection application={application} autoExpand={expandFollowUpDraft} />
      </AiPanelGroup>
      <StageSelector stageOptions={stageOptions} currentStage={application.current_stage} onStageChange={handleStageChange} />
      <TagsSection application={application} onUpdate={handleUpdate} />
      <FollowUpSection application={application} onUpdate={handleUpdate} />
      {application.current_stage === "Offer" && (
        <>
          <OfferSummarySection application={application} />
          <OfferDetailsSection application={application} onUpdate={handleUpdate} />
        </>
      )}
      <DetailPanelNotes applicationId={application.id} initialValue={application.notes} onDirtyChange={onDirtyChange} />
      <ApplicationPrepSection applicationId={application.id} initialChecklist={application.prep_checklist} />
      <DetailPanelTimeline stageHistory={application.stage_history} applicationId={application.id} onAddEvent={onAddEvent} />
      <ContactsSection applicationId={application.id} />
    </div>
  );
}
