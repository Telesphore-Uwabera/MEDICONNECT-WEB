import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  server: {
    host: "::",
    port: 3000,
    hmr: {
      overlay: false,
    },
    watch: {
      usePolling: process.env.CHOKIDAR_USEPOLLING === "true",
    },
    // Proxy API requests to the backend (mirrors Netlify redirects).
    // The Host header must be set so Nginx routes to the Laravel vhost.
    proxy: {
      "/api/v1": {
        target: "http://197.243.29.114",
        changeOrigin: true,
        headers: { Host: "api.mediconnect.rw" },
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
});
