import { type GameSoundEffect, playGameSoundEffect } from "@/services/gameSoundEffects";

export type SoundCue =
  | "turn-start"
  | "ten-second-warning"
  | "turn-end"
  | "correct"
  | "skip"
  | "return-skipped"
  | "phase-one-word"
  | "phase-charades";

const HAT_SOUND_MAP: Record<SoundCue, GameSoundEffect> = {
  "turn-start": "turnStart",
  "ten-second-warning": "warn10",
  "turn-end": "timeout",
  correct: "correct",
  skip: "skip",
  "return-skipped": "returnSkipped",
  "phase-one-word": "phaseOneWord",
  "phase-charades": "phaseCharades",
};

export function hatSoundCueToGameSound(cue: SoundCue): GameSoundEffect {
  return HAT_SOUND_MAP[cue];
}

export function playSoundCue(cue: SoundCue) {
  void playGameSoundEffect(hatSoundCueToGameSound(cue));
}
