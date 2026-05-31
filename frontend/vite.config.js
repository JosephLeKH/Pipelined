/** Vite configuration for Pipelined frontend. */

import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const BUILD_HASH = Date.now().toString(36);

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(path.dirname(new URL(import.meta.url).pathname), "./src"),
    },
  },
  define: {
    __BUILD_HASH__: JSON.stringify(BUILD_HASH),
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom", "react-router-dom"],
          query: ["@tanstack/react-query"],
          charts: ["recharts"],
          dnd: ["@dnd-kit/core", "@dnd-kit/sortable", "@dnd-kit/utilities"],
        },
      },
    },
  },
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.js"],
    globals: true,
    exclude: ["e2e/**", "node_modules/**"],
  },
});
