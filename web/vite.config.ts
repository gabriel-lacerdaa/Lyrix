import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Porta 5173: é a origem liberada no CORS da API (CORS_ORIGINS no backend/.env).
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
