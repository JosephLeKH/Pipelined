import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { EditableCell } from "./OfferEditableCell";

describe("EditableCell", () => {
  it("should use 28px tall input in edit mode", () => {
    render(
      <EditableCell
        appId="app1"
        fieldKey="base_salary"
        fieldType="currency"
        value={120000}
        offerDetails={{ base_salary: 120000 }}
        onSave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "$120,000" }));

    expect(screen.getByRole("textbox")).toHaveClass("h-7");
  });
});
