import {
  contentManifestSchema,
  MAX_PACK_BYTES,
  type PackDescriptor,
  packDescriptorSchema,
} from "./schema";

// Stable public address; hosting can move without changing the APK.
export const CONTENT_MANIFEST_URL = "https://content.jboxgames.com/rvlry/v1/manifest.json";

async function download(url: string, maxBytes: number): Promise<Uint8Array> {
  const parsed = new URL(url);
  if (parsed.protocol !== "https:" || parsed.username || parsed.password)
    throw new Error("Content downloads require HTTPS.");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: "omit",
      redirect: "error",
      cache: "no-store",
      referrerPolicy: "no-referrer",
    });
    if (!response.ok || !response.body) throw new Error("Content download failed.");
    const length = response.headers.get("content-length");
    if (length !== null && Number(length) > maxBytes)
      throw new Error("Content download is too large.");
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) throw new Error("Content download is too large.");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
      bytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    return bytes;
  } finally {
    clearTimeout(timer);
  }
}

export async function checkContentUpdates() {
  const bytes = await download(CONTENT_MANIFEST_URL, 64 * 1024);
  const manifest = contentManifestSchema.parse(
    JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)),
  );
  return { status: "available" as const, manifest };
}

/** Hash/schema validation and activation belong to the install service. */
export function downloadContentPack(descriptor: PackDescriptor): Promise<Uint8Array> {
  const expected = packDescriptorSchema.parse(descriptor);
  return download(expected.url, Math.min(expected.bytes, MAX_PACK_BYTES));
}
