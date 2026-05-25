/** Smoke tests for DetailPanel optimistic stage change. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../hooks/useApplications", () => ({
  useUpdateApplication: vi.fn(),
  useDeleteApplication: vi.fn(),
  useRestoreApplication: vi.fn(),
  useTags: () => ({ data: { tags: [] } }),
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({
    user: { default_stages: ["Applied", "Interview", "Offer"], has_resume: false, ai_scores_remaining_today: 5 },
  }),
}));
vi.mock("../lib/analytics", () => ({ trackEvent: vi.fn() }));
vi.mock("./ContactsSection", () => ({ default: () => null }));
vi.mock("./AiFitSection", () => ({ default: () => null }));
vi.mock("./DetailPanelHeader", () => ({
  DetailPanelHeader: ({ application, onClose }) => (
    <div>
      <span>{application.role_title}</span>
      <button onClick={onClose}>Close</button>
    </div>
  ),
}));
vi.mock("./DetailPanelNotes", () => ({ DetailPanelNotes: () => null }));
vi.mock("./DetailPanelTimeline", () => ({ DetailPanelTimeline: () => null }));
vi.mock("../lib/showUndoToast", () => ({ showUndoToast: vi.fn(() => "toast-1") }));
vi.mock("./AgentActivitySection", () => ({ default: () => null }));
vi.mock("./ApplyPackSection", () => ({ default: () => null }));
vi.mock("./InterviewPrepAgent", () => ({ InterviewPrepAgent: () => null }));
vi.mock("./ResumeInsightsSection", () => ({ default: () => null }));
vi.mock("./OfferDetailsSection", () => ({ default: () => null }));
vi.mock("./OfferSummarySection", () => ({ default: () => null }));
vi.mock("./FollowUpDraftSection", () => ({ default: () => null }));
vi.mock("./ThreadSummarySection", () => ({ default: () => null }));

import { useUpdateApplication, useDeleteApplication, useRestoreApplication } from "../hooks/useApplications";
import DetailPanel from "./DetailPanel";
import { makeTestWrapper } from "../test/testProviders";

const APP = {
  id: "app1",
  role_title: "Engineer",
  company: "Acme",
  current_stage: "Applied",
  date_applied: "2026-01-01",
  stage_history: [],
  notes: "",
  source_url: "",
};

function setup(mutate = vi.fn()) {
  useUpdateApplication.mockReturnValue({ mutate });
  useDeleteApplication.mockReturnValue({ mutate: vi.fn() });
  useRestoreApplication.mockReturnValue({ mutate: vi.fn() });
}

function renderPanel(application = APP) {
  const Wrapper = makeTestWrapper();
  return render(
    <Wrapper>
      <DetailPanel application={application} onClose={vi.fn()} onAddEvent={vi.fn()} />
    </Wrapper>
  );
}

async function selectStage(name) {
  await userEvent.click(screen.getByRole("button", { name: /stage/i }));
  await userEvent.click(screen.getByRole("menuitem", { name: new RegExp(`^${name}$`, "i") }));
}

describe("DetailPanel optimistic stage change", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render stage dropdown with the current stage", () => {
    setup();
    renderPanel();

    expect(screen.getByRole("button", { name: /stage/i })).toHaveTextContent("Applied");
  });

  it("should call updateApp when a different stage is selected", async () => {
    const mutate = vi.fn();
    setup(mutate);
    renderPanel();

    await selectStage("Interview");

    expect(mutate).toHaveBeenCalledWith(
      { id: "app1", body: { current_stage: "Interview" } },
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });

  it("should call updateApp when the same stage is selected again", async () => {
    const mutate = vi.fn();
    setup(mutate);
    renderPanel();

    await selectStage("Applied");

    expect(mutate).toHaveBeenCalled();
  });
});
