/** Tests for Sidebar — nav items, Co-pilot placement, sublabels. */

import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, vi } from "vitest";

import Sidebar from "./Sidebar";
import { AuthProvider } from "../../context/AuthContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { withTooltipProvider } from "../../test/testProviders";

const mockOnOpenCopilot = vi.fn();

function makeWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        <AuthProvider>{withTooltipProvider(children)}</AuthProvider>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Sidebar", () => {
  it("should render Today with sublabel 'Daily focus'", () => {
    render(<Sidebar collapsed={false} onOpenCopilot={mockOnOpenCopilot} />, {
      wrapper: makeWrapper(),
    });
    const todayLabel = screen.getByText("Today");
    const sublabel = screen.getByText("Daily focus");
    expect(todayLabel).toBeInTheDocument();
    expect(sublabel).toBeInTheDocument();
  });

  it("should render Pipeline (not Dashboard) with sublabel 'All applications'", () => {
    render(<Sidebar collapsed={false} onOpenCopilot={mockOnOpenCopilot} />, {
      wrapper: makeWrapper(),
    });
    const pipelineLabel = screen.getByText("Pipeline");
    const sublabel = screen.getByText("All applications");
    expect(pipelineLabel).toBeInTheDocument();
    expect(sublabel).toBeInTheDocument();
  });

  it("should render Co-pilot in the Workspace group (before Settings)", () => {
    render(<Sidebar collapsed={false} onOpenCopilot={mockOnOpenCopilot} />, {
      wrapper: makeWrapper(),
    });
    const copilotButton = screen.getByRole("button", { name: /Co-pilot/i });
    const settingsLink = screen.getByRole("link", { name: /Settings/i });

    // Co-pilot should come before Settings in the DOM
    expect(copilotButton.compareDocumentPosition(settingsLink)).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it("should call onOpenCopilot when Co-pilot is clicked", async () => {
    const { container } = render(
      <Sidebar collapsed={false} onOpenCopilot={mockOnOpenCopilot} />,
      { wrapper: makeWrapper() }
    );
    const copilotButton = screen.getByRole("button", { name: /Co-pilot/i });
    copilotButton.click();
    expect(mockOnOpenCopilot).toHaveBeenCalled();
  });

  it("should show only icon when collapsed", () => {
    render(<Sidebar collapsed={true} onOpenCopilot={mockOnOpenCopilot} />, {
      wrapper: makeWrapper(),
    });
    expect(screen.queryByText("Today")).not.toBeInTheDocument();
    expect(screen.queryByText("Daily focus")).not.toBeInTheDocument();
  });
});
