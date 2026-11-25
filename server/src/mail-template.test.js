import { describe, expect, it } from "vitest";
import { buildEmailHtml, buildOtpEmail, buildWelcomeEmail } from "./mail.js";

describe("email templates", () => {
  it("uses the correct support phone number in every email shell", () => {
    const html = buildEmailHtml({ title: "Test", body: "<p>Hello</p>" });
    expect(html).toContain("+250 792 353 501");
    expect(html).not.toContain("+250 792 363 601");
    expect(html).toContain("MediConnect");
  });

  it("explains the patient flow without telling them to fill a form before an instant consult", () => {
    const html = buildWelcomeEmail({ name: "Test Patient", role: "patient", lang: "en" });
    expect(html).toContain("instant consultation right away");
    expect(html).toContain("after payment");
    expect(html).not.toContain("before you book or start a consultation");
  });

  it("renders the one-time code and expiry", () => {
    const html = buildOtpEmail({ code: "123456", type: "password_reset", lang: "en" });
    expect(html).toContain("123456");
    expect(html).toContain("10 minutes");
  });
});
