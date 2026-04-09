/** Tests for CompanyLogo — logo image, fallback letter, and error handling. */

import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect } from "vitest";

import CompanyLogo from "./CompanyLogo";

describe("CompanyLogo", () => {
  it("should render img with correct clearbit src for valid domain", () => {
    render(<CompanyLogo company_domain="stripe.com" company="Stripe" size={32} />);

    const img = screen.getByTestId("company-logo-img");
    expect(img).toBeDefined();
    expect(img.getAttribute("src")).toContain("stripe.com");
    expect(img.getAttribute("loading")).toBe("lazy");
  });

  it("should render fallback letter when company_domain is null", () => {
    render(<CompanyLogo company_domain={null} company="Acme Corp" size={32} />);

    const fallback = screen.getByTestId("company-logo-fallback");
    expect(fallback).toBeDefined();
    expect(fallback.textContent).toBe("A");
  });

  it("should render fallback letter on img error", () => {
    render(<CompanyLogo company_domain="stripe.com" company="Stripe" size={32} />);

    const img = screen.getByTestId("company-logo-img");
    fireEvent.error(img);

    const fallback = screen.getByTestId("company-logo-fallback");
    expect(fallback).toBeDefined();
    expect(fallback.textContent).toBe("S");
  });

  it("should show correct first letter for company name", () => {
    render(<CompanyLogo company_domain={null} company="Google" size={24} />);

    const fallback = screen.getByTestId("company-logo-fallback");
    expect(fallback.textContent).toBe("G");
  });

  it("should handle empty company name gracefully", () => {
    render(<CompanyLogo company_domain={null} company="" size={24} />);

    const fallback = screen.getByTestId("company-logo-fallback");
    expect(fallback.textContent).toBe("?");
  });
});
