import { describe, expect, it } from "vitest";

import { applyHatGameAction } from "@/domain/hat-game/engine";
import type { HatGameAction, HatGameSession } from "@/domain/hat-game/types";
import type { ImposterSnapshot } from "@/domain/imposter/types";
import {
  correctWord,
  endTurn,
  returnSkippedWord,
  skipWord,
  startTurn,
} from "@/domain/whowhatwhere/game";
import type { MatchState } from "@/domain/whowhatwhere/types";

import { startDrawNGuessMatch } from "./drawnguessRuntime.ts";
import { buildDrawNGuessSyncDto } from "./drawnguessViews.ts";
import {
  canHatReturnSkipped,
  classifyHatRole,
  projectHatSessionForViewer,
  shouldShowHatTurnFooter,
} from "./hatViews.ts";
import { buildImposterSyncDto } from "./imposterViews.ts";
import { RoomStore } from "./roomStore.ts";
import {
  canReturnSkippedWords,
  classifyWhoWhatWhereRole,
  projectWhoWhatWhereMatch,
  shouldShowWhoWhatWhereTurnFooter,
} from "./whoWhatWhereViews.ts";

const WWW_SECRET = "WWW secret";
const HAT_SECRET = "Hat secret";

function wwwMatch(stage: MatchState["stage"]): MatchState {
  return {
    gameId: "whowhatwhere",
    players: [
      { id: "describer", name: "Describer", teamId: "team-a", seat: 0 },
      { id: "guesser", name: "Guesser", teamId: "team-a", seat: 1 },
      { id: "observer", name: "Observer", teamId: "team-b", seat: 0 },
    ],
    teams: [
      { id: "team-a", name: "A", score: 0 },
      { id: "team-b", name: "B", score: 0 },
    ],
    settings: {
      teamCount: 2,
      turnDurationSeconds: 60,
      totalRounds: 2,
      skipLimit: 2,
      selectedCategories: ["What"],
      difficultyMode: "easy",
      hints: { enabled: true, perTurnLimit: 1 },
    },
    stage,
    roundNumber: 1,
    teamOrder: ["team-a", "team-b"],
    teamIndex: 0,
    describerIndexes: { "team-a": 0, "team-b": 0 },
    activeTurn:
      stage === "turn"
        ? {
            startedAt: new Date(0).toISOString(),
            endsAt: new Date(60_000).toISOString(),
            durationSeconds: 60,
            category: "What",
            wordQueue: [{ word: WWW_SECRET, category: "What", hint: "WWW hint" }],
            queueIndex: 0,
            currentWordSource: "main",
            currentSkippedWord: null,
            score: 0,
            correctCount: 0,
            skippedCount: 0,
            skipLimit: 2,
            skippedWords: [
              {
                id: "skipped-secret",
                word: { word: "Skipped WWW secret", category: "What", hint: "Skip hint" },
              },
            ],
            nextSkippedWordId: 1,
            wordHistory: [],
            hintsRemaining: 1,
            currentWordHintRevealed: false,
          }
        : null,
    lastTurnSummary: null,
    turnSummaries: [],
    results: null,
    wordReserves: { What: [{ word: "Future secret", category: "What", hint: "Future hint" }] },
  };
}

function hatSession(stage: HatGameSession["stage"]): HatGameSession {
  return {
    players: [
      { id: "describer", name: "Describer", teamId: "team-a", seat: 0 },
      { id: "guesser", name: "Guesser", teamId: "team-a", seat: 1 },
      { id: "observer", name: "Observer", teamId: "team-b", seat: 0 },
    ],
    teams: [
      { id: "team-a", name: "A", score: 0 },
      { id: "team-b", name: "B", score: 0 },
    ],
    settings: { teamCount: 2, turnDurationSeconds: 60, cluesPerPlayer: 6, skipsPerTurn: 2 },
    stage,
    roundNumber: 1,
    phaseNumber: 1,
    teamOrder: ["team-a", "team-b"],
    teamIndex: 0,
    describerIndexes: { "team-a": 0, "team-b": 0 },
    cluePool: [{ text: HAT_SECRET, submittedBy: "observer", submittedByName: "Observer" }],
    usedCluePoolIndices: [],
    activeTurn:
      stage === "turn"
        ? {
            startedAt: new Date(0).toISOString(),
            endsAt: new Date(60_000).toISOString(),
            durationSeconds: 60,
            clueQueue: [
              {
                text: HAT_SECRET,
                submittedBy: "observer",
                submittedByName: "Observer",
                poolIndex: 0,
              },
            ],
            queueIndex: 0,
            score: 0,
            correctCount: 0,
            skippedCount: 0,
            skipsRemaining: 2,
            skippedClues: [{ poolIndex: 1, text: "Skipped Hat secret" }],
            currentSkippedCluePoolIndex: null,
            clueHistory: [],
          }
        : null,
    lastTurnSummary: null,
    bestTurnSummary: null,
    results: null,
  };
}

