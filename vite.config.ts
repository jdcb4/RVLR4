import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig(({ mode }) => ({
  plugins: [react()],
  // Must match the repository name segment in the GitHub Pages URL (case-sensitive).
  // Repo: github.com/jdcb4/JDPassNPlay → https://jdcb4.github.io/JDPassNPlay/
  base: mode === "github-pages" ? "/JDPassNPlay/" : "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
    proxy: {
      "/api": "http://localhost:3001",
      "/socket.io": {
        target: "http://localhost:3001",
        ws: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
  },
}));
