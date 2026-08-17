import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { h2cFallback } from "./vite.h2cFallback.js";

export default defineConfig({
  plugins: [react(), h2cFallback()],
  server: {
    // Dual-stack (::) so Cursor preview on IPv6 localhost works too
    host: "::",
    port: 5174,
    strictPort: true,
    // Allow Cursor port-forward / localtunnel / ngrok hosts while developing
    allowedHosts: true,
    proxy: { "/api": { target: "http://127.0.0.1:4000", changeOrigin: true } },
  },
});
