import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const users = new Map();
const otps = [];

vi.mock("./mail.js", () => ({
  sendMail: async () => true,
  buildOtpEmail: () => "",
  buildWelcomeEmail: () => "",
  buildEmailHtml: () => "",
  emailP: () => "",
  emailBtn: () => "",
}));

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    hasColumn: async (_table, name) => ["password_must_change", "temp_password_expires_at", "temp_password_used_at"].includes(name),
    one: async (sql, params = []) => {
      const text = String(sql);
      if (text.includes("FROM users") && text.includes("email")) {
        return [...users.values()].find((row) => row.email === params[0]) ?? null;
      }
      if (text.includes("FROM users") && text.includes("phone")) {
        return [...users.values()].find((row) => row.phone === params[0]) ?? null;
      }
      if (text.includes("FROM users")) return users.get(Number(params[0])) ?? null;
      if (text.includes("FROM otps")) {
        return otps.find((row) => String(row.code) === String(params[0])) ?? null;
      }
      return null;
    },
    update: async (_table, id, data) => {
      const row = users.get(Number(id));
      if (row) Object.assign(row, data);
    },
    pool: { query: async () => [] },
  };
});

const { appRoutes } = await import("./app.js");
const { hashPassword } = await import("./auth.js");
const { reissueGuestPassword, checkGuestLogin } = await import("./guest-password.js");

function request(path, body) {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  appRoutes(router);
  app.use("/api/v1", router);
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ message: error.message || "error" });
  });
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", async () => {
      try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        resolve({ status: response.status, body: await response.json().catch(() => ({})) });
      } finally {
        server.close();
      }
    });
  });
}

describe("password reset retires a guest temporary password", () => {
  beforeEach(() => {
    users.clear();
    otps.length = 0;
  });

  it("stops re-sends and accepts the new password after the temporary one has expired", async () => {
    users.set(4, {
      id: 4,
      name: "Late Guest",
      phone: "788000111",
      email: null,
      password: await hashPassword("expired-temp"),
      password_must_change: 1,
      temp_password_expires_at: new Date(Date.now() - 60_000),
      temp_password_used_at: null,
    });
    otps.push({ id: 1, code: "123456", expires_at: new Date(Date.now() + 60_000) });

    const reset = await request("/auth/reset-password", {
      phone: "788000111",
      otp: "123456",
      password: "chosen-secret",
      password_confirmation: "chosen-secret",
    });
    expect(reset.status).toBe(200);
    const saved = users.get(4);
    expect(saved.password_must_change).toBe(0);
    expect(saved.temp_password_used_at).toBeInstanceOf(Date);
    expect(await reissueGuestPassword(4)).toBeNull();
    expect(await checkGuestLogin(saved, "chosen-secret")).toMatchObject({ ok: true, mustChange: false });
    expect(await checkGuestLogin(saved, "expired-temp")).toMatchObject({ ok: false });
  });
});
