import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import PublicTimeline from "./PublicTimeline";

vi.mock("../lib/analytics", () => ({ trackEvent: vi.fn() }));

const TEST_SLUG = "abc123def456";
const TIMELINE_DATA = {
  display_name: "Jane Doe",
  applications: [
    {
      id: "app1",
      role_title: "Software Engineer",
      company: "Acme Corp",
      current_stage: "Interview",
      date_applied: "2025-03-01",
      stage_history: [{ stage: "Applied" }, { stage: "Interview" }],
    },
  ],
};

const server = setupServer(
  http.get(`/api/public/timeline/${TEST_SLUG}`, () =>
    HttpResponse.json({ data: TIMELINE_DATA })
  )
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

function renderTimeline(slug = TEST_SLUG) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/shared/timeline/${slug}`]}>
        <Routes>
          <Route path="/shared/timeline/:slug" element={<PublicTimeline />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("PublicTimeline", () => {
  it("should render marketing chrome and metadata after load", async () => {
    renderTimeline();

    expect(await screen.findByText(/jane doe · job search timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/1 applications/)).toBeInTheDocument();
    expect(screen.getByText(/1 interviews/)).toBeInTheDocument();
    expect(screen.getAllByText("Pipelined").length).toBeGreaterThan(0);
    expect(screen.getByText(/built by a stanford cs student/i)).toBeInTheDocument();
  });

  it("should render application rows in read-only timeline", async () => {
    renderTimeline();

    expect(await screen.findByText("Acme Corp")).toBeInTheDocument();
    expect(screen.getByText("Software Engineer")).toBeInTheDocument();
  });

  it("should show not-found state for invalid slug", async () => {
    server.use(
      http.get("/api/public/timeline/bad-slug", () =>
        HttpResponse.json({ error: { code: "SHARE_NOT_FOUND" } }, { status: 404 })
      )
    );

    renderTimeline("bad-slug");

    expect(await screen.findByText("Link not found")).toBeInTheDocument();
  });

  it("should render the Cardinal CTA link to register", async () => {
    renderTimeline();

    await screen.findByText(/jane doe · job search timeline/i);

    expect(screen.getByRole("link", { name: /track yours/i })).toHaveAttribute("href", "/register");
  });
});
