import { Capacitor } from "@capacitor/core";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createMatch, startTurn } from "@/domain/whowhatwhere/game";
import { getWhoWhatWhereWordList } from "@/domain/whowhatwhere/wordList";
import {
  createHatDeviceSession,
  HAT_DEVICE_SESSION_KEY,
  hatDeviceSessionSchema,
} from "@/features/hat-game/hatDeviceSession";
import { createHatTeamSetup } from "@/features/hat-game/hatSingleplayerTransitions";
import {
  createImposterDeviceSession,
  IMPOSTER_DEVICE_SESSION_KEY,
  imposterDeviceSessionSchema,
} from "@/features/imposter/imposterDeviceSession";
import {
  resizeImposterRoster,
  updateImposterPlayerName,
} from "@/features/imposter/imposterSingleplayerTransitions";
import {
  createWhoWhatWhereDeviceSession,
  WHO_WHAT_WHERE_SESSION_KEY,
  whoWhatWhereDeviceSessionSchema,
} from "@/features/whowhatwhere/whoWhatWhereDeviceSession";
import { readSnapshot, removeSnapshot, writeSnapshot } from "@/services/nativeSnapshotStore";

const keys = [
  WHO_WHAT_WHERE_SESSION_KEY,
  HAT_DEVICE_SESSION_KEY,
  IMPOSTER_DEVICE_SESSION_KEY,
] as const;
const storageKey = (key: string) => `rvlry.snapshot.${key}`;

function setups(name: string) {
  const www = createWhoWhatWhereDeviceSession();
  const hat = createHatDeviceSession();
  const hatTeams = createHatTeamSetup(hat.snapshot);
  if (hatTeams.error !== null) throw new Error(hatTeams.error);
  const imposter = createImposterDeviceSession();
  return {
    [WHO_WHAT_WHERE_SESSION_KEY]: {
      ...www,
      mode: "team" as const,
      teamStep: 1,
      setup: {
        ...www.setup,
        teams: www.setup.teams.map((team, index) =>
          index === 0 ? { ...team, name: `${name} WWW` } : team,
        ),
      },
    },
    [HAT_DEVICE_SESSION_KEY]: {
      ...hat,
      snapshot: {
        ...hatTeams.snapshot,
        turnDurationSeconds: 45,
        skipsPerTurn: 2,
        players: hatTeams.snapshot.players.map((player, index) =>
          index === 0 ? { ...player, name: `${name} Hat` } : player,
        ),
      },
    },
    [IMPOSTER_DEVICE_SESSION_KEY]: {
      ...imposter,
      snapshot: {
        ...updateImposterPlayerName(
          resizeImposterRoster(imposter.snapshot, 7),
          imposter.snapshot.players[0]!.id,
          `${name} Imposter`,
        ),
        step: "roster" as const,
        round: null,
      },
    },
  };
}

async function readGames() {
  const [www, hat, imposter] = await Promise.all([
    readSnapshot(WHO_WHAT_WHERE_SESSION_KEY, whoWhatWhereDeviceSessionSchema),
    readSnapshot(HAT_DEVICE_SESSION_KEY, hatDeviceSessionSchema),
    readSnapshot(IMPOSTER_DEVICE_SESSION_KEY, imposterDeviceSessionSchema),
  ]);
  return {
    [WHO_WHAT_WHERE_SESSION_KEY]: www,
    [HAT_DEVICE_SESSION_KEY]: hat,
    [IMPOSTER_DEVICE_SESSION_KEY]: imposter,
  };
}

beforeEach(() => {
  vi.spyOn(Capacitor, "isNativePlatform").mockReturnValue(false);
  localStorage.clear();
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("independent native game session contracts through the preview storage adapter", () => {
  it.each(keys)("writing and removing %s preserves both other games exactly", async (target) => {
    expect(new Set(keys).size).toBe(3);
    await readGames();
    const initial = setups("Original");
    await Promise.all(keys.map((key) => writeSnapshot(key, initial[key])));
    const baseline = await readGames();
    const bytes = Object.fromEntries(
      keys.map((key) => [key, localStorage.getItem(storageKey(key))]),
    );

    const updated = setups("Changed");
    await writeSnapshot(target, updated[target]);
    const afterWrite = await readGames();
    expect(afterWrite[target].value).toEqual(updated[target]);
    for (const other of keys.filter((key) => key !== target)) {
      expect(afterWrite[other]).toEqual(baseline[other]);
      expect(localStorage.getItem(storageKey(other))).toBe(bytes[other]);
    }

    await removeSnapshot(target);
    const afterRemoval = await readGames();
    expect(afterRemoval[target]).toEqual({ value: null, recovered: false });
    for (const other of keys.filter((key) => key !== target)) {
      expect(afterRemoval[other]).toEqual(baseline[other]);
      expect(localStorage.getItem(storageKey(other))).toBe(bytes[other]);
    }
  });

  it("retains an installed WWW v1 active turn without presentationStage while the new games save", async () => {
    const legacy = createWhoWhatWhereDeviceSession();
    const match = startTurn(
      createMatch(legacy.setup.teams, legacy.setup.settings),
      getWhoWhatWhereWordList(),
    );
    const oldRecord = {
      ...legacy,
      mode: "turn" as const,
      match,
      remainingMs: 22_500,
      paused: true,
    };
    delete oldRecord.presentationStage;
    const raw = JSON.stringify({
      current: JSON.stringify({
        storageVersion: 1,
        revision: 6,
        savedAt: oldRecord.savedAt,
        payload: oldRecord,
      }),
      previous: null,
    });
    localStorage.setItem(storageKey(WHO_WHAT_WHERE_SESSION_KEY), raw);

    const restored = await readGames();
    expect(restored[WHO_WHAT_WHERE_SESSION_KEY]).toEqual({
      value: { ...oldRecord, presentationStage: null },
      recovered: false,
    });
    const next = setups("New game");
    await writeSnapshot(HAT_DEVICE_SESSION_KEY, next[HAT_DEVICE_SESSION_KEY]);
    await writeSnapshot(IMPOSTER_DEVICE_SESSION_KEY, next[IMPOSTER_DEVICE_SESSION_KEY]);
    await removeSnapshot(HAT_DEVICE_SESSION_KEY);

    const retained = await readSnapshot(
      WHO_WHAT_WHERE_SESSION_KEY,
      whoWhatWhereDeviceSessionSchema,
    );
    expect(retained).toEqual(restored[WHO_WHAT_WHERE_SESSION_KEY]);
    expect(retained.value?.match).toEqual(match);
    expect(retained.value?.remainingMs).toBe(22_500);
    expect(localStorage.getItem(storageKey(WHO_WHAT_WHERE_SESSION_KEY))).toBe(raw);
    expect(
      (await readSnapshot(IMPOSTER_DEVICE_SESSION_KEY, imposterDeviceSessionSchema)).value,
    ).toEqual(next[IMPOSTER_DEVICE_SESSION_KEY]);
  });
});
