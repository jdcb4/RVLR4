import { describe, expect, it } from "vitest";

import { hatSoundCueToGameSound } from "@/services/hatSound";
import { whowhatwhereSoundToGameSound } from "@/services/whowhatwhereSound";

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
  });
});
