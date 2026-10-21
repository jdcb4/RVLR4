import { z } from "zod";

/** Comparison only: display names retain their spelling, accents and punctuation. */
export function catalogueIdentity(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLocaleLowerCase("en-AU")
    .replace(/[^\p{L}\p{N}]/gu, "");
}

const displayText = z
  .string()
  .min(1)
  .max(80)
  .refine((value) => value === value.trim() && !/\s{2,}/u.test(value), "Use single spaces.")
  .refine((value) => value === value.normalize("NFC"), "Use NFC Unicode.");

const gameSchema = z.enum(["www", "hat", "imposter"]);
export type CatalogueGame = z.infer<typeof gameSchema>;

const entrySchema = z
  .object({
    word: displayText,
    category: z.enum(["Who", "What", "Where"]),
    hint: z.string().max(240),
    difficulty: z.enum(["easy", "medium", "hard"]),
    kidAppropriate: z.boolean(),
    aliases: z.array(displayText),
    originalIds: z.array(z.string().regex(/^(www|hat|imposter):\d+$/u)),
    games: z.array(gameSchema).min(1),
  })
  .strict()
  .superRefine((entry, context) => {
    if (entry.games.includes("www") && !entry.hint.trim()) {
      context.addIssue({ code: "custom", message: "WWW entries need a hint.", path: ["hint"] });
    }
    for (const key of ["aliases", "originalIds", "games"] as const) {
      if (new Set(entry[key]).size !== entry[key].length) {
        context.addIssue({ code: "custom", message: `Duplicate ${key}.`, path: [key] });
      }
    }
  });

export type CatalogueEntry = z.infer<typeof entrySchema>;

export const catalogueSchema = z
  .array(entrySchema)
  .min(1)
  .superRefine((entries, context) => {
    const identities = new Map<string, number>();
    const originals = new Map<string, number>();
    entries.forEach((entry, index) => {
      for (const name of [entry.word, ...entry.aliases]) {
        const identity = catalogueIdentity(name);
        const owner = identities.get(identity);
        if (owner !== undefined && owner !== index) {
          context.addIssue({
            code: "custom",
            message: `Answer/alias ${name} also belongs to entry ${owner}.`,
            path: [index, "word"],
          });
        }
        identities.set(identity, index);
      }
      for (const originalId of entry.originalIds) {
        if (originals.has(originalId)) {
          context.addIssue({
            code: "custom",
            message: `Original ${originalId} is assigned more than once.`,
            path: [index, "originalIds"],
          });
        }
        originals.set(originalId, index);
      }
    });
  });
