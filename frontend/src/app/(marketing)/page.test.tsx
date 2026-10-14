import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import LandingPage from "./page";

describe("LandingPage", () => {
  it("renders the value proposition heading", () => {
    render(<LandingPage />);
    expect(
      screen.getByRole("heading", {
        level: 1,
        name: /find a co-parent and co-habitation partner/i,
      }),
    ).toBeInTheDocument();
  });

  it("summarises how it works", () => {
    render(<LandingPage />);
    expect(screen.getByRole("heading", { name: /how it works/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /join the waitlist/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /build your profile/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /match and meet/i })).toBeInTheDocument();
  });

  it("starts the waitlist workflow from every call to action", () => {
    render(<LandingPage />);
    const links = screen.getAllByRole("link", { name: /join the waitlist/i });
    expect(links.length).toBeGreaterThanOrEqual(2);
    for (const link of links) {
      expect(link).toHaveAttribute("href", "/register");
    }
  });

  it("does not expose any protected app routes", () => {
    render(<LandingPage />);
    const hrefs = screen
      .getAllByRole("link")
      .map((link) => link.getAttribute("href"))
      .filter(Boolean);
    for (const href of hrefs) {
      expect(href).toBe("/register");
    }
  });
});
