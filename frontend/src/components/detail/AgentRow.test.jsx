/** Tests for AgentRow: header renders, state pill reflects state, expand toggles body. */

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, it, expect } from "vitest";
import Sparkles from "lucide-react/dist/esm/icons/sparkles";

import AgentRow from "./AgentRow";
import { AGENT_STATE } from "./useAgentStates";

function renderRow(props = {}) {
  return render(
    <ul>
      <AgentRow
        rowId="test-row"
        icon={Sparkles}
        title="Test Agent"
        state={AGENT_STATE.IDLE}
        summary="Does a thing"
        {...props}
      >
        <p>Body content</p>
      </AgentRow>
    </ul>
  );
}

describe("AgentRow", () => {
  it("renders the title, summary, and state pill", () => {
    renderRow();
    expect(screen.getByText("Test Agent")).toBeInTheDocument();
    expect(screen.getByText("Does a thing")).toBeInTheDocument();
    expect(screen.getByLabelText("Status: Idle")).toBeInTheDocument();
  });

  it("hides body content by default and reveals it on click", async () => {
    const user = userEvent.setup();
    renderRow();

    expect(screen.queryByText("Body content")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /Test Agent/i }));
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("renders body content when defaultExpanded is true", () => {
    renderRow({ defaultExpanded: true });
    expect(screen.getByText("Body content")).toBeInTheDocument();
  });

  it("reflects Running state with the running pill label", () => {
    renderRow({ state: AGENT_STATE.RUNNING });
    expect(screen.getByLabelText("Status: Running")).toBeInTheDocument();
  });

  it("reflects Ready state with the ready pill label", () => {
    renderRow({ state: AGENT_STATE.READY });
    expect(screen.getByLabelText("Status: Ready")).toBeInTheDocument();
  });
});
