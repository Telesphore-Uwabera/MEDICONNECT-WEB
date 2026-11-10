import { expect, test, type Route } from "@playwright/test";

const PRODUCTION_HOSTS = ["mediconnect.rw", "10.10.141.149"];

function futureDate() {
  const day = new Date();
  day.setUTCDate(day.getUTCDate() + 20);
  return day.toISOString().slice(0, 10);
}

function json(route: Route, body: unknown, status = 200) {
  return route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

test("guest booking shows the temporary password returned by the API", async ({ page }) => {
  const date = futureDate();
  const slots = {
    doctor: { id: 11, name: "Aline Mukamana", slug: "aline-mukamana" },
    dates: [date],
    total: 1,
    slots: {
      [date]: [{
        id: 1,
        slot_date: date,
        start_time: "15:00:00",
        end_time: "15:30:00",
        duration_minutes: 30,
        type: "online",
        hospital_id: null,
        status: "available",
        booked_by_me: false,
      }],
    },
  };

  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (PRODUCTION_HOSTS.some((host) => url.includes(host))) {
      await route.abort();
      return;
    }
    if (!url.includes("/api/v1/")) {
      await route.continue();
      return;
    }
    const path = new URL(url).pathname;
    if (path.includes("/public/settings")) {
      await json(route, { settings: { general: { app_name: "MediConnect", supported_languages: ["en", "fr", "rw"], default_language: "en" } } });
      return;
    }
    if (path.includes("/slots")) {
      await json(route, slots);
      return;
    }
    if (path.includes("/public/doctors")) {
      await json(route, {
        data: [{
          id: 11,
          slug: "aline-mukamana",
          consultation_fee: 0,
          currency: "RWF",
          consultation_type: "online",
          user: { id: 21, name: "Aline Mukamana", avatar: null },
          specialities: [{ id: 1, name: "General Practice" }],
          hospitals: [],
        }],
        total: 1,
        current_page: 1,
        last_page: 1,
      });
      return;
    }
    if (path.endsWith("/auth/guest")) {
      await json(route, { message: "Guest session started.", guest_token: "9|guest-token", expires_at: "2026-12-01T00:00:00Z" }, 201);
      return;
    }
    if (path.endsWith("/auth/guest/convert")) {
      await json(route, { message: "Guest account saved.", user_id: 9, temp_password: null });
      return;
    }
    if (path.endsWith("/auth/me")) {
      await json(route, {
        user: {
          id: 9,
          name: "Keza",
          email: "guest@example.com",
          phone: "788111222",
          country_code: "+250",
          role: "patient",
          active_role: "patient",
          available_roles: ["patient"],
          is_verified: true,
          status: "active",
          preferred_language: "en",
          profile_complete: true,
        },
      });
      return;
    }
    if (path.endsWith("/patient/appointments") && route.request().method() === "POST") {
      await json(route, {
        id: 77,
        message: "Appointment reserved.",
        temp_password: "TempPass99",
        account_email: "guest@example.com",
      }, 201);
      return;
    }
    await json(route, { data: [] });
  });

  await page.goto("/patient/search-doctors");
  await page.getByRole("button", { name: "Book Appointment" }).first().click();
  await page.getByRole("button", { name: "15:00" }).click();
  await page.getByRole("button", { name: "Confirm appointment" }).click();
  await page.getByTestId("guest-name").fill("Keza");
  await page.getByTestId("guest-email").fill("guest@example.com");
  await page.getByTestId("guest-phone").fill("788111222");
  await page.getByTestId("guest-book-submit").click();
  await expect(page.getByTestId("guest-temp-password")).toHaveValue("TempPass99");
});

test("doctor consultation notes include the guest profile fields", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("auth_token", "doctor-token");
    localStorage.setItem("lang", "en");
  });
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (PRODUCTION_HOSTS.some((host) => url.includes(host))) {
      await route.abort();
      return;
    }
    if (!url.includes("/api/v1/")) {
      await route.continue();
      return;
    }
    const path = new URL(url).pathname;
    if (path.endsWith("/auth/me")) {
      await json(route, {
        user: {
          id: 31,
          name: "Dr Smoke",
          email: "doctor@example.com",
          phone: "788000000",
          country_code: "+250",
          role: "doctor",
          active_role: "doctor",
          available_roles: ["doctor"],
          is_verified: true,
          status: "active",
          preferred_language: "en",
          profile_complete: true,
        },
      });
      return;
    }
    if (path.includes("/public/settings")) {
      await json(route, { settings: { general: { app_name: "MediConnect", supported_languages: ["en", "fr", "rw"], default_language: "en" } } });
      return;
    }
    await json(route, { data: [], patient: { id: 4, user_id: null, name: "Keza", phone: "788111222" } });
  });

  const token = Buffer.from(JSON.stringify({
    role: "doctor",
    is_owner: true,
    consultation_id: 4,
    username: "Dr Smoke",
    room: "appointment-4",
  })).toString("base64");
  await page.goto(`/consultation/appointment-4?t=${encodeURIComponent(token)}&mode=appointment&cid=4&notes=1`);
  await expect(page.getByTestId("guest-profile-city")).toBeVisible({ timeout: 15000 });
});
