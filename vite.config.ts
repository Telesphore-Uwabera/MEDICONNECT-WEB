import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { checkSocialLink } from "./server/src/social-links.js";

function socialLinkCheckPlugin(): Plugin {
  return {
    name: "social-link-check",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const pathname = req.url?.split("?")[0];
        if (req.method !== "POST" || pathname !== "/api/v1/doctor/social-links/check") {
          next();
          return;
        }
        const chunks: Buffer[] = [];
        for await (const chunk of req) chunks.push(Buffer.from(chunk));
        try {
          const body = JSON.parse(Buffer.concat(chunks).toString() || "{}") as { platform?: string; url?: string };
          const result = await checkSocialLink(String(body.platform || ""), body.url);
          res.statusCode = 200;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify(result));
        } catch {
          res.statusCode = 422;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, code: "unreachable" }));
        }
      });
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Proxy strategy:
  // - On VPN: use http://10.10.141.149 (port 80) with Host header → direct to Nginx
  // - Off VPN: set VITE_DEV_API_TARGET=https://staging-api.mediconnect.rw in .env
  //   to fall back to the public staging API (no VPN needed)
  const apiTarget = env.VITE_DEV_API_TARGET || "http://10.10.141.149";
  const apiHost   = env.VITE_DEV_API_HOST   || "api.mediconnect.rw";

  return {
    server: {
      host: "::",
      port: 3000,
      hmr: {
        overlay: false,
      },
      watch: {
        usePolling: process.env.CHOKIDAR_USEPOLLING === "true",
      },
      proxy: {
        "/api/v1": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          headers: { Host: apiHost },
        },
        "/storage": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          headers: { Host: apiHost },
        },
        "/minio": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
          headers: { Host: apiHost },
        },
      },
    },

    plugins: [socialLinkCheckPlugin(), react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
