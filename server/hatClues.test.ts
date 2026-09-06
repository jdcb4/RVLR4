import { describe, expect, it } from "vitest";

import { pickSuggestedHatClue } from "./hatClues.ts";

describe("pickSuggestedHatClue", () => {
  it("does not return a suggestion already present in the drafts", () => {
    expect(pickSuggestedHatClue({ player: ["Taylor Swift"] }, () => 0)).toBe("Beyonce");
  });
});
