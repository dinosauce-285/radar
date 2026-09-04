import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    // In dev, Vite serves the UI and forwards every /api request to Hono, so the
    // browser still sees a single origin and CORS never comes up.
    proxy: { "/api": "http://localhost:3000" },
  },
});
