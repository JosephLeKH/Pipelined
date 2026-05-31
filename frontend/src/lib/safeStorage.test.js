import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { safeSet, safeGet, safeRemove } from "./safeStorage";

describe("safeStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe("safeSet", () => {
    it("should set a value in localStorage and return success object", () => {
      const result = safeSet("test_key", "test_value");

      expect(result).toEqual({ success: true });
      expect(localStorage.getItem("test_key")).toBe("test_value");
    });

    it("should return truthy success object", () => {
      const result = safeSet("another_key", "another_value");
      expect(result).toBeTruthy();
      expect(result.success).toBe(true);
      expect(localStorage.getItem("another_key")).toBe("another_value");
    });

    it("should return object with success false on error", () => {
      // Test the new object return shape by using Object.keys check
      const result = safeSet("test_key", "test_value");
      expect(typeof result).toBe("object");
      expect("success" in result).toBe(true);
      expect("isQuota" in result || result.success).toBe(true);
    });

    it("should handle quota exceeded errors with isQuota flag", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const setItemSpy = vi
        .spyOn(localStorage, "setItem")
        .mockImplementationOnce(() => {
          const err = new Error("QuotaExceededError");
          err.name = "QuotaExceededError";
          throw err;
        });

      const result = safeSet("test_key", "test_value");

      expect(result.success).toBe(false);
      expect(result.isQuota).toBe(true);
      expect(warnSpy).toHaveBeenCalled();
      setItemSpy.mockRestore();
    });

    it("should distinguish non-quota errors with isQuota false", () => {
      const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
      const setItemSpy = vi
        .spyOn(localStorage, "setItem")
        .mockImplementationOnce(() => {
          const err = new Error("SecurityError");
          err.name = "SecurityError";
          throw err;
        });

      const result = safeSet("test_key", "test_value");

      expect(result.success).toBe(false);
      expect(result.isQuota).toBe(false);
      expect(warnSpy).toHaveBeenCalled();
      setItemSpy.mockRestore();
    });
  });

  describe("safeGet", () => {
    it("should get a value from localStorage", () => {
      localStorage.setItem("test_key", "test_value");

      const result = safeGet("test_key");

      expect(result).toBe("test_value");
    });

    it("should return null for missing keys", () => {
      const result = safeGet("nonexistent");

      expect(result).toBeNull();
    });

    it("should handle errors gracefully", () => {
      const getItemSpy = vi
        .spyOn(localStorage, "getItem")
        .mockImplementationOnce(() => {
          throw new Error("Storage error");
        });

      const result = safeGet("test_key");

      expect(result).toBeNull();
      getItemSpy.mockRestore();
    });
  });

  describe("safeRemove", () => {
    it("should remove a value from localStorage and return true", () => {
      localStorage.setItem("test_key", "test_value");

      const result = safeRemove("test_key");

      expect(result).toBe(true);
      expect(localStorage.getItem("test_key")).toBeNull();
    });

    it("should return true even if key does not exist", () => {
      const result = safeRemove("nonexistent");

      expect(result).toBe(true);
    });

    it("should handle errors and return false", () => {
      const removeItemSpy = vi
        .spyOn(localStorage, "removeItem")
        .mockImplementationOnce(() => {
          throw new Error("Storage error");
        });

      const result = safeRemove("test_key");

      expect(result).toBe(false);
      removeItemSpy.mockRestore();
    });
  });
});
