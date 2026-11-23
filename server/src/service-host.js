export function rewriteServiceHost(req) {
  const url = req.originalUrl || req.url || "";
  if (url === "/__host/ws" || url.startsWith("/__host/ws/")) {
    const stripped = url.slice("/__host/ws".length) || "/";
    req.url = stripped;
    req.originalUrl = stripped;
    req.headers["x-forwarded-host"] = "ws.mediconnect.rw";
  }
}
