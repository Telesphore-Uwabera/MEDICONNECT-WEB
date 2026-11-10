import { expect, test, type Route } from "@playwright/test";

function json(route: Route, body: unknown) {
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
}

test("the doctor instant queue shows a paid request and hides an unpaid one", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("auth_token", "doctor-token");
    localStorage.setItem("lang", "en");
  });
  await page.route("**/*", async (route) => {
    const url = route.request().url();
    if (url.includes("mediconnect.rw")) {
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
          id: 4, name: "Dr Aline", email: "doctor@example.com", phone: "788000000", country_code: "+250",
          role: "doctor", active_role: "doctor", available_roles: ["doctor"], is_verified: true, status: "active",
          preferred_language: "en", profile_complete: true,
        },
      });
      return;
    }
    if (path.endsWith("/doctor/profile")) {
      await json(route, { doctor: { status: "approved" }, status: "approved" });
      return;
    }
    if (path.includes("/instant-consultations/queue")) {
      await json(route, {
        queue: [
          { id: 1, doctor_id: 31, guest_name: "Unpaid Keza", guest_phone: "788111111", description: null, status: "pending", payment_status: "pending", age_seconds: 30, waiting_seconds: 30, waiting_label: "30s", queue_position: 1 },
          { id: 2, doctor_id: 31, guest_name: "Paid Amina", guest_phone: "788222222", description: null, status: "confirmed", payment_status: "paid", age_seconds: 20, waiting_seconds: 20, waiting_label: "20s", queue_position: 1 },
        ],
        stats: { in_queue: 1, seen_today: 0, resolved: 0, is_online: true, doctor_busy: false },
      });
      return;
    }
    await json(route, { data: [], settings: { general: { app_name: "MediConnect", supported_languages: ["en", "fr", "rw"] } } });
  });

  await page.goto("/doctor/appointments?tab=instant");
  await expect(page.getByText("Paid Amina").first()).toBeVisible();
  await expect(page.getByText("Unpaid Keza")).toHaveCount(0);
});
