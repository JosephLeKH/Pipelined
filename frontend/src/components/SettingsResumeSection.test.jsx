import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SettingsResumeSection from "./SettingsResumeSection";

vi.mock("../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useAuth", () => ({
  useUploadResume: vi.fn(),
  useDeleteResume: vi.fn(),
}));

import { useAuth } from "../context/AuthContext";
import { useUploadResume, useDeleteResume } from "../hooks/useAuth";

const mockUploadMutate = vi.fn();
const mockDeleteMutate = vi.fn();

describe("SettingsResumeSection", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useAuth.mockReturnValue({ user: { has_resume: false, ai_scores_today: 3 } });
    useUploadResume.mockReturnValue({ mutate: mockUploadMutate, isPending: false });
    useDeleteResume.mockReturnValue({ mutate: mockDeleteMutate, isPending: false });
  });

  it("should show upload drop zone when user has no resume", () => {
    render(<SettingsResumeSection />);

    expect(screen.getByRole("button", { name: /upload resume/i })).toBeInTheDocument();
  });

  it("should show file card when user has a resume", () => {
    useAuth.mockReturnValue({ user: { has_resume: true, ai_scores_today: 0 } });

    render(<SettingsResumeSection />);

    expect(screen.getByRole("button", { name: /remove resume/i })).toBeInTheDocument();
  });

  it("should show success banner after successful upload", () => {
    mockUploadMutate.mockImplementation((_, { onSuccess }) => onSuccess());

    render(<SettingsResumeSection />);

    const input = document.querySelector("input[type='file']");
    const file = new File(["content"], "resume.pdf", { type: "application/pdf" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole("alert")).toHaveTextContent("Resume uploaded successfully.");
  });

  it("should show error when a non-PDF file is selected", () => {
    render(<SettingsResumeSection />);

    const input = document.querySelector("input[type='file']");
    const file = new File(["content"], "resume.docx", { type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole("alert")).toHaveTextContent(/only pdf/i);
  });

  it("should not render AI score meter in resume section", () => {
    useAuth.mockReturnValue({ user: { has_resume: false, ai_scores_today: 5 } });

    render(<SettingsResumeSection />);

    expect(screen.queryByRole("progressbar", { name: /ai fit scores/i })).not.toBeInTheDocument();
  });
});
