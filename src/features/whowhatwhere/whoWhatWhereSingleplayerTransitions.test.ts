import { describe, expect, it } from "vitest";

import { createMatch, startTurn } from "@/domain/whowhatwhere/game";
import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import type { PersistedMatch } from "@/services/whowhatwherePersistence";

import {
  createValidatedWhoWhatWhereMatch,
  nextWhoWhatWhereTeamStep,
  restoreWhoWhatWhereMatch,
} from "./whoWhatWhereSingleplayerTransitions";

describe("Who What Where single-player transitions", () => {
  const settings = createDefaultSettings();
  const teams = createTeamSetups(2);

  it("keeps setup validation at the match boundary", () => {
    expect(createValidatedWhoWhatWhereMatch([], settings)).toMatchObject({
      match: null,
    });
    expect(createValidatedWhoWhatWhereMatch(teams, settings).match?.stage).toBe("ready");
  });

  it("ends an expired persisted turn while resuming", () => {
    const ready = createMatch(teams, settings);
    const active = startTurn(ready, [
      { word: "Ada", category: "Who", hint: "A programmer" },
      { word: "A telescope", category: "What", hint: "Looks far away" },
      { word: "Sydney", category: "Where", hint: "A harbour city" },
    ]);
    const pending: PersistedMatch = {
      schemaVersion: 1,
      savedAt: new Date().toISOString(),
      match: {
        ...active,
        activeTurn: { ...active.activeTurn!, endsAt: new Date(Date.now() - 1).toISOString() },
      },
    };
    expect(restoreWhoWhatWhereMatch(pending).stage).not.toBe("turn");
  });

  it("advances into review only after the final team", () => {
    expect(nextWhoWhatWhereTeamStep(0, 2)).toEqual({ step: 1, mode: "team" });
    expect(nextWhoWhatWhereTeamStep(1, 2)).toEqual({ step: 1, mode: "review" });
  });
});
