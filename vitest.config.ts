import { defineConfig } from "vitest/config";
import path from "path";
import react from "@vitejs/plugin-react";

const templateRoot = path.resolve(import.meta.dirname);

export default defineConfig({
  plugins: [react() as any],
  root: templateRoot,
  resolve: {
    alias: {
      "@": path.resolve(templateRoot, "frontend", "src"),
      "@shared": path.resolve(templateRoot, "backend", "shared"),
      "@assets": path.resolve(templateRoot, "attached_assets"),
    },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts", "tests/**/*.spec.ts"],
    globals: true,
  },
});
