import { access } from "node:fs/promises";

const port = Number(process.env.PORT ?? 3001);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer from 1 to 65535.");
}
try {
  await access(new URL("../dist/index.html", import.meta.url));
} catch {
  console.error("No built client found. Run pnpm run build before pnpm run preview.");
  process.exit(1);
}

// Deliberately self-contained: a saved Railway origin must not break local preview.
process.env.NODE_ENV = "production";
process.env.PORT = String(port);
process.env.CLIENT_ORIGIN = `http://127.0.0.1:${port},http://localhost:${port}`;
console.log(`Full-stack preview: http://127.0.0.1:${port}/`);
await import("../server/index.ts");
