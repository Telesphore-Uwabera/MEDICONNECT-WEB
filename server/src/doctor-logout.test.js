import express from "express";
import fs from "fs";
import path from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

const calls = [];
const doctor = { id: 31, instant_consultation: 1 };

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    tableExists: async () => true,
    hasColumn: async (table, column) => table === "doctors" && (column === "instant_consultation" || column === "user_id"),
    one: async () => ({ id: doctor.id }),
    q: async () => [],
    update: async (table, id, data) => {
      if (doctor.fail) throw new Error("db down");
      calls.push({ op: "update", table, id, data });
      if (table === "doctors") doctor.instant_consultation = data.instant_consultation;
    },
    pool: {
      query: async (sql, params) => {
        calls.push({ op: "query", sql: String(sql), params });
        if (String(sql).includes("instant_consultation")) throw new Error("column missing");
        return [{ affectedRows: 1 }];
      },
    },
  };
});

const { appRoutes } = await import("./app.js");

function request({ role = "doctor", failUpdate = false } = {}) {
  if (failUpdate) doctor.fail = true;
  const app = express();
  app.use(express.json());
  const router = express.Router();
  router.use((req, _res, next) => {
    req.user = { id: 7, role, active_role: role };
    req.auth = { token: { id: 42 } };
    next();
  });
  appRoutes(router);
  app.use("/api/v1", router);
  app.use((error, _req, res, _next) => {
    res.status(error.status || 500).json({ message: error.message || "error" });
  });
  return new Promise((resolve) => {
    const server = app.listen(0, "127.0.0.1", async () => {
      try {
        const { port } = server.address();
        const response = await fetch(`http://127.0.0.1:${port}/api/v1/auth/logout`, { method: "POST" });
        resolve({ status: response.status, body: await response.json() });
      } finally {
        server.close();
      }
    });
  });
}

describe("doctor logout", () => {
  beforeEach(() => {
    calls.length = 0;
    doctor.instant_consultation = 1;
    doctor.fail = false;
  });

  it("turns instant consultations off before the token is deleted", async () => {
    const saved = await request();
    expect(saved.status).toBe(200);
    expect(saved.body.message).toBe("Signed out.");
    const update = calls.find((call) => call.op === "update");
    const revoke = calls.find((call) => call.op === "query" && call.sql.includes("DELETE FROM personal_access_tokens"));
    expect(update).toMatchObject({ table: "doctors", id: 31, data: { instant_consultation: 0 } });
    expect(calls.indexOf(update)).toBeLessThan(calls.indexOf(revoke));
    expect(doctor.instant_consultation).toBe(0);
  });

  it("still signs out when the availability update fails", async () => {
    doctor.fail = true;
    const saved = await request();
    expect(saved.status).toBe(200);
    expect(calls.some((call) => call.sql?.includes("DELETE FROM personal_access_tokens"))).toBe(true);
  });

  it("does not turn instant off when another login or a password change drops tokens", () => {
    const auth = fs.readFileSync(path.join(process.cwd(), "server/src/auth.js"), "utf8");
    const actions = fs.readFileSync(path.join(process.cwd(), "server/src/actions.js"), "utf8");
    expect(auth).not.toMatch(/disableInstantOnLogout|instant_consultation: 0/);
    expect(actions).not.toMatch(/disableInstantOnLogout|instant_consultation: 0/);
  });
});
