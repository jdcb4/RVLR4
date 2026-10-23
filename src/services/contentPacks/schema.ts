import { z } from "zod";

import { catalogueIdentity, catalogueSchema } from "../../data/catalogueSchema";
import { triviaPackSchema } from "../../data/triviaSchema";

export const MAX_PACK_BYTES = 8 * 1024 * 1024;
const packKindSchema = z.enum(["trivia", "words"]);
export type PackKind = z.infer<typeof packKindSchema>;

/** Canonical display spelling may change without changing its normalised identity. */
export const wordId = (word: string) => `word:${catalogueIdentity(word)}`;

export const wordsPackSchema = z
  .object({
    schemaVersion: z.literal(1),
    kind: z.literal("words"),
    version: z.number().int().positive().safe(),
    publishedAt: z.string().datetime(),
    entries: catalogueSchema,
    removedIds: z
      .array(
        z
          .string()
          .refine(
            (id) => /^word:[\p{L}\p{N}]+$/u.test(id) && wordId(id.slice(5)) === id,
            "Use a normalised word: identity.",
          ),
      )
      .max(20000)
      .default([]),
  })
  .strict()
  .superRefine((pack, context) => {
    if (
      pack.entries.some((entry) =>
        [entry.word, ...entry.aliases].some((name) => !catalogueIdentity(name)),
      )
    ) {
      context.addIssue({
        code: "custom",
        path: ["entries"],
        message: "Words and aliases need a non-empty normalised identity.",
      });
    }
    const ids = new Set(pack.entries.map((entry) => wordId(entry.word)));
    if (new Set(pack.removedIds).size !== pack.removedIds.length) {
      context.addIssue({ code: "custom", path: ["removedIds"], message: "Duplicate removed ID." });
    }
    if (pack.removedIds.some((id) => ids.has(id))) {
      context.addIssue({
        code: "custom",
        path: ["removedIds"],
        message: "An ID cannot be upserted and removed in the same batch.",
      });
    }
  });

const contentPackSchema = z.union([triviaPackSchema, wordsPackSchema]);
export type ContentPack = z.infer<typeof contentPackSchema>;
export type WordsPack = z.infer<typeof wordsPackSchema>;

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
