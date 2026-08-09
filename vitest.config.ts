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
    globals: false,
    setupFiles: ["./src/tests/setupTests.ts"],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.claude/**",
      "**/cypress/**",
      "**/.{idea,git,cache,output,temp}/**",
      "**/{karma,rollup,webpack,vite,vitest,jest,ava,babel,nyc,cypress,tsup,build}.config.*",
    ],
    coverage: {
      provider: "istanbul",
      include: ["server/**/*.ts", "src/**/*.{ts,tsx}"],
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
      thresholds: {
        "server/{sync,whoWhatWhereViews,hatViews,imposterViews,drawnguessViews}.ts": {
          lines: 95,
          statements: 95,
          functions: 100,
          branches: 90,
        },
        "server/{boundarySchemas,socketSchemas,secrets,rateLimiter}.ts": {
          lines: 100,
          statements: 100,
          functions: 100,
          branches: 90,
        },
      },
    },
  },
});
