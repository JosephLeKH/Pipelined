/** PanelBody: detail layout led by Scout's Take + Toolkit, metadata demoted. */

import { useCallback, useRef } from "react";

import { useAuth } from "../context/AuthContext";
import AgentActivitySection from "./AgentActivitySection";
import AiFitSection from "./AiFitSection";
import ApplyPackSection from "./ApplyPackSection";
import ContactsSection from "./ContactsSection";
import { DetailPanelNotes } from "./DetailPanelNotes";
import { DetailPanelTimeline } from "./DetailPanelTimeline";
import FollowUpDraftSection from "./FollowUpDraftSection";
import { InterviewPrepAgent } from "./InterviewPrepAgent";
import OfferDetailsSection from "./OfferDetailsSection";
import OfferSummarySection from "./OfferSummarySection";
import ResumeInsightsSection from "./ResumeInsightsSection";
import ScoutTake from "./scout/ScoutTake";
import ScoutToolkit from "./scout/ScoutToolkit";
import ThreadSummarySection from "./ThreadSummarySection";
import { OPEN_COPILOT_EVENT } from "../lib/constants";
import {
  ApplicationPrepSection,
  DetailField,
  DetailPanelMetaRow,
  FollowUpSection,
  JobPostingLink,
  StageSelector,
  TagsSection,
} from "./DetailPanelSections";

const TOOL_SECTION_IDS = {
  apply_pack: "scout-tool-apply-pack",
  mock_interview: "scout-tool-mock-interview",
  resume_insights: "scout-tool-resume-insights",
  email_recap: "scout-tool-email-recap",
  interview_prep: "scout-tool-interview-prep",
  follow_up: "scout-tool-follow-up",
};

export function PanelBody({
  application,
  handleStageChange,
  handleUpdate,
  onAddEvent,
  onDirtyChange,
  expandFollowUpDraft = false,
}) {
  const { user } = useAuth();
  const stageOptions = user?.default_stages ?? [];
  const sectionRefs = useRef({});

  const handleToolOpen = useCallback((toolKey) => {
    const id = TOOL_SECTION_IDS[toolKey];
    const el = id ? document.getElementById(id) : null;
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleAskScout = useCallback(() => {
    window.dispatchEvent(new CustomEvent(OPEN_COPILOT_EVENT));
  }, []);

  return (
    <div className="flex flex-col gap-4 px-4 pb-6">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border-1">
        <span className="text-xs text-text-3">Stage</span>
        <StageSelector
          stageOptions={stageOptions}
          currentStage={application.current_stage}
          onStageChange={handleStageChange}
        />
      </div>

      <ScoutTake application={application} onAskScout={handleAskScout} />

      <ScoutToolkit application={application} onToolOpen={handleToolOpen} />

      <DetailPanelNotes
        applicationId={application.id}
        initialValue={application.notes}
        onDirtyChange={onDirtyChange}
      />

      <DetailPanelTimeline
        stageHistory={application.stage_history}
        applicationId={application.id}
        onAddEvent={onAddEvent}
      />

      <TagsSection application={application} onUpdate={handleUpdate} />
      <FollowUpSection application={application} onUpdate={handleUpdate} />

      {application.current_stage === "Offer" && (
        <>
          <OfferSummarySection application={application} />
          <OfferDetailsSection application={application} onUpdate={handleUpdate} />
        </>
      )}

      <ApplicationPrepSection
        applicationId={application.id}
        initialChecklist={application.prep_checklist}
      />

      {/* Tool sections — anchored by ID for scroll-to from Toolkit */}
      <div id={TOOL_SECTION_IDS.apply_pack} ref={(el) => (sectionRefs.current.apply_pack = el)}>
        <ApplyPackSection
          application={application}
          onPackGenerated={(pack) => handleUpdate({ apply_pack: pack })}
        />
      </div>
      <div id={TOOL_SECTION_IDS.resume_insights}>
        <ResumeInsightsSection
          application={application}
          onUpdate={handleUpdate}
          onInsightsGenerated={(insights) => handleUpdate({ resume_insights: insights })}
        />
      </div>
      <div id={TOOL_SECTION_IDS.email_recap}>
        <ThreadSummarySection
          application={application}
          onSummaryGenerated={(summary) => handleUpdate({ thread_summary: summary })}
        />
      </div>
      <div id={TOOL_SECTION_IDS.interview_prep}>
        <InterviewPrepAgent
          applicationId={application.id}
          application={application}
          briefing={application.interview_prep_briefing}
          generatedAt={application.interview_prep_generated_at}
          prepStatus={application.interview_prep_status}
          interviewRound={application.interview_round}
        />
      </div>
      <div id={TOOL_SECTION_IDS.follow_up}>
        <FollowUpDraftSection application={application} autoExpand={expandFollowUpDraft} />
      </div>
      <div id={TOOL_SECTION_IDS.mock_interview} className="hidden">
        {/* MockInterviewPanel lives in its own modal; this anchor is a future hook */}
      </div>

      <AiFitSection
        application={application}
        hasResume={Boolean(user?.has_resume)}
        aiScoresRemainingToday={user?.ai_scores_remaining_today}
        onScoreGenerated={(data) => handleUpdate(data)}
      />

      <AgentActivitySection applicationId={application.id} />
      <ContactsSection applicationId={application.id} />

      {/* Metadata — demoted to bottom */}
      <DetailPanelMetaRow application={application} />
      <JobPostingLink url={application.source_url} />
      <div className="grid grid-cols-2 gap-3">
        <DetailField label="Location" value={application.location} />
        <DetailField label="Remote" value={application.remote_status} />
        <DetailField label="Compensation" value={application.compensation} />
        <DetailField label="Company Type" value={application.company_type} />
      </div>
    </div>
  );
}
