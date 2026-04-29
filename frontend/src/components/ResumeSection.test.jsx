import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ResumeSection from "./ResumeSection";

const RESUME_MAX_MB = 5;

describe("ResumeSection", () => {
  let onResumeUpload;
  let onResumeDelete;

  beforeEach(() => {
    vi.clearAllMocks();
    onResumeUpload = vi.fn();
    onResumeDelete = vi.fn();
  });

  it("should render Upload resume label when hasResume is false", () => {
    render(<ResumeSection hasResume={false} isUploading={false} isDeleting={false} onResumeUpload={onResumeUpload} onResumeDelete={onResumeDelete} />);

    expect(screen.getByText(/upload resume/i)).toBeInTheDocument();
  });

  it("should render Replace resume label when hasResume is true", () => {
    render(<ResumeSection hasResume={true} isUploading={false} isDeleting={false} onResumeUpload={onResumeUpload} onResumeDelete={onResumeDelete} />);

    expect(screen.getByText(/replace resume/i)).toBeInTheDocument();
  });

  it("should show Remove resume button when hasResume is true", () => {
    render(<ResumeSection hasResume={true} isUploading={false} isDeleting={false} onResumeUpload={onResumeUpload} onResumeDelete={onResumeDelete} />);

    expect(screen.getByRole("button", { name: /remove resume/i })).toBeInTheDocument();
  });

  it("should show success banner after successful upload", () => {
    onResumeUpload.mockImplementation((_, { onSuccess }) => onSuccess());

    render(<ResumeSection hasResume={false} isUploading={false} isDeleting={false} onResumeUpload={onResumeUpload} onResumeDelete={onResumeDelete} />);

    const input = document.querySelector("input[type='file']");
    const file = new File(["content"], "resume.pdf", { type: "application/pdf" });
    Object.defineProperty(file, "size", { value: 1024 });
    fireEvent.change(input, { target: { files: [file] } });

    expect(screen.getByRole("alert")).toHaveTextContent("Resume uploaded successfully.");
  });

  it("should show error when file exceeds size limit", () => {
    render(<ResumeSection hasResume={false} isUploading={false} isDeleting={false} onResumeUpload={onResumeUpload} onResumeDelete={onResumeDelete} />);

    const input = document.querySelector("input[type='file']");
    const oversizedFile = new File(["x".repeat(100)], "big.pdf", { type: "application/pdf" });
    Object.defineProperty(oversizedFile, "size", { value: (RESUME_MAX_MB + 1) * 1024 * 1024 });
    fireEvent.change(input, { target: { files: [oversizedFile] } });

    expect(screen.getByRole("alert")).toHaveTextContent(/mb or smaller/i);
    expect(onResumeUpload).not.toHaveBeenCalled();
  });
});
