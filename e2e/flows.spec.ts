import { expect, test, type Page, type Route } from "@playwright/test";

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function install(page: Page, role: string) {
  const user = {
    id: role === "doctor" ? 31 : role === "admin" ? 1 : role === "hospital" ? 10 : role === "pharmacy" ? 6 : 9,
    name: role === "patient" ? "Keza Uwase" : "Staff User",
    email: "keza@example.com",
    phone: "788111222",
    country_code: "+250",
    role,
    active_role: role,
    available_roles: [role],
    is_verified: true,
    status: "active",
    preferred_language: "en",
    profile_complete: true,
  };
  await page.addInitScript(() => {
    localStorage.setItem("auth_token", "flow-token");
    localStorage.setItem("lang", "en");
  });
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.includes("mediconnect.rw") || url.includes("10.10.141.149")) {
      await route.abort();
      return;
    }
    if (!url.includes("/api/v1/")) {
      await route.continue();
      return;
    }
    const path = new URL(url).pathname;
    if (path.endsWith("/auth/me")) {
      await json(route, { user });
      return;
    }
    if (path.includes("/public/settings")) {
      await json(route, { settings: { general: { app_name: "MediConnect", supported_languages: ["en", "fr", "rw"], default_language: "en" } } });
      return;
    }
    if (path.includes("/patient/appointments") && route.request().method() === "GET") {
      await json(route, {
        data: [{
          id: 77,
          status: "confirmed",
          appointment_date: "2026-11-12",
          appointment_time: "15:00:00",
          can_join: true,
          doctor: { user: { name: "Aline Mukamana" } },
        }],
      });
      return;
    }
    if (path.endsWith("/patient/appointments/77/join")) {
      await json(route, { token: Buffer.from(JSON.stringify({ room: "appointment-77", username: "Keza", is_owner: false, ice_servers: [] })).toString("base64"), room_name: "appointment-77" });
      return;
    }
    if (path.endsWith("/profile")) {
      await json(route, { status: "approved", doctor: { status: "approved" }, hospital: { status: "approved" }, pharmacy: { status: "approved" }, data: { status: "approved" } });
      return;
    }
    if (path.includes("/patient/profile")) {
      await json(route, { patient: { id: 4, name: "Keza Uwase", city: "Kigali", country: "Rwanda" } });
      return;
    }
    await json(route, { data: [] });
  });
}

test("a missing page offers a way back to care", async ({ page }) => {
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.includes("mediconnect.rw")) {
      await route.abort();
      return;
    }
    if (url.includes("/api/v1/")) {
      await json(route, { settings: { general: { app_name: "MediConnect", supported_languages: ["en", "fr", "rw"] } } });
      return;
    }
    await route.continue();
  });
  await page.goto("/this-page-is-missing");
  await expect(page.getByRole("heading", { name: /not on MediConnect/i })).toBeVisible();
  await expect(page.getByRole("link", { name: "Find a doctor" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Get help" })).toBeVisible();
});

test("the patient dashboard shows the next visit and the missing profile fields", async ({ page }) => {
  await install(page, "patient");
  await page.goto("/patient");
  await expect(page.getByTestId("next-visit")).toBeVisible();
  await expect(page.getByTestId("next-visit-join")).toBeVisible();
  await expect(page.getByTestId("profile-progress")).toBeVisible();
  await expect(page.getByText("Date of birth")).toBeVisible();
});

test("staff dashboards offer a next action", async ({ page }) => {
  for (const [role, path] of [
    ["doctor", "/doctor"],
    ["pharmacy", "/pharmacy"],
    ["admin", "/admin"],
    ["hospital", "/hospital"],
  ] as const) {
    await install(page, role);
    await page.goto(path);
    await expect(page.getByTestId("role-start").getByRole("link").first()).toBeVisible();
  }
});
