import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Base is overridable so the same build can be served from a sub-path
// (GitHub Pages) or from the container root (nginx).
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  plugins: [react()],
  server: { host: true, port: 5173 },
  build: { outDir: "dist", sourcemap: true },
  test: {
    environment: "jsdom",
    setupFiles: ["./test/setup.js"],
    include: ["test/**/*.test.{js,jsx}"],
    coverage: {
      provider: "v8",
      reporter: ["text", "lcov"],
      include: ["src/domain/**", "src/state/**"],
      thresholds: { lines: 85, functions: 85, branches: 80, statements: 85 },
    },
  },
});
