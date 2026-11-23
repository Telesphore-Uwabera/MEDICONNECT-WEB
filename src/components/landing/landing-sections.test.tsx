import "@/lib/i18n";
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import i18n from "@/lib/i18n";
import HowItWorks from "./HowItWorks";
import LandingFaq from "./LandingFaq";
import ServicesShowcase from "./ServicesShowcase";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/hooks/use-services", () => ({
  useGetPublicServices: () => ({ data: { data: [] }, isLoading: false }),
}));

class FakeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() { return []; }
}

describe("landing sections", () => {
  it("renders the how-it-works steps and the FAQ in English", async () => {
    vi.stubGlobal("IntersectionObserver", FakeObserver);
    await i18n.changeLanguage("en");
    render(
      <MemoryRouter>
        <HowItWorks />
        <LandingFaq />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: "Healthcare in 3 Simple Steps" })).toBeInTheDocument();
    expect(screen.getByText("Create Your Account")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Frequently Asked Questions" })).toBeInTheDocument();
    expect(screen.getByText("How much is a consultation?")).toBeInTheDocument();
  });

  it("hides the services section when the API returns nothing", () => {
    render(
      <MemoryRouter>
        <ServicesShowcase />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("heading", { name: "Everything you need in one place" })).not.toBeInTheDocument();
    expect(document.getElementById("services")).toBeNull();
  });
});
