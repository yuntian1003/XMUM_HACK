import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

const plugins = [react(), tailwindcss()];
const devApiTarget = process.env.VITE_DEV_API_PROXY_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins,
  resolve: {
    dedupe: ["react", "react-dom"],
    alias: {
      "react": path.resolve(import.meta.dirname, "..", "node_modules", "react"),
      "react-dom": path.resolve(import.meta.dirname, "..", "node_modules", "react-dom"),
      "@": path.resolve(import.meta.dirname, "src"),
      "@shared": path.resolve(import.meta.dirname, "..", "backend", "shared"),
      "@assets": path.resolve(import.meta.dirname, "..", "attached_assets"),
    },
  },
  envDir: path.resolve(import.meta.dirname, ".."),
  root: path.resolve(import.meta.dirname),
  publicDir: path.resolve(import.meta.dirname, "public"),
  build: {
    outDir: path.resolve(import.meta.dirname, "..", "dist", "public"),
    emptyOutDir: true,
  },
  server: {
    host: true,
    allowedHosts: ["localhost", "127.0.0.1"],
    proxy: {
      "/api": {
        target: devApiTarget,
        changeOrigin: true,
      },
    },
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
  },
});
