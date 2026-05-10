import { customAlphabet } from "nanoid";

/** Join codes avoid ambiguous glyphs (0/O, 1/I/L). */
const CODE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export const generateRoomCode = customAlphabet(CODE_ALPHABET, 6);

export function normalizeRoomCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}
