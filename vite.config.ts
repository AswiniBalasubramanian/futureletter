import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // the letter post office (server/index.ts) runs beside the dev server
  server: { proxy: { "/api": "http://localhost:8787" } },
});
