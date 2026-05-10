type SoundName =
  | "correct"
  | "skip"
  | "returnSkipped"
  | "warning"
  | "turnEnd"
  | "gameOver";

const SOUND_PATTERNS: Record<SoundName, readonly [number, number, number][]> = {
  correct: [
    [523, 0, 0.07],
    [784, 0.08, 0.08],
  ],
  skip: [[196, 0, 0.12]],
  returnSkipped: [
    [330, 0, 0.06],
    [440, 0.07, 0.08],
  ],
  warning: [
    [880, 0, 0.06],
    [880, 0.14, 0.06],
  ],
  turnEnd: [
    [392, 0, 0.1],
    [262, 0.12, 0.16],
  ],
  gameOver: [
    [523, 0, 0.08],
    [659, 0.1, 0.08],
    [784, 0.2, 0.16],
  ],
};

let audioContext: AudioContext | null = null;

export function playSound(name: SoundName) {
  const AudioContextConstructor = window.AudioContext ?? window.webkitAudioContext;

  if (!AudioContextConstructor) {
    return;
  }

  audioContext ??= new AudioContextConstructor();

  if (audioContext.state === "suspended") {
    void audioContext.resume();
  }

  const startAt = audioContext.currentTime + 0.01;

  for (const [frequency, offset, duration] of SOUND_PATTERNS[name]) {
    playTone(frequency, startAt + offset, duration);
  }
}

function playTone(frequency: number, startAt: number, duration: number) {
  if (!audioContext) {
    return;
  }

  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();

  oscillator.type = "sine";
  oscillator.frequency.value = frequency;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(0.08, startAt + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  oscillator.connect(gain).connect(audioContext.destination);
  oscillator.start(startAt);
  oscillator.stop(startAt + duration + 0.02);
}

declare global {
  interface Window {
    readonly webkitAudioContext?: typeof AudioContext;
  }
}
