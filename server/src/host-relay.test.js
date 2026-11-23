import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { rewriteServiceHost } from "./service-host.js";

describe("database console relay", () => {
  it("does not rewrite /__host/db or a db.mediconnect.rw host into a local proxy", () => {
    const source = readFileSync(path.join(process.cwd(), "server/src/index.js"), "utf8");
    expect(source).not.toMatch(/__host\/db/);
    expect(source).not.toMatch(/db\.mediconnect\.rw/);
    expect(source).not.toMatch(/proxyRequest/);

    const dbPath = {
      url: "/__host/db/index.php",
      originalUrl: "/__host/db/index.php",
      headers: { host: "mediconnect.rw" },
    };
    rewriteServiceHost(dbPath);
    expect(dbPath.url).toBe("/__host/db/index.php");
    expect(dbPath.headers["x-forwarded-host"]).toBeUndefined();

    const dbHost = {
      url: "/",
      originalUrl: "/",
      headers: { host: "db.mediconnect.rw", "x-forwarded-host": "db.mediconnect.rw" },
    };
    rewriteServiceHost(dbHost);
    expect(dbHost.headers["x-forwarded-host"]).toBe("db.mediconnect.rw");
    expect(dbHost.url).toBe("/");
  });

  it("still strips the websocket prefix", () => {
    const req = {
      url: "/__host/ws/app/mediconnect-staging-key",
      originalUrl: "/__host/ws/app/mediconnect-staging-key",
      headers: { host: "mediconnect.rw" },
    };
    rewriteServiceHost(req);
    expect(req.url).toBe("/app/mediconnect-staging-key");
    expect(req.originalUrl).toBe("/app/mediconnect-staging-key");
    expect(req.headers["x-forwarded-host"]).toBe("ws.mediconnect.rw");
  });
});
