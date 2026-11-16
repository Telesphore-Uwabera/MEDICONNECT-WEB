import express from "express";
import { beforeEach, describe, expect, it, vi } from "vitest";

const writes = [];
const tokenDeletes = [];
let tokensTable = false;
const account = {
  id: 7,
  password: "",
  password_must_change: 0,
  preferred_language: "en",
};

vi.mock("./db.js", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    tableExists: async (name) => tokensTable && name === "personal_access_tokens",
    hasColumn: async () => false,
    q: async () => [],
    pool: {
      query: async (sql, params) => {
        tokenDeletes.push({ sql: String(sql), params });
        return [{ affectedRows: 1 }];
      },
    },
    one: async () => account,
    insert: async () => 1,
    update: async (_table, _id, data) => {
      writes.push(data);
      if (data.password) account.password = data.password;
      if ("password_must_change" in data) account.password_must_change = data.password_must_change;
    },
    knownWrite: async (_table, data) => ({ payload: { ...(data || {}) }, unknown: [] }),
  };
});

const { hashPassword } = await import("./auth.js");
const { appRoutes } = await import("./app.js");

function request(body, lang = "en", { tokenId = null, path = "/settings/password" } = {}) {
  const app = express();
  app.use(express.json());
  const router = express.Router();
  router.use((req, _res, next) => {
    req.user = { id: account.id, preferred_language: lang, role: "patient", active_role: "patient" };
    if (tokenId) req.auth = { token: { id: tokenId } };
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
        const response = await fetch(`http://127.0.0.1:${port}/api/v1${path}`, {
          method: "PUT",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
        resolve({ status: response.status, body: await response.json() });
      } finally {
        server.close();
      }
    });
  });
}

describe("settings password change", () => {
  beforeEach(async () => {
    writes.length = 0;
    tokenDeletes.length = 0;
    tokensTable = false;
    account.password = await hashPassword("current-secret");
    account.password_must_change = 0;
  });

  it("rejects a missing or wrong current password in the caller's language", async () => {
    const missing = await request({ password: "new-secret-1", password_confirmation: "new-secret-1" }, "fr");
    expect(missing.status).toBe(422);
    expect(missing.body.message).toBe("Saisissez votre mot de passe actuel.");
    const wrong = await request({
      current_password: "not-the-password",
      password: "new-secret-1",
      password_confirmation: "new-secret-1",
    }, "rw");
    expect(wrong.status).toBe(422);
    expect(wrong.body.message).toBe("Iryo jambo ry'ibanga rya none ntabwo ari ryo.");
    expect(writes).toEqual([]);
  });

  it("rejects a short password and a password that matches the current one", async () => {
    const short = await request({
      current_password: "current-secret",
      password: "short",
      password_confirmation: "short",
    });
    expect(short.status).toBe(422);
    expect(short.body.message).toBe("Use at least 8 characters.");
    const same = await request({
      current_password: "current-secret",
      password: "current-secret",
      password_confirmation: "current-secret",
    });
    expect(same.status).toBe(422);
    expect(same.body.message).toBe("Choose a password that is different from your current one.");
    expect(writes).toEqual([]);
  });

  it("changes the password when the current one matches", async () => {
    const saved = await request({
      current_password: "current-secret",
      password: "replacement-1",
      password_confirmation: "replacement-1",
    });
    expect(saved.status).toBe(200);
    expect(writes[0].password).toBeTruthy();
    expect(writes[0].password).not.toBe("replacement-1");
    expect(writes[0].password_must_change).toBe(0);
  });

  it("lets a temporary-password account choose a new password without repeating it", async () => {
    account.password_must_change = 1;
    const saved = await request({
      current_password: "",
      password: "replacement-1",
      password_confirmation: "replacement-1",
    });
    expect(saved.status).toBe(200);
    expect(writes[0].password_must_change).toBe(0);
    account.password = await hashPassword("temp-secret");
    account.password_must_change = 1;
    writes.length = 0;
    const reused = await request({
      password: "temp-secret",
      password_confirmation: "temp-secret",
    });
    expect(reused.status).toBe(422);
    expect(reused.body.message).toMatch(/different/i);
    expect(writes).toEqual([]);
  });

  it("revokes other tokens and ignores a longer password path", async () => {
    tokensTable = true;
    const saved = await request({
      current_password: "current-secret",
      password: "replacement-1",
      password_confirmation: "replacement-1",
    }, "en", { tokenId: 42 });
    expect(saved.status).toBe(200);
    expect(tokenDeletes).toEqual([{
      sql: "DELETE FROM personal_access_tokens WHERE tokenable_id = ? AND id <> ?",
      params: [account.id, 42],
    }]);
    tokenDeletes.length = 0;
    writes.length = 0;
    const untouched = await request({
      current_password: "replacement-1",
      password: "another-secret",
      password_confirmation: "another-secret",
    }, "en", { tokenId: 42, path: "/settings/password/extra" });
    expect(untouched.body.message).not.toBe("Password updated.");
    expect(writes).toEqual([]);
    expect(tokenDeletes).toEqual([]);
  });
});
