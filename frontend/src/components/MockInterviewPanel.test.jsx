import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { MockInterviewPanel } from "./MockInterviewPanel";

const mockStartSession = vi.fn();
const mockSendAnswer = vi.fn();
const mockEndSession = vi.fn();
const mockReset = vi.fn();

vi.mock("../hooks/useMockInterview", () => ({
  useMockInterview: vi.fn(),
}));

import { useMockInterview } from "../hooks/useMockInterview";

describe("MockInterviewPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useMockInterview.mockReturnValue({
      messages: [],
      debrief: null,
      turnCount: 0,
      status: "idle",
      errorMessage: null,
      startSession: mockStartSession,
      sendAnswer: mockSendAnswer,
      endSession: mockEndSession,
      reset: mockReset,
      isStreaming: false,
      maxTurns: 10,
      STATUS: { IDLE: "idle", STREAMING: "streaming", DEBRIEF: "debrief", ERROR: "error" },
    });
  });

  it("should render start mock interview button in idle state", () => {
    render(<MockInterviewPanel applicationId="app1" interviewRound="technical" />);

    expect(screen.getByRole("button", { name: /start mock interview/i })).toBeInTheDocument();
    expect(screen.getByText(/technical round/i)).toBeInTheDocument();
  });

  it("should start session when start button is clicked", async () => {
    render(<MockInterviewPanel applicationId="app1" />);

    await userEvent.click(screen.getByRole("button", { name: /start mock interview/i }));

    expect(mockStartSession).toHaveBeenCalledOnce();
  });

  it("should show chat bubbles and end session control during interview", () => {
    useMockInterview.mockReturnValue({
      messages: [
        { id: "a1", role: "assistant", content: "Tell me about a project." },
        { id: "u1", role: "user", content: "I built a pipeline tool." },
      ],
      debrief: null,
      turnCount: 1,
      status: "idle",
      errorMessage: null,
      startSession: mockStartSession,
      sendAnswer: mockSendAnswer,
      endSession: mockEndSession,
      reset: mockReset,
      isStreaming: false,
      maxTurns: 10,
      STATUS: { IDLE: "idle", STREAMING: "streaming", DEBRIEF: "debrief", ERROR: "error" },
    });

    render(<MockInterviewPanel applicationId="app1" />);

    expect(screen.getByText("Tell me about a project.")).toBeInTheDocument();
    expect(screen.getByText("I built a pipeline tool.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /end session/i })).toBeInTheDocument();
  });

  it("should show debrief after session ends", () => {
    useMockInterview.mockReturnValue({
      messages: [
        { id: "a1", role: "assistant", content: "Question" },
        { id: "u1", role: "user", content: "Answer" },
      ],
      debrief: "Strong storytelling. Tighten metrics in answers.",
      turnCount: 1,
      status: "debrief",
      errorMessage: null,
      startSession: mockStartSession,
      sendAnswer: mockSendAnswer,
      endSession: mockEndSession,
      reset: mockReset,
      isStreaming: false,
      maxTurns: 10,
      STATUS: { IDLE: "idle", STREAMING: "streaming", DEBRIEF: "debrief", ERROR: "error" },
    });

    render(<MockInterviewPanel applicationId="app1" />);

    expect(screen.getByText("Debrief")).toBeInTheDocument();
    expect(screen.getByText(/Strong storytelling/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /start new session/i })).toBeInTheDocument();
  });

  it("should render saved session view when application.mock_interview is populated", () => {
    const mockInterview = {
      completed_at: new Date().toISOString(),
      debrief: "Good execution, work on follow-ups.",
      transcript: [
        { role: "assistant", content: "Describe your recent project." },
        { role: "user", content: "I led the Pipelined redesign." },
      ],
    };

    render(
      <MockInterviewPanel
        applicationId="app1"
        application={{ mock_interview: mockInterview }}
      />
    );

    expect(screen.getByText("Last session saved")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /view saved session/i })).toBeInTheDocument();
  });

  it("should show view saved session button when saved interview exists", async () => {
    const mockInterview = {
      completed_at: new Date().toISOString(),
      debrief: "Good execution, work on follow-ups.",
      transcript: [
        { role: "assistant", content: "Describe your recent project." },
        { role: "user", content: "I led the Pipelined redesign." },
      ],
    };

    render(
      <MockInterviewPanel
        applicationId="app1"
        application={{ mock_interview: mockInterview }}
      />
    );

    expect(screen.getByRole("button", { name: /view saved session/i })).toBeInTheDocument();
  });

  it("should allow starting new session from idle state", async () => {
    const user = userEvent.setup();
    const mockInterview = {
      completed_at: new Date().toISOString(),
      debrief: "Good execution.",
      transcript: [{ role: "assistant", content: "Question?" }],
    };

    render(
      <MockInterviewPanel
        applicationId="app1"
        application={{ mock_interview: mockInterview }}
      />
    );

    const startButton = screen.getByRole("button", { name: /start mock interview/i });
    await user.click(startButton);

    expect(mockStartSession).toHaveBeenCalledOnce();
  });
});
