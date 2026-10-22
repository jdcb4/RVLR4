import { z } from "zod";

import { catalogueSchema } from "../../data/catalogueSchema";
import { triviaPackSchema } from "../../data/triviaSchema";

export const MAX_PACK_BYTES = 8 * 1024 * 1024;
const packKindSchema = z.enum(["trivia", "words"]);
export type PackKind = z.infer<typeof packKindSchema>;

const wordsPackSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("words"),
    version: z.number().int().positive().safe(),
    publishedAt: z.string().datetime(),
    entries: catalogueSchema,
  })
  .strict();

const contentPackSchema = z.union([triviaPackSchema, wordsPackSchema]);
export type ContentPack = z.infer<typeof contentPackSchema>;

export const packDescriptorSchema = z
  .object({
    kind: packKindSchema,
    version: z.number().int().positive().safe(),
    url: z
      .string()
      .url()
      .max(2000)
      .refine((url) => {
        const parsed = new URL(url);
        return parsed.protocol === "https:" && !parsed.username && !parsed.password && !parsed.hash;
      }, "Use an HTTPS URL without credentials or a fragment."),
    bytes: z.number().int().positive().max(MAX_PACK_BYTES),
    sha256: z.string().regex(/^[a-f0-9]{64}$/u),
  })
  .strict();
export type PackDescriptor = z.infer<typeof packDescriptorSchema>;

export const contentManifestSchema = z
  .object({
    schemaVersion: z.literal(1),
    packs: z.array(packDescriptorSchema).max(2),
  })
  .strict()
  .refine(
    (manifest) => new Set(manifest.packs.map((pack) => pack.kind)).size === manifest.packs.length,
    "Only one advertised version per pack kind.",
  );

export async function sha256(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function parsePack(raw: string, kind: PackKind): ContentPack {
  if (new TextEncoder().encode(raw).byteLength > MAX_PACK_BYTES)
    throw new Error("Content pack exceeds 8 MiB.");
  const pack = contentPackSchema.parse(JSON.parse(raw));
  if (pack.kind !== kind) throw new Error("Content pack kind does not match.");
  return pack;
}

export async function validateDownload(bytes: Uint8Array, descriptor: PackDescriptor) {
  const expected = packDescriptorSchema.parse(descriptor);
  if (bytes.byteLength !== expected.bytes || (await sha256(bytes)) !== expected.sha256) {
    throw new Error("Content download is incomplete or its checksum does not match.");
  }
  const raw = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  const pack = parsePack(raw, expected.kind);
  if (pack.version !== expected.version)
    throw new Error("Content pack version does not match the manifest.");
  return { raw, pack };
}
