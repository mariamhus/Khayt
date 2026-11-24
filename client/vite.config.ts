import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: { "/api": { target: process.env.API_URL ?? "http://localhost:4000", changeOrigin: false } },
  },
  preview: {
    proxy: { "/api": { target: process.env.API_URL ?? "http://localhost:4000", changeOrigin: false } },
  },
  test: { environment: "node" },
});
