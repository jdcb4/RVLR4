/**
 * Multiplayer UI cues using Tone.js (short synth bursts — user gesture unlocks audio).
 */
let toneStarted = false;

async function ensureTone(): Promise<boolean> {
  try {
    const Tone = await import("tone");
    if (!toneStarted) {
      await Tone.start();
      toneStarted = true;
    }
    return true;
  } catch {
    return false;
  }
}

/** Fire-and-forget cue — safe to call from React handlers / effects. */
export async function playMultiplayerToneCue(
  name: "correct" | "skip" | "warn10" | "timeout",
): Promise<void> {
  const ok = await ensureTone();
  if (!ok) {
    return;
  }

  const Tone = await import("tone");
  const synth = new Tone.PolySynth(Tone.Synth).toDestination();
  synth.volume.value = -8;

  const now = Tone.now();

  switch (name) {
    case "correct": {
      synth.triggerAttackRelease(["C5", "E5"], "8n", now);
      break;
    }
    case "skip": {
      synth.triggerAttackRelease("A3", "16n", now);
      break;
    }
    case "warn10": {
      synth.triggerAttackRelease("G5", "16n", now);
      synth.triggerAttackRelease("G5", "16n", now + 0.15);
      break;
    }
    case "timeout": {
      synth.triggerAttackRelease(["G4", "D4"], "8n", now);
      break;
    }
    default: {
      break;
    }
  }

  window.setTimeout(() => {
    synth.dispose();
  }, 900);
}
