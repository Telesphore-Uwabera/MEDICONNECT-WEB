import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Use IP directly so local dev bypasses DNS (which may point to Netlify/gateway).
  // The Host header tells the server which virtual host to use.
  const apiTarget = env.VITE_DEV_API_TARGET || "https://10.10.141.149";
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

    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});
