import express from "express";
import { describe, expect, it, vi } from "vitest";
import { requireRole } from "./auth.js";
import { clientMayClaimEmail, isServerGuestAccount } from "./guest-account.js";

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    tableExists: async () => false,
    hasColumn: async () => false,
    q: async () => [],
    one: async () => null,
    insert: async () => 1,
    update: async () => 1,
  };
});

const { appRoutes } = await import("./app.js");

function roleResult(role, user) {
  return new Promise((resolve) => {
    const res = {
      status(code) {
        this.code = code;
        return this;
      },
      json(body) {
        resolve({ status: this.code, body });
      },
    };
    requireRole(role)({ user }, res, () => resolve({ status: 200 }));
  });
}

function request(user, method, path) {
  const app = express();
  const router = express.Router();
  router.use((req, _res, next) => {
    req.user = user;
    next();
  });
  appRoutes(router);
  app.use("/api/v1", router);
  app.use((req, res) => res.status(404).json({ message: "no route", path: req.path }));
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", async () => {
      try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, { method });
        resolve({ status: response.status, body: await response.json() });
      } finally {
        server.close();
      }
    });
  });
}

describe("role and profile gates", () => {
  it("fails closed when the active role does not match", async () => {
    expect(await roleResult("doctor", { role: "patient", active_role: "patient", available_roles: ["patient"] }))
      .toMatchObject({ status: 403 });
    expect(await roleResult("admin", { role: "hospital", active_role: "hospital", available_roles: [] }))
      .toMatchObject({ status: 403 });
    expect(await roleResult("pharmacy", { role: "doctor", active_role: "doctor", available_roles: ["doctor"] }))
      .toMatchObject({ status: 403 });
    expect(await roleResult("patient", null)).toMatchObject({ status: 401 });
    expect(await roleResult("admin", { role: "doctor", can_be_admin: true, available_roles: [] })).toMatchObject({ status: 200 });
  });

  it("blocks an incomplete patient write and lets a server guest through", async () => {
    expect(clientMayClaimEmail("guest-173@mediconnect.local")).toBe(false);
    expect(isServerGuestAccount("guest-173@mediconnect.local")).toBe(true);
    const incomplete = { id: 3, role: "patient", active_role: "patient", profile_complete: false, email: "patient@example.com" };
    const blocked = await request(incomplete, "POST", "/patient/not-a-real-route");
    expect(blocked.status).toBe(403);
    expect(blocked.body.profile_complete).toBe(false);
    const reading = await request(incomplete, "GET", "/patient/not-a-real-route");
    expect(reading.status).toBe(404);
    const guest = await request(
      { ...incomplete, email: "guest-173@mediconnect.local" },
      "POST",
      "/patient/not-a-real-route",
    );
    expect(guest.status).toBe(404);
    const doctor = await request(
      { id: 4, role: "doctor", active_role: "doctor", profile_complete: false, email: "doctor@example.com" },
      "POST",
      "/patient/not-a-real-route",
    );
    expect(doctor.status).toBe(403);
    expect(doctor.body.profile_complete).toBeUndefined();
  });
});
