/** Scout's Toolkit — 3-col responsive grid of 6 tool cards. */

import ScoutToolCard from "./ScoutToolCard";

function applyPackState(app) {
  if (app.apply_pack) {
    return { variant: "ready", summary: "Cover + talking points", ctaLabel: "View" };
  }
  return { variant: "runIt", summary: "Tailored cover letter + 3 talking points", ctaLabel: "Generate" };
}

function mockInterviewState(app) {
  if (app.mock_interview_session_id) {
    return { variant: "ready", summary: "Last session ready to resume", ctaLabel: "Resume" };
  }
  return { variant: "runIt", summary: "5 questions · ~12 min", ctaLabel: "Start" };
}

function resumeInsightsState(app) {
  if (app.resume_insights) {
    const tips = app.resume_insights.suggestions?.length ?? 0;
    return { variant: "ready", summary: `${tips} tip${tips === 1 ? "" : "s"}`, ctaLabel: "View" };
  }
  return { variant: "runIt", summary: "Tailor your resume to this JD", ctaLabel: "Run" };
}

function emailRecapState(app) {
  if (app.thread_summary) {
    return { variant: "ready", summary: "Threads summarized", ctaLabel: "View" };
  }
  return { variant: "runIt", summary: "Summarize recruiter threads", ctaLabel: "Generate" };
}

function interviewPrepState(app) {
  if (app.interview_prep_briefing) {
    return { variant: "ready", summary: "Company + process brief", ctaLabel: "View" };
  }
  if (app.interview_prep_status === "running") {
    return { variant: "working", summary: "Researching company…" };
  }
  return { variant: "runIt", summary: "Company facts + process notes", ctaLabel: "Run" };
}

function followUpState(app) {
  if (app.follow_up_draft) {
    return { variant: "ready", summary: "Draft ready to copy", ctaLabel: "View" };
  }
  return { variant: "runIt", summary: "Draft when you're ready", ctaLabel: "Draft" };
}

const TOOLS = [
  { key: "apply_pack", title: "Apply Pack", resolveState: applyPackState },
  { key: "mock_interview", title: "Mock Interview", resolveState: mockInterviewState },
  { key: "resume_insights", title: "Resume Insights", resolveState: resumeInsightsState },
  { key: "email_recap", title: "Email Recap", resolveState: emailRecapState },
  { key: "interview_prep", title: "Interview Prep", resolveState: interviewPrepState },
  { key: "follow_up", title: "Follow-up Draft", resolveState: followUpState },
];

function ScoutToolkit({ application, onToolOpen }) {
  return (
    <section aria-label="Scout's Toolkit" className="border-t border-border-1 pt-4">
      <h3 className="pb-2 text-xs font-medium uppercase tracking-wide text-text-3">
        Scout's Toolkit
      </h3>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {TOOLS.map((tool) => {
          const state = tool.resolveState(application);
          return (
            <ScoutToolCard
              key={tool.key}
              title={tool.title}
              variant={state.variant}
              summary={state.summary}
              ctaLabel={state.ctaLabel}
              onClick={() => onToolOpen(tool.key)}
            />
          );
        })}
      </div>
    </section>
  );
}

export default ScoutToolkit;
