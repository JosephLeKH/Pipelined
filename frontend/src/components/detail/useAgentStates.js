/** Derives state for each agent (Idle / Ready / Running / Error) from the application object.
 *  Used by AgentRow for the per-row pill and by the Tabs strip for the live "running" badge count. */

const STATE_IDLE = "idle";
const STATE_READY = "ready";
const STATE_RUNNING = "running";
const STATE_ERROR = "error";

function applyPackState(app) {
  if (app.apply_pack) return { state: STATE_READY, summary: "Cover + talking points" };
  return { state: STATE_IDLE, summary: "Tailored cover letter + talking points" };
}

function resumeInsightsState(app) {
  if (app.resume_insights) {
    const tips = app.resume_insights.suggestions?.length ?? 0;
    return { state: STATE_READY, summary: `${tips} suggestion${tips === 1 ? "" : "s"}` };
  }
  return { state: STATE_IDLE, summary: "Tailor your resume to this JD" };
}

function emailRecapState(app) {
  if (app.thread_summary) return { state: STATE_READY, summary: "Threads summarized" };
  return { state: STATE_IDLE, summary: "Summarize recruiter threads" };
}

function interviewPrepState(app) {
  if (app.interview_prep_status === "generating") {
    return { state: STATE_RUNNING, summary: "Researching company…" };
  }
  if (app.interview_prep_status === "error") {
    return { state: STATE_ERROR, summary: "Briefing failed — retry" };
  }
  if (app.interview_prep_briefing) {
    return { state: STATE_READY, summary: "Company + process briefing ready" };
  }
  return { state: STATE_IDLE, summary: "Company facts + process notes + mock interview" };
}

function followUpDraftState(app) {
  if (app.follow_up_draft) return { state: STATE_READY, summary: "Draft ready to copy" };
  return { state: STATE_IDLE, summary: "Draft when you're ready" };
}

const RESOLVERS = {
  apply_pack: applyPackState,
  resume_insights: resumeInsightsState,
  email_recap: emailRecapState,
  interview_prep: interviewPrepState,
  follow_up: followUpDraftState,
};

export const AGENT_STATE = {
  IDLE: STATE_IDLE,
  READY: STATE_READY,
  RUNNING: STATE_RUNNING,
  ERROR: STATE_ERROR,
};

export function useAgentStates(application) {
  const entries = Object.entries(RESOLVERS).map(([key, resolver]) => [key, resolver(application)]);
  const states = Object.fromEntries(entries);
  const runningCount = entries.filter(([, s]) => s.state === STATE_RUNNING).length;
  return { states, runningCount };
}
