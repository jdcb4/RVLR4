import { play, type SoundName } from "cuelume";

/** Game events stay independent of the audio provider. See docs/AUDIO.md. */
export type GameSoundEffect =
  | "correct"
  | "skip"
  | "returnSkipped"
  | "warn10"
  | "timeout"
  | "victory"
  | "defeat"
  | "phaseAdvance"
  | "turnStart"
  | "phaseOneWord"
  | "phaseCharades";

const GAME_SOUND_MAP = {
  correct: "success",
  skip: "droplet",
  returnSkipped: "page",
  warn10: "scan",
  timeout: "error",
  victory: "sparkle",
  defeat: "whisper",
  phaseAdvance: "arrival",
  turnStart: "ready",
  phaseOneWord: "chime",
  phaseCharades: "bloom",
} as const satisfies Record<GameSoundEffect, SoundName>;

export async function playGameSoundEffect(name: GameSoundEffect): Promise<void> {
  try {
    // Keep playback in the interaction stack; the shared context is lazy.
    play(GAME_SOUND_MAP[name], { volume: 0.65 });
  } catch {
    // Unavailable audio must never interrupt a game action or timer.
  }
}
