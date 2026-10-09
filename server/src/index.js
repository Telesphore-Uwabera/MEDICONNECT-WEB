import http from "http";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { appRoutes } from "./app.js";
import { ensureDoctorSearchFields, pool } from "./db.js";
import { publicRoutes } from "./public.js";
import { auth } from "./auth.js";
import { startRealtime } from "./realtime.js";
import { remindExpiringLicenses } from "./doctor-review.js";
import { remindUpcomingVisits } from "./visit-notify.js";
import { expireUnpaidPayments } from "./public.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

function publicHost(req) {
  const raw = req.headers["x-forwarded-host"] || req.headers.host || "";
  return String(raw).split(",")[0].trim().split(":")[0].toLowerCase();
}

function proxyRequest(req, res, target) {
  const headers = { ...req.headers, host: target.host };
  const proxyReq = http.request({
    hostname: target.hostname,
    port: target.port,
    method: req.method,
    path: req.originalUrl || req.url,
    headers,
  }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on("error", () => {
    if (!res.headersSent) res.status(502).type("text").send("Upstream unavailable");
  });
  req.pipe(proxyReq);
}

const app = express();
app.use((req, res, next) => {
  const url = req.originalUrl || req.url || "";
  if (url === "/__host/ws" || url.startsWith("/__host/ws/")) {
    const stripped = url.slice("/__host/ws".length) || "/";
    req.url = stripped;
    req.originalUrl = stripped;
    req.headers["x-forwarded-host"] = "ws.mediconnect.rw";
    return next();
  }
  if (url === "/__host/db" || url.startsWith("/__host/db/")) {
    const stripped = url.slice("/__host/db".length) || "/";
    req.url = stripped;
    req.originalUrl = stripped;
    req.headers["x-forwarded-host"] = "db.mediconnect.rw";
    return proxyRequest(req, res, { hostname: "127.0.0.1", port: 80, host: "db.mediconnect.rw" });
  }
  if (publicHost(req) !== "db.mediconnect.rw") return next();
  proxyRequest(req, res, { hostname: "127.0.0.1", port: 80, host: "db.mediconnect.rw" });
});
app.use("/minio", (req, res) => {
  proxyRequest(req, res, { hostname: "10.10.141.148", port: 80, host: "api.mediconnect.rw" });
});
app.use(cors());
app.use(express.json({ limit: "20mb" }));
const uploadDir = process.env.UPLOAD_DIR || path.join(root, "storage");
app.use("/storage", express.static(uploadDir));
app.use("/storage", (req, res) => {
  proxyRequest(req, res, { hostname: "10.10.141.148", port: 80, host: "api.mediconnect.rw" });
});
app.use("/api/v1/media", express.static(path.join(uploadDir, "doctors-webp")));
app.use("/api/v1/media", express.static(path.join(uploadDir, "webp")));

const api = express.Router();
api.use(auth);
publicRoutes(api);
appRoutes(api);
api.use((req, res) => {
  res.status(404).json({ message: `No ${req.method} route for ${req.path}` });
});
app.use("/api/v1", api);

app.get("/", (req, res) => {
  if (publicHost(req) === "ws.mediconnect.rw") {
    res.type("html").send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>MediConnect WebSocket</title></head>
<body style="font-family:sans-serif;margin:3rem">
<h1>MediConnect WebSocket</h1>
<p>This address accepts live connections at <code>wss://ws.mediconnect.rw/app/mediconnect-staging-key</code>.</p>
</body></html>`);
    return;
  }
  res.json({
    service: "mediconnect-api",
    status: true,
    health: "/api/v1/health",
  });
});

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ message: error.message || "Server error" });
});

const port = Number(process.env.PORT || 4000);
const wsPort = Number(process.env.WS_PORT || 8080);

pool.query("SELECT 1").then(async () => {
  await ensureDoctorSearchFields().catch((error) => {
    console.error("Could not prepare doctor search fields", error.message);
  });
  const server = app.listen(port, "127.0.0.1", () => {
    console.log(`MediConnect API listening on ${port}`);
  });
  startRealtime(server);
  startRealtime(wsPort);
  console.log(`Realtime listening on ${port} and ${wsPort}`);
  const remind = () => remindExpiringLicenses().catch((error) => {
    console.error("License reminder failed:", error?.message || error);
  });
  const remindVisits = () => remindUpcomingVisits().catch((error) => {
    console.error("Visit reminder failed:", error?.message || error);
  });
  const expirePayments = () => expireUnpaidPayments().catch((error) => {
    console.error("Payment expiry failed:", error?.message || error);
  });
  remind();
  remindVisits();
  expirePayments();
  setInterval(remind, 12 * 60 * 60 * 1000);
  setInterval(remindVisits, 10 * 60 * 1000);
  setInterval(expirePayments, 60 * 1000);
}).catch((error) => {
  console.error("Database connection failed", error.message);
  process.exit(1);
});
