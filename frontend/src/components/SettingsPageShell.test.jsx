import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import SettingsPageShell from "./SettingsPageShell";

describe("SettingsPageShell", () => {
  it("should render title and subtitle", () => {
    render(
      <SettingsPageShell title="Profile" subtitle="Update your profile.">
        <p>Fields</p>
      </SettingsPageShell>,
    );

    expect(screen.getByRole("heading", { name: "Profile" })).toBeInTheDocument();
    expect(screen.getByText("Update your profile.")).toBeInTheDocument();
    expect(screen.getByText("Fields")).toBeInTheDocument();
  });

  it("should hide save footer when form is clean", () => {
    render(
      <SettingsPageShell
        title="Profile"
        dirty={false}
        onSave={vi.fn()}
        onCancel={vi.fn()}
      >
        <p>Fields</p>
      </SettingsPageShell>,
    );

    expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
  });

  it("should show save footer when form is dirty", () => {
    render(
      <SettingsPageShell
        title="Profile"
        dirty
        onSave={vi.fn()}
        onCancel={vi.fn()}
      >
        <p>Fields</p>
      </SettingsPageShell>,
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
  });

  it("should call onSave when Save is clicked", () => {
    const onSave = vi.fn();
    render(
      <SettingsPageShell title="Profile" dirty onSave={onSave} onCancel={vi.fn()}>
        <p>Fields</p>
      </SettingsPageShell>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(onSave).toHaveBeenCalledOnce();
  });

  it("should show Saved microcopy after successful save ack", () => {
    render(
      <SettingsPageShell
        title="Profile"
        dirty={false}
        savedAck
        onSave={vi.fn()}
        onCancel={vi.fn()}
      >
        <p>Fields</p>
      </SettingsPageShell>,
    );

    expect(screen.getByText("Saved")).toBeInTheDocument();
  });

  it("should disable Save while saving", () => {
    render(
      <SettingsPageShell
        title="Profile"
        dirty
        isSaving
        onSave={vi.fn()}
        onCancel={vi.fn()}
      >
        <p>Fields</p>
      </SettingsPageShell>,
    );

    expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  });
});
