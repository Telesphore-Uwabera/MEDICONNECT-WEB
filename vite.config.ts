import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const apiTarget = env.VITE_DEV_API_TARGET || "https://staging-api.mediconnect.rw";

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
          secure: false,        // skip SSL cert check for local dev proxy
        },
        "/storage": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
        "/minio": {
          target: apiTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },

    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
