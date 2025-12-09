import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  optimizeDeps: {
    include: ["set-cookie-parser"], // 🔥 MUHIM
  },
  server: {
    allowedHosts: ["uncanonical-chantelle-winningly.ngrok-free.dev"],
    hmr: {
      clientPort: 443,
      protocol: "wss",
      host: "uncanonical-chantelle-winningly.ngrok-free.dev",
    },
  },
});
