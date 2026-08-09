import { type GameSoundEffect, playGameSoundEffect } from "@/services/gameSoundEffects";

export type SoundName = "correct" | "skip" | "returnSkipped" | "warning" | "turnEnd" | "gameOver";

const WHO_WHAT_WHERE_SOUND_MAP: Record<SoundName, GameSoundEffect> = {
  correct: "correct",
  skip: "skip",
  returnSkipped: "returnSkipped",
  warning: "warn10",
  turnEnd: "timeout",
  gameOver: "victory",
};

export function whowhatwhereSoundToGameSound(name: SoundName): GameSoundEffect {
  return WHO_WHAT_WHERE_SOUND_MAP[name];
}

export function playSound(name: SoundName) {
  void playGameSoundEffect(whowhatwhereSoundToGameSound(name));
}
