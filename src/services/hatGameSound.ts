import charadesWav from "@/assets/audio/Charades.wav";
import oneWordWav from "@/assets/audio/OneWord.wav";

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
  | "phase-one-word"
  | "phase-charades";

let audioContext: AudioContext | null = null;

function getContext() {
  const Ctor = window.AudioContext ?? window.webkitAudioContext;
  if (!Ctor) {
    return null;
  }
  audioContext ??= new Ctor();
  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }
  return audioContext;
}

function playTone(
  frequency: number,
  startOffset: number,
  duration: number,
  kind: OscillatorType = "sine",
) {
  const ctx = getContext();
  if (!ctx) {
    return;
  }
  const t0 = ctx.currentTime + 0.01 + startOffset;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = kind;
  osc.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.03);
}

/** Plays bundled WAV via HTMLAudioElement (works without Web Audio decode step). */
function playWavUrl(url: string) {
  const audio = new Audio(url);
  audio.volume = 0.9;
  void audio.play().catch(() => {
    // Autoplay policies or missing file — ignore.
  });
}

const toneCues: Record<
  Exclude<
    SoundCue,
    "phase-one-word" | "phase-charades"
  >,
  readonly {
    frequency: number;
    offset: number;
    duration: number;
    kind?: OscillatorType;
  }[]
> = {
  "turn-start": [
    { frequency: 392, offset: 0, duration: 0.08, kind: "triangle" },
    { frequency: 523, offset: 0.1, duration: 0.1, kind: "triangle" },
  ],
  "ten-second-warning": [
    { frequency: 880, offset: 0, duration: 0.05, kind: "square" },
  ],
  "turn-end": [
    { frequency: 392, offset: 0, duration: 0.12 },
    { frequency: 262, offset: 0.14, duration: 0.14 },
  ],
  correct: [
    { frequency: 523, offset: 0, duration: 0.1 },
    { frequency: 784, offset: 0.12, duration: 0.12 },
  ],
  skip: [{ frequency: 196, offset: 0, duration: 0.14, kind: "sawtooth" }],
};

export function playSoundCue(cue: SoundCue) {
  if (cue === "phase-one-word") {
    playWavUrl(oneWordWav);
    return;
  }
  if (cue === "phase-charades") {
    playWavUrl(charadesWav);
    return;
  }
  for (const part of toneCues[cue]) {
    playTone(
      part.frequency,
      part.offset,
      part.duration,
      part.kind ?? "sine",
    );
  }
}

declare global {
  interface Window {
    readonly webkitAudioContext?: typeof AudioContext;
  }
}
