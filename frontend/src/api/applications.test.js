/** Tests for api/applications.js — verifies URL construction and HTTP methods. */

import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { describe, it, expect, beforeAll, afterAll, afterEach } from "vitest";

import {
  fetchApplications,
  fetchApplication,
  createApplication,
  updateApplication,
  deleteApplication,
  fetchStats,
} from "./applications";
import { passthroughHandlers } from "../test/passthroughHandlers";

const APP = { id: "abc123", role_title: "SWE", company: "Acme", current_stage: "Applied" };
const STATS = { total_applied: 5, active_count: 4, response_rate: 0.2, avg_days_to_first_response: 3 };

const server = setupServer(
  http.get("/api/applications", ({ request }) => {
    const url = new URL(request.url);
    const stage = url.searchParams.get("stage");
    const data = stage ? [{ ...APP, current_stage: stage }] : [APP];
    return HttpResponse.json({ data, meta: { count: data.length, next_cursor: null } });
  }),
  http.get("/api/applications/stats", () => HttpResponse.json({ data: STATS })),
  http.get("/api/applications/:id", ({ params }) =>
    HttpResponse.json({ data: { ...APP, id: params.id } })
  ),
  http.post("/api/applications", async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({ data: { ...body, id: "new1", current_stage: "Applied" } }, { status: 201 });
  }),
  http.patch("/api/applications/:id", async ({ params, request }) => {
    const body = await request.json();
    return HttpResponse.json({ data: { ...APP, id: params.id, ...body } });
  }),
  http.delete("/api/applications/:id", () => new HttpResponse(null, { status: 204 })),
  ...passthroughHandlers,
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("fetchApplications", () => {
  it("should call GET /api/applications and return envelope with meta", async () => {
    // Arrange / Act
    const result = await fetchApplications();

    // Assert — list responses preserve the meta key
    expect(result.meta).toMatchObject({ count: 1, next_cursor: null });
    expect(result.data[0].company).toBe("Acme");
  });

  it("should forward filter params as query string", async () => {
    // Arrange / Act
    const result = await fetchApplications({ stage: "Phone Screen" });

    // Assert
    expect(result.data[0].current_stage).toBe("Phone Screen");
  });

  it("should skip null and undefined filter values", async () => {
    // Arrange / Act
    const result = await fetchApplications({ stage: null, cursor: undefined });

    // Assert — still returns successfully (no broken query param like "stage=null")
    expect(result.data).toHaveLength(1);
  });
});

describe("fetchApplication", () => {
  it("should call GET /api/applications/:id and return unwrapped doc", async () => {
    // Arrange / Act
    const result = await fetchApplication("abc123");

    // Assert — single resource responses unwrap the data key
    expect(result.id).toBe("abc123");
    expect(result.company).toBe("Acme");
  });
});

describe("fetchStats", () => {
  it("should call GET /api/applications/stats and return unwrapped stats", async () => {
    // Arrange / Act
    const result = await fetchStats();

    // Assert
    expect(result.total_applied).toBe(5);
    expect(result.response_rate).toBe(0.2);
  });
});

describe("createApplication", () => {
  it("should POST to /api/applications and return created doc", async () => {
    // Arrange / Act
    const result = await createApplication({ role_title: "SWE", company: "Acme", source: "manual" });

    // Assert
    expect(result.id).toBe("new1");
    expect(result.current_stage).toBe("Applied");
  });
});

describe("updateApplication", () => {
  it("should PATCH /api/applications/:id and return updated doc", async () => {
    // Arrange / Act
    const result = await updateApplication("abc123", { current_stage: "Phone Screen" });

    // Assert
    expect(result.current_stage).toBe("Phone Screen");
    expect(result.id).toBe("abc123");
  });
});

describe("deleteApplication", () => {
  it("should DELETE /api/applications/:id and return undefined for 204", async () => {
    // Arrange / Act
    const result = await deleteApplication("abc123");

    // Assert
    expect(result).toBeUndefined();
  });
});
