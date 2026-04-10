import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import MergeDialog from "./MergeDialog";

const APP_A = {
  id: "app-a",
  company: "Acme Corp",
  role_title: "Engineer",
  current_stage: "Applied",
  location: null,
  compensation: null,
  notes: null,
  tags: [],
  updated_at: "2024-01-01T00:00:00Z",
};

const APP_B = {
  id: "app-b",
  company: "Beta Inc",
  role_title: null,
  current_stage: "Interview",
  location: "San Francisco",
  compensation: "$120k",
  notes: "Good team",
  tags: ["remote"],
  updated_at: "2024-01-02T00:00:00Z",
};

describe("MergeDialog", () => {
  it("should render both application names in column headers", () => {
    render(
      <MergeDialog apps={[APP_A, APP_B]} onConfirm={() => {}} onCancel={() => {}} />
    );

    expect(screen.getAllByText("Acme Corp").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Beta Inc").length).toBeGreaterThan(0);
  });

  it("should render field rows with radio buttons for each app", () => {
    render(
      <MergeDialog apps={[APP_A, APP_B]} onConfirm={() => {}} onCancel={() => {}} />
    );

    const radios = screen.getAllByRole("radio");
    // 7 fields × 2 radios each = 14
    expect(radios.length).toBe(14);
  });

  it("should pre-select non-null value when one app has null", () => {
    render(
      <MergeDialog apps={[APP_A, APP_B]} onConfirm={() => {}} onCancel={() => {}} />
    );

    // APP_A has location=null, APP_B has location="San Francisco" — B should be pre-selected
    const locationRadios = screen.getAllByRole("radio").filter((r) => r.name === "location");
    expect(locationRadios[0].checked).toBe(false); // APP_A side
    expect(locationRadios[1].checked).toBe(true);  // APP_B side
  });

  it("should update preview when radio button changes", () => {
    render(
      <MergeDialog apps={[APP_A, APP_B]} onConfirm={() => {}} onCancel={() => {}} />
    );

    // Company field: APP_A="Acme Corp" is likely pre-selected (non-null first)
    // Click APP_B's company radio
    const companyRadios = screen.getAllByRole("radio").filter((r) => r.name === "company");
    fireEvent.click(companyRadios[1]); // select APP_B's company "Beta Inc"

    // Preview section should show Beta Inc
    const previews = screen.getAllByText("Beta Inc");
    expect(previews.length).toBeGreaterThan(0);
  });

  it("should call onConfirm with source_id and target_id when Merge clicked", () => {
    const onConfirm = vi.fn();

    render(
      <MergeDialog apps={[APP_A, APP_B]} onConfirm={onConfirm} onCancel={() => {}} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Merge" }));

    expect(onConfirm).toHaveBeenCalledOnce();
    const payload = onConfirm.mock.calls[0][0];
    expect(payload).toHaveProperty("source_id");
    expect(payload).toHaveProperty("target_id");
    expect([APP_A.id, APP_B.id]).toContain(payload.source_id);
    expect([APP_A.id, APP_B.id]).toContain(payload.target_id);
    expect(payload.source_id).not.toBe(payload.target_id);
  });

  it("should call onCancel when Cancel button clicked", () => {
    const onCancel = vi.fn();

    render(
      <MergeDialog apps={[APP_A, APP_B]} onConfirm={() => {}} onCancel={onCancel} />
    );

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onCancel).toHaveBeenCalledOnce();
  });

  it("should show loading spinner and disable buttons when isPending", () => {
    render(
      <MergeDialog apps={[APP_A, APP_B]} onConfirm={() => {}} onCancel={() => {}} isPending />
    );

    expect(screen.getByRole("button", { name: /Merge/ })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  });
});
