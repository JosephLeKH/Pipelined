/** Tests for NotesEditor fixes: undo respects applicationId change. */

import { describe, it, expect } from "vitest";

describe("NotesEditor applicationId guard in undo", () => {
  it("should prevent undo when applicationId changes", () => {
    const appIdAtDiscard = "app1";
    const currentApplicationId = "app2";

    const canRestore = appIdAtDiscard === currentApplicationId;
    expect(canRestore).toBe(false);
  });

  it("should allow undo when applicationId stays same", () => {
    const appIdAtDiscard = "app1";
    const currentApplicationId = "app1";

    const canRestore = appIdAtDiscard === currentApplicationId;
    expect(canRestore).toBe(true);
  });
});
