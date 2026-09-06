import { play } from "cuelume";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { type GameSoundEffect, playGameSoundEffect } from "@/services/gameSoundEffects";
import { hatSoundCueToGameSound, playSoundCue } from "@/services/hatSound";
import { whowhatwhereSoundToGameSound } from "@/services/whowhatwhereSound";

vi.mock("cuelume", () => ({ play: vi.fn() }));

beforeEach(() => {
  vi.mocked(play).mockReset();
});

describe("shared game sound mappings", () => {
  it("maps legacy Who What Where sound names onto the shared cue set", () => {
    expect(whowhatwhereSoundToGameSound("correct")).toBe("correct");
    expect(whowhatwhereSoundToGameSound("skip")).toBe("skip");
    expect(whowhatwhereSoundToGameSound("returnSkipped")).toBe("returnSkipped");
    expect(whowhatwhereSoundToGameSound("warning")).toBe("warn10");
    expect(whowhatwhereSoundToGameSound("turnEnd")).toBe("timeout");
    expect(whowhatwhereSoundToGameSound("gameOver")).toBe("victory");
  });

  it("maps Hat action tones onto the same shared cue set", () => {
    expect(hatSoundCueToGameSound("correct")).toBe("correct");
    expect(hatSoundCueToGameSound("skip")).toBe("skip");
    expect(hatSoundCueToGameSound("return-skipped")).toBe("returnSkipped");
    expect(hatSoundCueToGameSound("ten-second-warning")).toBe("warn10");
    expect(hatSoundCueToGameSound("turn-end")).toBe("timeout");
    expect(hatSoundCueToGameSound("turn-start")).toBe("turnStart");
    expect(hatSoundCueToGameSound("phase-one-word")).toBe("phaseOneWord");
    expect(hatSoundCueToGameSound("phase-charades")).toBe("phaseCharades");
  });

  it.each<[GameSoundEffect, string]>([
    ["correct", "success"],
    ["skip", "droplet"],
    ["returnSkipped", "page"],
    ["warn10", "scan"],
    ["timeout", "error"],
    ["victory", "sparkle"],
    ["defeat", "whisper"],
    ["phaseAdvance", "arrival"],
    ["turnStart", "ready"],
    ["phaseOneWord", "chime"],
    ["phaseCharades", "bloom"],
  ])("plays %s through Cuelume's %s cue", async (event, sound) => {
    await playGameSoundEffect(event);
    expect(play).toHaveBeenCalledExactlyOnceWith(sound, { volume: 0.65 });
  });

  it("routes both former recordings through the shared provider", () => {
    playSoundCue("phase-one-word");
    playSoundCue("phase-charades");
    expect(play).toHaveBeenNthCalledWith(1, "chime", { volume: 0.65 });
    expect(play).toHaveBeenNthCalledWith(2, "bloom", { volume: 0.65 });
  });

  it("does not reject game actions when audio is unavailable", async () => {
    vi.mocked(play).mockImplementation(() => {
      throw new DOMException("Audio unavailable", "NotAllowedError");
    });
    await expect(playGameSoundEffect("timeout")).resolves.toBeUndefined();
  });
});
