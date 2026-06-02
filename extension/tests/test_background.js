/**
 * Background service worker tests — save queue recovery.
 * Uses a manual chrome mock; sets up globals before dynamic import so the
 * module's top-level chrome.runtime.onMessage.addListener() does not throw.
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from "@jest/globals";

const TOKEN_KEY = "pipelined_auth_token";

let handleSave;
let fetchFitScoreInBackground;
let onInstalledListener;
let onMessageListener;

beforeAll(async () => {
  global.chrome = {
    runtime: {
      id: "pipelined-test-id",
      onMessage: { addListener: jest.fn() },
      onInstalled: { addListener: jest.fn() },
    },
    storage: {
      session: {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
      },
      local: {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
      },
    },
  };
  global.fetch = jest.fn();

  const mod = await import("../background/background.js");
  handleSave = mod.handleSave;
  fetchFitScoreInBackground = mod.fetchFitScoreInBackground;
  onMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0]?.[0];
  onInstalledListener = chrome.runtime.onInstalled.addListener.mock.calls[0]?.[0];
});

beforeEach(() => {
  jest.clearAllMocks();
  // Restore default resolved values after clearAllMocks wipes implementations.
  chrome.storage.session.get.mockResolvedValue({ [TOKEN_KEY]: "test-token" });
  chrome.storage.session.set.mockResolvedValue(undefined);
  chrome.storage.session.remove.mockResolvedValue(undefined);
  chrome.storage.local.get.mockResolvedValue({ recent_saves: [] });
  chrome.storage.local.set.mockResolvedValue(undefined);
});

const BASE_PAYLOAD = {
  fields: { role_title: "SWE", company_name: "Stripe" },
  boardId: "linkedin",
  pageText: null,
  sourceUrl: "https://www.linkedin.com/jobs/view/1",
};

const SUCCESS_FETCH_RESPONSE = {
  ok: true,
  status: 201,
  json: () => Promise.resolve({ data: { company: "Stripe", role_title: "SWE" } }),
};

// ── Queue recovery ────────────────────────────────────────────────────────────

describe("handleSave() queue recovery", () => {
  it("should execute the next queued save when the first save throws", async () => {
    fetch
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValueOnce(SUCCESS_FETCH_RESPONSE);

    jest.spyOn(console, "error").mockImplementation(() => {});

    const r1 = handleSave({ ...BASE_PAYLOAD });
    const r2 = handleSave({ ...BASE_PAYLOAD });

    const [result1, result2] = await Promise.all([r1, r2]);

    expect(result1.status).toBe("error");
    expect(result2.status).toBe("success");
    expect(fetch).toHaveBeenCalledTimes(2);

    console.error.mockRestore();
  });

  it("should log to console.error when executeSave throws", async () => {
    const networkError = new Error("Network error");
    fetch.mockRejectedValueOnce(networkError);

    const errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    await handleSave({ ...BASE_PAYLOAD });

    expect(errorSpy).toHaveBeenCalledWith("Save failed:", networkError);

    errorSpy.mockRestore();
  });

  it("should return error status with message when executeSave throws", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    const result = await handleSave({ ...BASE_PAYLOAD });

    expect(result.status).toBe("error");
    expect(result.message).toContain("Save failed");

    console.error.mockRestore();
  });

  it("should not cache a recent save on failure", async () => {
    fetch.mockRejectedValueOnce(new Error("Network error"));
    jest.spyOn(console, "error").mockImplementation(() => {});

    await handleSave({ ...BASE_PAYLOAD });

    expect(chrome.storage.local.set).not.toHaveBeenCalled();

    console.error.mockRestore();
  });

  it("should cache talking points from apply_pack on successful save", async () => {
    fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          data: {
            id: "app123",
            company: "Stripe",
            role_title: "SWE",
            current_stage: "Applied",
            apply_pack: { talking_points: ["Payments experience", "Python backend"] },
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { score: null, reason: null } }),
      });

    const result = await handleSave({ ...BASE_PAYLOAD });

    expect(result.status).toBe("success");
    expect(chrome.storage.local.set).toHaveBeenCalledWith({
      recent_saves: [{
        id: "app123",
        company: "Stripe",
        role_title: "SWE",
        stage: "Applied",
        date_applied: undefined,
        talking_points: ["Payments experience", "Python backend"],
        fit_score: null,
      }],
    });
  });

  it("should fetch fit score in background after successful save", async () => {
    const cachedSave = {
      id: "app456",
      company: "Meta",
      role_title: "SWE",
      stage: "Applied",
      date_applied: undefined,
      talking_points: [],
      fit_score: null,
    };
    chrome.storage.local.get.mockImplementation(async () => ({ recent_saves: [cachedSave] }));

    fetch
      .mockResolvedValueOnce({
        ok: true,
        status: 201,
        json: () => Promise.resolve({
          data: { id: "app456", company: "Meta", role_title: "SWE", current_stage: "Applied" },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ data: { score: 82, reason: "Strong match" } }),
      });

    await handleSave({ ...BASE_PAYLOAD });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][0]).toContain("/api/applications/app456/fit-score");
    expect(chrome.storage.local.set).toHaveBeenLastCalledWith({
      recent_saves: [{ ...cachedSave, fit_score: 82 }],
    });
  });
});

// ── Auth bootstrap ────────────────────────────────────────────────────────────

describe("auth bootstrap", () => {
  it("refreshes the token when chrome.runtime.onInstalled fires", async () => {
    chrome.storage.session.get.mockResolvedValue({});  // no cached token
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ data: { token: "boot-token", display_name: "Joseph" } }),
    });

    expect(onInstalledListener).toBeDefined();
    await onInstalledListener({ reason: "install" });

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/extension-token"),
      expect.objectContaining({ credentials: "include" }),
    );
    expect(chrome.storage.session.set).toHaveBeenCalledWith({
      pipelined_auth_token: "boot-token",
    });
  });

  it("triggers refresh when GET_AUTH_STATUS has no cached token", async () => {
    chrome.storage.session.get.mockResolvedValueOnce({});  // first call (cache miss)
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({ data: { token: "lazy-token", display_name: "Joseph" } }),
    });
    // After refresh succeeds, the second read returns the token
    chrome.storage.session.get.mockResolvedValueOnce({
      pipelined_auth_token: "lazy-token",
    });
    chrome.storage.local.get.mockResolvedValueOnce({ display_name: "Joseph" });

    expect(onMessageListener).toBeDefined();
    const sendResponse = jest.fn();
    const kept = onMessageListener(
      { type: "GET_AUTH_STATUS" },
      { id: "pipelined-test-id" },
      sendResponse,
    );
    expect(kept).toBe(true);
    // Let the async promise chain settle
    await new Promise((r) => setTimeout(r, 0));
    await new Promise((r) => setTimeout(r, 0));

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining("/api/auth/extension-token"),
      expect.anything(),
    );
    expect(sendResponse).toHaveBeenCalledWith(
      expect.objectContaining({ authenticated: true, display_name: "Joseph" }),
    );
  });
});

// ── cacheRecentSave extended fields ──────────────────────────────────────────

describe("cacheRecentSave extended fields", () => {
  it("persists updated_at, apply_pack_ready, interview_prep_ready, viewed_at", async () => {
    chrome.storage.session.get.mockResolvedValue({ pipelined_auth_token: "tkn" });
    chrome.storage.local.get.mockResolvedValue({ recent_saves: [] });

    fetch.mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: () => Promise.resolve({
        data: {
          id: "app-1",
          company: "Acme",
          role_title: "SWE",
          current_stage: "Applied",
          date_applied: "2026-06-02T00:00:00Z",
          updated_at: "2026-06-02T00:00:00Z",
          apply_pack: { talking_points: ["a"] },
          interview_prep_briefing: null,
          viewed_at: null,
        },
      }),
    });

    await handleSave({
      fields: { role_title: "SWE", company_name: "Acme" },
      boardId: "linkedin",
      pageText: null,
      jobDescription: null,
      sourceUrl: "https://linkedin.com/jobs/view/1",
    });

    const setCalls = chrome.storage.local.set.mock.calls;
    const recentSavesCall = setCalls.find((c) => c[0]?.recent_saves);
    expect(recentSavesCall).toBeDefined();
    expect(recentSavesCall[0].recent_saves[0]).toMatchObject({
      id: "app-1",
      updated_at: "2026-06-02T00:00:00Z",
      apply_pack_ready: true,
      interview_prep_ready: false,
      viewed_at: null,
    });
  });
});
