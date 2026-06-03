/** Agents tab: pinned AI Fit + 5 collapsible agent rows (Apply Pack, Resume Insights,
 *  Email Recap, Interview Prep, Follow-up Draft). Driven by useAgentStates. */

import FileText from "lucide-react/dist/esm/icons/file-text";
import BookOpen from "lucide-react/dist/esm/icons/book-open";
import Mail from "lucide-react/dist/esm/icons/mail";
import MessageSquare from "lucide-react/dist/esm/icons/message-square";
import Search from "lucide-react/dist/esm/icons/search";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";

import { useAuth } from "../../../context/AuthContext";
import AiFitSection from "../../AiFitSection";
import ApplyPackSection from "../../ApplyPackSection";
import FollowUpDraftSection from "../../FollowUpDraftSection";
import { InterviewPrepAgent } from "../../InterviewPrepAgent";
import JobFinderSection from "../../JobFinderSection";
import ResumeInsightsSection from "../../ResumeInsightsSection";
import ThreadSummarySection from "../../ThreadSummarySection";
import AgentRow from "../AgentRow";

function PinnedFit({ application, hasResume, aiScoresRemainingToday, onUpdate }) {
  return (
    <AiFitSection
      application={application}
      hasResume={hasResume}
      aiScoresRemainingToday={aiScoresRemainingToday}
      onScoreGenerated={(data) => onUpdate(data)}
    />
  );
}

function AgentsTab({ application, onUpdate, agentStates, expandFollowUpDraft = false }) {
  const { user } = useAuth();
  const hasResume = Boolean(user?.has_resume);

  return (
    <div className="flex flex-col gap-6">
      <PinnedFit
        application={application}
        hasResume={hasResume}
        aiScoresRemainingToday={user?.ai_scores_remaining_today}
        onUpdate={onUpdate}
      />
      <div>
        <h3 className="mb-3 text-[0.625rem] font-semibold uppercase tracking-wider text-text-3">
          Agents
        </h3>
        <ul className="overflow-hidden rounded-lg border border-border-1">
        <AgentRow
          rowId="agent-job-finder"
          icon={Search}
          title="Job Finder"
          state={agentStates.job_finder.state}
          summary={agentStates.job_finder.summary}
        >
          <JobFinderSection bare application={application} onUpdate={onUpdate} />
        </AgentRow>
        <AgentRow
          rowId="agent-apply-pack"
          icon={FileText}
          title="Apply Pack"
          state={agentStates.apply_pack.state}
          summary={agentStates.apply_pack.summary}
        >
          <ApplyPackSection
            bare
            application={application}
            onPackGenerated={(pack) => onUpdate({ apply_pack: pack })}
          />
        </AgentRow>
        <AgentRow
          rowId="agent-resume-insights"
          icon={Sparkles}
          title="Resume Insights"
          state={agentStates.resume_insights.state}
          summary={agentStates.resume_insights.summary}
        >
          <ResumeInsightsSection
            bare
            application={application}
            onUpdate={onUpdate}
            onInsightsGenerated={(insights) => onUpdate({ resume_insights: insights })}
          />
        </AgentRow>
        <AgentRow
          rowId="agent-email-recap"
          icon={MessageSquare}
          title="Email Recap"
          state={agentStates.email_recap.state}
          summary={agentStates.email_recap.summary}
        >
          <ThreadSummarySection
            bare
            application={application}
            onSummaryGenerated={(summary) => onUpdate({ thread_summary: summary })}
          />
        </AgentRow>
        <AgentRow
          rowId="agent-interview-prep"
          icon={BookOpen}
          title="Interview Prep"
          state={agentStates.interview_prep.state}
          summary={agentStates.interview_prep.summary}
        >
          <InterviewPrepAgent
            bare
            applicationId={application.id}
            application={application}
            briefing={application.interview_prep_briefing}
            generatedAt={application.interview_prep_generated_at}
            prepStatus={application.interview_prep_status}
            interviewRound={application.interview_round}
          />
        </AgentRow>
        <AgentRow
          rowId="agent-follow-up"
          icon={Mail}
          title="Follow-up Draft"
          state={agentStates.follow_up.state}
          summary={agentStates.follow_up.summary}
          defaultExpanded={expandFollowUpDraft}
        >
          <FollowUpDraftSection bare application={application} autoExpand={expandFollowUpDraft} />
        </AgentRow>
        </ul>
      </div>
    </div>
  );
}

export default AgentsTab;
