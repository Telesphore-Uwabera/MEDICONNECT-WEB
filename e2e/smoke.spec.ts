import { expect, test, type Page, type Route } from "@playwright/test";

const PRODUCTION_HOSTS = ["mediconnect.rw", "10.10.141.149"];

function user(role: string) {
  return {
    id: 9,
    name: "Smoke User",
    email: "smoke@example.com",
    phone: "788000000",
    country_code: "+250",
    avatar: null,
    role,
    active_role: role,
    available_roles: [role],
    can_be_admin: role === "admin",
    is_verified: true,
    status: "active",
    preferred_language: "en",
    profile_complete: true,
  };
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

function payloadFor(url: string, role: string) {
  const path = new URL(url).pathname;
  if (path.endsWith("/auth/me")) return { user: user(role) };
  if (path.includes("/public/settings")) {
    return {
      settings: {
        general: {
          app_name: "MediConnect",
          supported_languages: ["en", "fr", "rw"],
          default_language: "en",
        },
      },
    };
  }
  if (path.includes("/public/doctors")) {
    return {
      data: [{
        id: 11,
        user_id: 21,
        slug: "aline-mukamana",
        speciality: "General Practice",
        consultation_fee: "5000",
        currency: "RWF",
        is_available: true,
        instant_consultation: false,
        consultation_type: "both",
        rating_avg: "4.8",
        user: { id: 21, name: "Aline Mukamana", avatar: null },
        hospitals: [{ id: 3, name: "Kigali Care Clinic" }],
        specialities: [{ id: 1, name: "General Practice" }],
      }],
      total: 1,
      current_page: 1,
      per_page: 12,
      last_page: 1,
    };
  }
  if (path.includes("/public/hospitals") || path.includes("/hospitals")) {
    return {
      data: [{
        id: 3,
        name_en: "Kigali Care Clinic",
        name_fr: "Clinique Kigali Care",
        name_kiny: "Ivuriro rya Kigali Care",
        slug: "kigali-care",
        type: "clinic",
        city: "Kigali",
        address: "KG 1 Ave",
        is_open_24h: true,
        is_accepting_bookings: true,
        doctors_count: 4,
        departments_count: 2,
        departments: [{ id: 1, name_en: "General Practice" }],
        insurances: [],
        working_hours: [],
      }],
      total: 1,
      current_page: 1,
      per_page: 12,
      last_page: 1,
    };
  }
  if (path.includes("/pharmacies")) {
    return {
      data: [{
        id: 4,
        name: "Kigali Pharmacy",
        slug: "kigali-pharmacy",
        city: "Kigali",
        address: "KN 2 Ave",
        province: "Kigali City",
        offers_delivery: true,
        offers_pickup: true,
        is_open_24h: false,
        delivery_fee: 1000,
        delivery_currency: "RWF",
      }],
      total: 1,
      current_page: 1,
      per_page: 12,
      last_page: 1,
    };
  }
  if (path.includes("/profile")) {
    return { status: "active", is_active: true, name: "Smoke User", data: { status: "active", is_active: true } };
  }
  if (path.includes("/dashboard")) {
    return {
      status: true,
      data: {
        users: { patients: 2, doctors: 2, pharmacies: 1, hospitals: 1, total: 6 },
        appointments: { today: 1, pending: 1, total: 3 },
        payments: { total_revenue: "10000", revenue_today: "5000", pending_count: 0, currency: "RWF" },
        certificates: { pending: 0, approved: 1, awaiting_payment: 0 },
        quick_consultations: { active: 0 },
        today: { total: 1, completed: 0, pending: 1, confirmed: 0 },
        filters_applied: { period: "today", from: "2026-11-10", to: "2026-11-10", appointment_type: "all", status: "all", search: null, chart_group: "day" },
      },
      filters_applied: {},
      today: { total: 0, completed: 0, pending: 0, confirmed: 0, accepted: 0 },
      orders: { total: 0, pending: 0, accepted: 0, completed: 0 },
    };
  }
  if (path.includes("unread")) return { count: 0, unread_count: 0 };
  if (path.includes("/stats/")) return { users_served: 12, recovery_rate: 98 };
  return { data: [], total: 0, current_page: 1, per_page: 12, last_page: 1, message: "ok" };
}

async function installApi(page: Page, role = "patient") {
  const leaked: string[] = [];
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (PRODUCTION_HOSTS.some((host) => url.includes(host))) {
      leaked.push(url);
      await route.abort();
      return;
    }
    if (url.includes("/api/v1/")) {
      await json(route, payloadFor(url, role));
      return;
    }
    await route.continue();
  });
  return leaked;
}

async function signIn(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem("auth_token", "smoke-token");
    localStorage.setItem("lang", "en");
  });
}

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("lang", "en"));
});

test("landing page, language switch, and coming-soon store badges", async ({ page }) => {
  const leaked = await installApi(page);
  await page.goto("/");
  await expect(page.getByText("Instant Consultation").first()).toBeVisible();
  await expect(page.getByText("Coming soon").first()).toBeVisible();
  await expect(page.locator('a[href="#"]')).toHaveCount(0);

  await page.getByRole("button", { name: "Language" }).click();
  await page.getByRole("menuitem", { name: "Français" }).click();
  await expect(page.getByText("Prendre rendez-vous").first()).toBeVisible();
  await expect(page.getByText("Bientôt disponible").first()).toBeVisible();
  expect(leaked).toEqual([]);
});

test("login page renders", async ({ page }) => {
  const leaked = await installApi(page);
  await page.goto("/auth");
  await expect(page.getByRole("button", { name: "Sign in" }).first()).toBeVisible();
  expect(leaked).toEqual([]);
});

test("doctor, facility, and pharmacy search pages render mocked results", async ({ page }) => {
  const leaked = await installApi(page);
  await page.goto("/patient/search-doctors");
  await expect(page.getByText("Aline Mukamana").first()).toBeVisible();

  await page.goto("/patient/search-facilities");
  await expect(page.getByText("Kigali Care Clinic").first()).toBeVisible();

  await page.goto("/patient/search-pharmacy");
  await expect(page.getByText("Kigali Pharmacy").first()).toBeVisible();
  expect(leaked).toEqual([]);
});

for (const role of ["patient", "doctor", "hospital", "pharmacy", "admin"] as const) {
  const home = role === "hospital" ? "/hospital" : role === "pharmacy" ? "/pharmacy" : `/${role}`;
  test(`${role} dashboard renders from mocked API data`, async ({ page }) => {
    const leaked = await installApi(page, role);
    await signIn(page);
    await page.goto(home);
    await expect(page.getByText("Dashboard").first()).toBeVisible();
    expect(leaked).toEqual([]);
  });
}
