import charadesWav from "@/assets/audio/Charades.wav";
import oneWordWav from "@/assets/audio/OneWord.wav";
import { type GameSoundEffect, playGameSoundEffect } from "@/services/gameSoundEffects";

/**
 * Hat Game sound cues. Phase transitions use bundled WAVs from the original app;
 * other cues use short Web Audio tones.
 */
export type SoundCue =
  | "turn-start"
  | "ten-second-warning"
  | "turn-end"
  | "correct"
  | "skip"
  | "return-skipped"
  | "phase-one-word"
  | "phase-charades";

/** Plays bundled WAV via HTMLAudioElement (works without Web Audio decode step). */
function playWavUrl(url: string) {
  const audio = new Audio(url);
  audio.volume = 0.9;
  void audio.play().catch(() => {
    // Autoplay policies or missing file: ignore.
  });
}

const HAT_SOUND_MAP: Record<
  Exclude<SoundCue, "phase-one-word" | "phase-charades">,
  GameSoundEffect
> = {
  "turn-start": "turnStart",
  "ten-second-warning": "warn10",
  "turn-end": "timeout",
  correct: "correct",
  skip: "skip",
  "return-skipped": "returnSkipped",
};

export function hatSoundCueToGameSound(
  cue: Exclude<SoundCue, "phase-one-word" | "phase-charades">,
): GameSoundEffect {
  return HAT_SOUND_MAP[cue];
}

export function playSoundCue(cue: SoundCue) {
  if (cue === "phase-one-word") {
    playWavUrl(oneWordWav);
    return;
  }
  if (cue === "phase-charades") {
    playWavUrl(charadesWav);
    return;
  }
  void playGameSoundEffect(hatSoundCueToGameSound(cue));
}
