/**
 * Background service worker tests — save queue recovery.
 * Uses a manual chrome mock; sets up globals before dynamic import so the
 * module's top-level chrome.runtime.onMessage.addListener() does not throw.
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from "@jest/globals";

const TOKEN_KEY = "pipelined_auth_token";

let handleSave;

beforeAll(async () => {
  global.chrome = {
    runtime: { onMessage: { addListener: jest.fn() } },
    storage: {
      session: {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue(undefined),
        remove: jest.fn().mockResolvedValue(undefined),
      },
      local: {
        get: jest.fn(),
        set: jest.fn().mockResolvedValue(undefined),
      },
    },
  };
  global.fetch = jest.fn();

  const mod = await import("../background/background.js");
  handleSave = mod.handleSave;
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
});
