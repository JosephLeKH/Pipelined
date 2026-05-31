/** Tests for shortcuts.js: no duplicate keys, scope consistency. */

import { describe, it, expect } from "vitest";
import { SHORTCUTS, SHORTCUT_SCOPES, CHORD_DESTINATIONS } from "./shortcuts";

describe("shortcuts.js", () => {
  it("should have no duplicate keys", () => {
    const keys = SHORTCUTS.map((s) => s.key);
    const uniqueKeys = new Set(keys);
    expect(keys.length).toBe(uniqueKeys.size);
  });

  it("should have no duplicate labels with different scopes", () => {
    // Group by label and check that conflicts have proper scope differentiation
    const byLabel = {};
    SHORTCUTS.forEach((s) => {
      if (!byLabel[s.label]) byLabel[s.label] = [];
      byLabel[s.label].push(s.scope);
    });

    Object.entries(byLabel).forEach(([label, scopes]) => {
      // If the same label appears in multiple scopes, ensure scopes are different
      const uniqueScopes = new Set(scopes);
      expect(uniqueScopes.size).toBe(scopes.length);
    });
  });

  it("should only have 'a' in Dashboard scope, not global Actions", () => {
    const aShortcuts = SHORTCUTS.filter((s) => s.label === "a");
    expect(aShortcuts).toHaveLength(1);
    expect(aShortcuts[0].scope).toBe("Dashboard");
    expect(aShortcuts[0].key).toBe("a");
  });

  it("should have Escape in UI scope only", () => {
    const escapeShortcuts = SHORTCUTS.filter((s) => s.label === "Esc");
    expect(escapeShortcuts).toHaveLength(1);
    expect(escapeShortcuts[0].scope).toBe("UI");
    expect(escapeShortcuts[0].key).toBe("Escape");
  });

  it("should have valid scopes for all shortcuts", () => {
    const validScopes = new Set(SHORTCUT_SCOPES);
    SHORTCUTS.forEach((s) => {
      expect(validScopes.has(s.scope)).toBe(true);
    });
  });

  it("should have all CHORD_DESTINATIONS referenced in shortcuts", () => {
    const chordShortcuts = SHORTCUTS
      .filter((s) => s.key.startsWith("g "))
      .map((s) => s.key.split(" ")[1]);

    Object.keys(CHORD_DESTINATIONS).forEach((key) => {
      expect(chordShortcuts).toContain(key);
    });
  });
});
