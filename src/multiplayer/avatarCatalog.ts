export const AVATAR_IDS = [
  "bear",
  "cat",
  "deer",
  "dog",
  "elephant",
  "fox",
  "frog",
  "hedgehog",
  "koala",
  "lion",
  "monkey",
  "owl",
  "panda",
  "penguin",
  "rabbit",
  "raccoon",
  "squirrel",
  "tiger",
  "turtle",
  "wolf",
] as const;

export type AvatarId = (typeof AVATAR_IDS)[number];

export function isAvatarId(value: unknown): value is AvatarId {
  return typeof value === "string" && AVATAR_IDS.includes(value as AvatarId);
}

export function pickRandomAvatarId(rng: () => number = Math.random): AvatarId {
  const index = Math.floor(rng() * AVATAR_IDS.length);

  return AVATAR_IDS[index] ?? AVATAR_IDS[0];
}

export function normalizeAvatarId(value: unknown): AvatarId {
  return isAvatarId(value) ? value : pickRandomAvatarId();
}