describe("viewer projection invariants", () => {
  it.each(["guesser", "observer"])(
    "keeps WWW history private through skip/return/correct for %s",
    (viewer) => {
      const words = ["Secret alpha", "Secret beta", "Secret gamma"].map((word) => ({
        word,
        hint: `Hint ${word}`,
        category: "What" as const,
      }));
      let match = startTurn(wwwMatch("ready"), words, new Date(0), () => 0.5);
      const check = () => {
        const wire = JSON.stringify(projectWhoWhatWhereMatch(match, viewer));
        for (const word of words) expect(wire).not.toContain(word.word);
        expect(JSON.stringify(projectWhoWhatWhereMatch(match, "describer"))).toContain("Secret");
      };
      check();
      match = skipWord(match, new Date(1_000));
      check();
      match = returnSkippedWord(match);
      check();
      match = correctWord(match, new Date(2_000));
      check();
      const ended = endTurn(match);
      expect(JSON.stringify(projectWhoWhatWhereMatch(ended, viewer).lastTurnSummary)).toContain(
        "Secret",
      );
      expect(match.activeTurn?.wordHistory).toHaveLength(2);
    },
  );

  it.each(["guesser", "observer"])(
    "keeps Hat history private through skip/return/correct for %s",
    (viewer) => {
      let session = hatSession("ready");
      session.cluePool = ["Secret alpha", "Secret beta", "Secret gamma"].map((text) => ({
        text,
        submittedBy: "describer",
        submittedByName: "Describer",
      }));
      const apply = (action: HatGameAction, expired = false) => {
        const next = applyHatGameAction(session, action, {
          nowMs: () => 0,
          rng: () => 0.5,
          isPast: () => expired,
        });
        if ("error" in next) throw new Error(next.error);
        session = next;
      };
      for (const type of [
        "start-turn",
        "skip-clue",
        "return-skipped-clue",
        "mark-correct",
      ] as const) {
        apply({ type });
        const wire = JSON.stringify(projectHatSessionForViewer(session, viewer));
        expect(wire).not.toContain("Secret");
        expect(
          JSON.stringify(projectHatSessionForViewer(session, "describer").activeTurn),
        ).toContain("Secret");
      }
      expect(session.activeTurn?.clueHistory).toHaveLength(2);
      apply({ type: "mark-correct" }, true);
      expect(session.stage).toBe("ready");
      expect(JSON.stringify(projectHatSessionForViewer(session, viewer).lastTurnSummary)).toContain(
        "Secret",
      );
    },
  );

  it.each(["ready", "turn", "finalSummary", "results"] as const)(
    "never exposes Who What Where reserves during %s",
    (stage) => {
      const projected = projectWhoWhatWhereMatch(wwwMatch(stage), "observer");
      expect(JSON.stringify(projected.wordReserves)).not.toContain("Future secret");
      expect(JSON.stringify(projected.wordReserves)).not.toContain("Future hint");
    },
  );

  it.each([
    ["describer", true],
    ["guesser", false],
    ["observer", false],
  ] as const)("projects the active WWW word for %s according to role", (viewerId, maySee) => {
    const wire = JSON.stringify(projectWhoWhatWhereMatch(wwwMatch("turn"), viewerId));
    expect(wire.includes(WWW_SECRET)).toBe(maySee);
  });

  it("classifies WWW roles and gates describer-only controls", () => {
    const match = wwwMatch("turn");
    expect(classifyWhoWhatWhereRole(match, "describer")).toBe("describer");
    expect(classifyWhoWhatWhereRole(match, "guesser")).toBe("guesser");
    expect(classifyWhoWhatWhereRole(match, "observer")).toBe("observer");
    expect(shouldShowWhoWhatWhereTurnFooter(match, "describer")).toBe(true);
    expect(shouldShowWhoWhatWhereTurnFooter(match, "observer")).toBe(false);
    expect(canReturnSkippedWords(match, "describer")).toBe(true);
    expect(canReturnSkippedWords(wwwMatch("ready"), "describer")).toBe(false);
  });

  it.each(["ready", "turn", "finalSummary"] as const)(
    "keeps the Hat clue pool private during %s",
    (stage) => {
      const projected = projectHatSessionForViewer(hatSession(stage), "observer");
      expect(JSON.stringify(projected.cluePool)).not.toContain(HAT_SECRET);
    },
  );

  it.each([
    ["describer", true],
    ["guesser", false],
    ["observer", false],
  ] as const)("projects the active Hat clue for %s according to role", (viewerId, maySee) => {
    const projected = projectHatSessionForViewer(hatSession("turn"), viewerId);
    expect(JSON.stringify(projected.activeTurn).includes(HAT_SECRET)).toBe(maySee);
    expect(JSON.stringify(projected.cluePool)).not.toContain(HAT_SECRET);
  });

  it("classifies Hat roles and gates describer-only controls", () => {
    const session = hatSession("turn");
    expect(classifyHatRole(session, "describer")).toBe("describer");
    expect(classifyHatRole(session, "guesser")).toBe("guesser");
    expect(classifyHatRole(session, "observer")).toBe("observer");
    expect(shouldShowHatTurnFooter(session, "describer")).toBe(true);
    expect(shouldShowHatTurnFooter(session, "observer")).toBe(false);
    expect(canHatReturnSkipped(session, "describer")).toBe(true);
    expect(canHatReturnSkipped(hatSession("ready"), "describer")).toBe(false);
  });

  it("reveals completed Hat clues only at results", () => {
    expect(JSON.stringify(projectHatSessionForViewer(hatSession("results"), "observer"))).toContain(
      HAT_SECRET,
    );
  });

  it.each([
    ["crew", true, "Volcano", []],
    ["imposter", true, "", ["imposter"]],
    ["unseen-crew", false, "", []],
  ] as const)(
    "isolates Imposter reveal data for %s",
    (viewerId, roleSeen, expectedWord, expectedImposterIds) => {
      const snapshot: ImposterSnapshot = {
        step: "reveal",
        playerCount: 3,
        imposterCount: 1,
        players: [
          { id: "crew", name: "Crew" },
          { id: "imposter", name: "Imposter" },
          { id: "unseen-crew", name: "Unseen" },
        ],
        round: {
          secretWord: "Volcano",
          imposterPlayerIds: ["imposter"],
          revealPlayerIndex: 0,
          revealRevealed: false,
          parallelRoleSeen: { crew: roleSeen, imposter: roleSeen, "unseen-crew": roleSeen },
          parallelRevealDone: { crew: false, imposter: false, "unseen-crew": false },
        },
      };

      const projected = buildImposterSyncDto(snapshot, viewerId);
      expect(projected.snapshot.round?.secretWord).toBe(expectedWord);
      expect(projected.snapshot.round?.imposterPlayerIds).toEqual(expectedImposterIds);
    },
  );

  it("scrubs sequential Imposter reveals and exposes completed results", () => {
    const snapshot: ImposterSnapshot = {
      step: "reveal",
      playerCount: 2,
      imposterCount: 1,
      players: [
        { id: "crew", name: "Crew" },
        { id: "imposter", name: "Imposter" },
      ],
      round: {
        secretWord: "Volcano",
        imposterPlayerIds: ["imposter"],
        revealPlayerIndex: 0,
        revealRevealed: true,
      },
    };

    expect(buildImposterSyncDto(snapshot, "crew").snapshot.round?.secretWord).toBe("Volcano");
    expect(buildImposterSyncDto(snapshot, "imposter").snapshot.round?.secretWord).toBe("");
    expect(buildImposterSyncDto(snapshot, "crew").revealSubjectId).toBe("crew");
    expect(buildImposterSyncDto({ ...snapshot, step: "results" }, "crew").snapshot).toEqual({
      ...snapshot,
      step: "results",
    });
    expect(
      buildImposterSyncDto({ ...snapshot, step: "guidePregame", round: null }, "crew").snapshot
        .round,
    ).toBeNull();
  });

  it("does not place another DrawNGuess player's assignment in the viewer DTO", () => {
    const store = new RoomStore();
    const { room, hostPlayer } = store.createRoom({ gameKind: "drawnguess", hostName: "Host" });
    const guest = store.joinRoom({ code: room.code, name: "Guest" }).player;
    store.joinRoom({ code: room.code, name: "Third" });
    startDrawNGuessMatch(room, 1_000);

    const hostSync = buildDrawNGuessSyncDto(room, hostPlayer.id)!;
    const guestSync = buildDrawNGuessSyncDto(room, guest.id)!;
    expect(hostSync.private.assignment).not.toEqual(guestSync.private.assignment);
    expect(JSON.stringify(hostSync)).not.toContain(
      JSON.stringify(
        guestSync.private.assignment?.mode === "drawing" && guestSync.private.assignment.promptText,
      ),
    );
    expect(hostSync.public).not.toHaveProperty("packets");
  });
});
