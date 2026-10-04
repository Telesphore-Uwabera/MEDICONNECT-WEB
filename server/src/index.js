import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import cors from "cors";
import { appRoutes } from "./app.js";
import { pool } from "./db.js";
import { publicRoutes } from "./public.js";
import { auth } from "./auth.js";
import { startRealtime } from "./realtime.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const app = express();
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use("/storage", express.static(process.env.UPLOAD_DIR || path.join(root, "storage")));

const api = express.Router();
api.use(auth);
publicRoutes(api);
appRoutes(api);
api.use((req, res) => {
  res.status(404).json({ message: `No ${req.method} route for ${req.path}` });
});
app.use("/api/v1", api);

app.use((error, _req, res, _next) => {
  const status = error.status || 500;
  if (status >= 500) console.error(error);
  res.status(status).json({ message: error.message || "Server error" });
});

const port = Number(process.env.PORT || 4000);
const wsPort = Number(process.env.WS_PORT || 8080);

pool.query("SELECT 1").then(() => {
  app.listen(port, "127.0.0.1", () => {
    console.log(`MediConnect API listening on ${port}`);
  });
  startRealtime(wsPort);
  console.log(`Realtime listening on ${wsPort}`);
}).catch((error) => {
  console.error("Database connection failed", error.message);
  process.exit(1);
});
