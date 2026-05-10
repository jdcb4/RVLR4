import path from "node:path";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

/** Separate dev server for `gallery.html` — does not affect `pnpm run build` / production bundle. */
export default defineConfig({
  plugins: [react()],
  root: ".",
  base: "/",
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    port: 5174,
    strictPort: false,
    open: "/gallery.html",
  },
  build: {
    outDir: "dist-ui-gallery",
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, "gallery.html"),
    },
  },
});
