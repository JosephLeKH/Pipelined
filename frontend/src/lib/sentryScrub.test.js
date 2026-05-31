/**
 * Tests for Sentry PII scrubbing
 */

import { describe, it, expect } from "vitest";
import { scrubPii } from "./sentryScrub";

describe("sentryScrub", () => {
  it("should mask user email", () => {
    const event = { user: { email: "john@example.com", id: "user123" } };
    const result = scrubPii(event);

    expect(result.user.email).toBe("***@***.***");
    expect(result.user.id).toBe("user123");
  });

  it("should mask email in extra context", () => {
    const event = { extra: { email: "jane@example.com", action: "signup" } };
    const result = scrubPii(event);

    expect(result.extra.email).toBe("***@***.***");
    expect(result.extra.action).toBe("signup");
  });

  it("should mask company name in extra context", () => {
    const event = { extra: { company: "Acme Corp" } };
    const result = scrubPii(event);

    expect(result.extra.company).toBe("***REDACTED***");
  });

  it("should mask email in request URL", () => {
    const event = {
      request: { url: "https://example.com/apply?email=alice@example.com" },
    };
    const result = scrubPii(event);

    expect(result.request.url).toContain("***@***.***");
    expect(result.request.url).not.toContain("alice@example.com");
  });

  it("should mask email in message", () => {
    const event = { message: "User bob@example.com failed login" };
    const result = scrubPii(event);

    expect(result.message).toContain("***@***.***");
    expect(result.message).not.toContain("bob@example.com");
  });

  it("should mask emails in breadcrumbs", () => {
    const event = {
      breadcrumbs: [
        {
          message: "User charlie@example.com submitted form",
          data: { email: "dave@example.com", status: "pending" },
        },
      ],
    };
    const result = scrubPii(event);

    expect(result.breadcrumbs[0].message).not.toContain("charlie@example.com");
    expect(result.breadcrumbs[0].data.email).toBe("***@***.***");
    expect(result.breadcrumbs[0].data.status).toBe("pending");
  });

  it("should preserve unrelated fields", () => {
    const event = {
      level: "error",
      logger: "app.service",
      timestamp: 1234567890,
      extra: { trace_id: "abc123" },
    };
    const result = scrubPii(event);

    expect(result.level).toBe("error");
    expect(result.logger).toBe("app.service");
    expect(result.timestamp).toBe(1234567890);
    expect(result.extra.trace_id).toBe("abc123");
  });

  it("should handle null event", () => {
    const result = scrubPii(null);
    expect(result).toBeNull();
  });

  it("should handle undefined event", () => {
    const result = scrubPii(undefined);
    expect(result).toBeUndefined();
  });

  it("should mask multiple emails", () => {
    const event = {
      message: "emails: alice@example.com, bob@example.com, charlie@test.com",
    };
    const result = scrubPii(event);

    expect(result.message).toContain("***@***.***");
    expect(result.message).not.toContain("@example.com");
    expect(result.message).not.toContain("@test.com");
  });
});
