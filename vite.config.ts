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
    proxy: {
      "/api/v1": {
        target: "http://10.10.141.149",
        changeOrigin: true,
        headers: { Host: "api.mediconnect.rw" },
      },
      "/storage": {
        target: "http://10.10.141.149",
        changeOrigin: true,
        headers: { Host: "api.mediconnect.rw" },
      },
      "/minio": {
        target: "http://10.10.141.149",
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
