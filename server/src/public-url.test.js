import express from "express";
import http from "http";
import { describe, expect, it } from "vitest";
import { paginateList } from "./db.js";
import { publicOrigin, publicPagePath, withoutTunnelHost } from "./public-url.js";

function request({ host, forwardedHost, proto, protocol = "https", path = "/api/v1/doctors" }) {
  return {
    protocol,
    headers: {
      host,
      ...(forwardedHost ? { "x-forwarded-host": forwardedHost } : {}),
      ...(proto ? { "x-forwarded-proto": proto } : {}),
    },
    get(name) {
      return name === "host" ? host : "";
    },
    baseUrl: path.replace(/\/doctors$/, ""),
    path: "/doctors",
  };
}

describe("public page links", () => {
  it("uses the request host when it is a public address", () => {
    const req = request({ host: "mediconnect.rw", proto: "https" });
    expect(publicOrigin(req)).toBe("https://mediconnect.rw");
    expect(publicPagePath(req)).toBe("https://mediconnect.rw/api/v1/doctors");
  });

  it("drops a trycloudflare host and uses PUBLIC_BASE_URL, otherwise https://mediconnect.rw", () => {
    const tunnel = request({ host: "makers-chip-laboratories-maintains.trycloudflare.com" });
    expect(publicOrigin(tunnel, {})).toBe("https://mediconnect.rw");
    expect(publicOrigin(tunnel, { PUBLIC_BASE_URL: "https://api.mediconnect.rw/" })).toBe("https://api.mediconnect.rw");
    expect(publicPagePath(tunnel, {})).toBe("https://mediconnect.rw/api/v1/doctors");
  });

  it("prefers a forwarded public host over the tunnel host", () => {
    const req = request({
      host: "abc.trycloudflare.com",
      forwardedHost: "api.mediconnect.rw",
      proto: "https",
    });
    expect(publicOrigin(req)).toBe("https://api.mediconnect.rw");
  });

  it("rewrites leftover tunnel page and self links", () => {
    const page = paginateList({
      data: [],
      total: 30,
      page: 2,
      perPage: 10,
      path: "https://makers-chip-laboratories-maintains.trycloudflare.com/api/v1/doctors",
    });
    expect(page.path).toBe("https://mediconnect.rw/api/v1/doctors");
    expect(page.self).toBe("https://mediconnect.rw/api/v1/doctors?page=2");
    expect(page.first_page_url).toBe("https://mediconnect.rw/api/v1/doctors?page=1");
    expect(page.next_page_url).toBe("https://mediconnect.rw/api/v1/doctors?page=3");
    expect(page.prev_page_url).toBe("https://mediconnect.rw/api/v1/doctors?page=1");
    expect(JSON.stringify(page)).not.toContain("trycloudflare");
    expect(withoutTunnelHost("/api/v1/patient/bills")).toBe("/api/v1/patient/bills");
  });
});

describe("page link route", () => {
  it("publishes the request host on the page and self links", async () => {
    const app = express();
    const router = express.Router();
    router.get("/doctors", (req, res) => {
      res.json(paginateList({
        data: [{ id: 1 }],
        total: 1,
        page: 1,
        perPage: 10,
        path: publicPagePath(req),
      }));
    });
    app.use("/api/v1", router);
    const server = await new Promise((resolve) => {
      const listening = app.listen(0, "127.0.0.1", () => resolve(listening));
    });
    try {
      const { port } = server.address();
      const body = await new Promise((resolve, reject) => {
        const req = http.request({
          hostname: "127.0.0.1",
          port,
          path: "/api/v1/doctors",
          headers: { host: "old-name.trycloudflare.com", "x-forwarded-proto": "https" },
        }, (response) => {
          let raw = "";
          response.on("data", (chunk) => { raw += chunk; });
          response.on("end", () => resolve(JSON.parse(raw)));
        });
        req.on("error", reject);
        req.end();
      });
      expect(body.path).toBe("https://mediconnect.rw/api/v1/doctors");
      expect(body.self).toBe("https://mediconnect.rw/api/v1/doctors?page=1");
      expect(JSON.stringify(body)).not.toContain("trycloudflare");
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
});
