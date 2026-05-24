/** Tests for AiSection shared AI card shell. */

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";

import AiSection from "./AiSection";

describe("AiSection", () => {
  it("should render title, icon header, and children with brand left border", () => {
    render(
      <AiSection title="Resume Insights" icon={Sparkles} id="resume-insights">
        <p>Section body</p>
      </AiSection>
    );

    expect(screen.getByRole("region", { name: "Resume Insights" })).toHaveClass("border-l-4", "border-brand-500");
    expect(screen.getByText("Section body")).toBeInTheDocument();
  });
});
