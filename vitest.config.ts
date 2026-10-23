import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    // Catalogue and maximum-save stress tests are memory/CPU intensive.
    // Bound parallel workers rather than relaxing their timeout/assertions.
    maxWorkers: 4,
    globals: false,
    setupFiles: ["./src/tests/setupTests.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.claude/**",
      "**/.tmp/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
    ],
    coverage: {
      provider: "istanbul",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "**/*Types.ts",
        "**/types.ts",
        "src/ui-gallery/**",
        "src/tests/**",
        "server/index.ts",
      ],
      reporter: ["text", "html", "json"],
    },
  },
});
