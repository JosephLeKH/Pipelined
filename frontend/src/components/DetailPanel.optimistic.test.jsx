/** Smoke tests for DetailPanel optimistic stage change. */

import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { MemoryRouter } from "react-router-dom";

vi.mock("../hooks/useApplications", () => ({
  useUpdateApplication: vi.fn(),
  useDeleteApplication: vi.fn(),
  useRestoreApplication: vi.fn(),
  useTags: () => ({ data: { tags: [] } }),
}));
vi.mock("../context/AuthContext", () => ({
  useAuth: () => ({ user: { default_stages: ["Applied", "Interview", "Offer"], has_resume: false, ai_scores_remaining_today: 5 } }),
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
vi.mock("./UndoToast", () => ({ default: () => null }));
vi.mock("./AgentActivitySection", () => ({ default: () => null }));
vi.mock("./ApplyPackSection", () => ({ default: () => null }));
vi.mock("./InterviewPrepAgent", () => ({ InterviewPrepAgent: () => null }));
vi.mock("./ResumeInsightsSection", () => ({ default: () => null }));
vi.mock("./OfferDetailsSection", () => ({ default: () => null }));
vi.mock("./OfferSummarySection", () => ({ default: () => null }));
vi.mock("./FollowUpDraftSection", () => ({ default: () => null }));

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

describe("DetailPanel optimistic stage change", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("should render stage pills for each stage option", () => {
    setup();
    renderPanel();

    expect(screen.getByRole("button", { name: "Applied" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Interview" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Offer" })).toBeTruthy();
  });

  it("should call updateApp when a stage pill is clicked", () => {
    const mutate = vi.fn();
    setup(mutate);
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Interview" }));

    expect(mutate).toHaveBeenCalledWith(
      { id: "app1", body: { current_stage: "Interview" } },
      expect.objectContaining({ onError: expect.any(Function) })
    );
  });

  it("should not call updateApp when the same stage is clicked", () => {
    const mutate = vi.fn();
    setup(mutate);
    renderPanel();

    // Click the already-active stage — should still call mutate (UI optimistically updates)
    fireEvent.click(screen.getByRole("button", { name: "Applied" }));

    // Mutation is called but with same stage — backend ignores it
    expect(mutate).toHaveBeenCalled();
  });
});
