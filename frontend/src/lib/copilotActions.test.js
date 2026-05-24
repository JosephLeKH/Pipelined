import { describe, it, expect, vi } from "vitest";

import {
  executeCopilotAction,
  parseCopilotActions,
  stripCopilotActionBlocks,
} from "./copilotActions";

describe("copilotActions", () => {
  it("should parse open_app and ignore send/apply actions", () => {
    const text = 'Try Today {"action":"open_app","path":"/today","label":"Today"} {"action":"apply","id":"123"}';

    const actions = parseCopilotActions(text);

    expect(actions).toEqual([{ action: "open_app", path: "/today", label: "Today" }]);
    expect(stripCopilotActionBlocks(text)).toBe("Try Today");
  });

  it("should navigate only for open_app", () => {
    const navigate = vi.fn();

    expect(executeCopilotAction({ action: "open_app", path: "/dashboard" }, navigate)).toBe(true);
    expect(navigate).toHaveBeenCalledWith("/dashboard");

    expect(executeCopilotAction({ action: "send_email" }, navigate)).toBe(false);
    expect(executeCopilotAction({ action: "apply" }, navigate)).toBe(false);
  });
});
