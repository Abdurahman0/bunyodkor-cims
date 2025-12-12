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
    proxy: {
      "/api": {
        target: "https://reduces-test-commitments-choosing.trycloudflare.com",
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ""),
        configure: (proxy, _options) => {
          proxy.on("error", (err, _req, _res) => {
            console.log("proxy error", err);
          });
          proxy.on("proxyReq", (proxyReq, req, _res) => {
            console.log("Sending Request to the Target:", req.method, req.url);
          });
          proxy.on("proxyRes", (proxyRes, req, _res) => {
            console.log(
              "Received Response from the Target:",
              proxyRes.statusCode,
              req.url
            );
          });
        },
      },
    },
  },
});
