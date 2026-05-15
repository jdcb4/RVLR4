/**
 * Shared game sound effects. These patterns are based on the multiplayer
 * Who What Where cues and are the canonical sounds for matching actions across
 * games and play modes.
 */
export type GameSoundEffect =
  | "correct"
  | "skip"
  | "returnSkipped"
  | "warn10"
  | "timeout"
  | "victory"
  | "defeat"
  | "phaseAdvance"
  | "turnStart";

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

export async function playGameSoundEffect(name: GameSoundEffect): Promise<void> {
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
    case "returnSkipped": {
      synth.triggerAttackRelease(["E4", "A4"], "16n", now);
      synth.triggerAttackRelease("B4", "16n", now + 0.08);
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
    case "victory": {
      synth.triggerAttackRelease(["C5", "E5", "G5", "C6"], "8n", now);
      synth.triggerAttackRelease(["E5", "G5"], "8n", now + 0.12);
      break;
    }
    case "defeat": {
      synth.triggerAttackRelease(["E4", "D4", "C4"], "4n", now);
      break;
    }
    case "phaseAdvance": {
      synth.triggerAttackRelease(["C5", "G5"], "16n", now);
      break;
    }
    case "turnStart": {
      synth.triggerAttackRelease(["G4", "C5"], "16n", now);
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
