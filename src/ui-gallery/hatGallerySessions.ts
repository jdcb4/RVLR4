import { GAME_DEFAULTS } from "@/config/hatGameDefaults";
import { applyHatGameAction, createHatGameSession } from "@/domain/hat-game/engine";
import { buildDefaultSetup } from "@/domain/hat-game/setup";
import type { ClueSubmissionMap, HatGameSession } from "@/domain/hat-game/types";

/** Deterministic options aligned with `domain/hat-game/engine.test.ts`. */
export const galleryHatActionOpts = {
  rng: () => 0.5,
  nowMs: () => Date.UTC(2026, 5, 10, 12, 0, 0),
  toIso: (timestamp: number) => new Date(timestamp).toISOString(),
  makeTimestamp: () => new Date(Date.UTC(2026, 5, 10, 12, 0, 0)).toISOString(),
  isPast: () => false,
};

function unwrap<T>(result: T | { error: string }): T {
  if (result && typeof result === "object" && "error" in result) {
    throw new Error((result as { error: string }).error);
  }
  return result as T;
}

export function makeGalleryClueSubmissions(
  players: readonly { readonly id: string }[],
): ClueSubmissionMap {
  return Object.fromEntries(
    players.map((player, playerIndex) => [
      player.id,
      {
        clues: Array.from(
          { length: GAME_DEFAULTS.cluesPerPlayer },
          (_, clueIndex) => `Demo figure ${playerIndex + 1}.${clueIndex + 1}`,
        ),
      },
    ]),
  );
}

/** Shared roster + clues used across Hat gallery snapshots so names stay consistent. */
export function getGalleryHatSetup() {
  const { teams, players } = buildDefaultSetup(4, 2);
  const clueSubmissions = makeGalleryClueSubmissions(players);
  return { teams, players, clueSubmissions };
}

export function hatGalleryBaseSession(): HatGameSession {
  const { teams, players, clueSubmissions } = getGalleryHatSetup();
  return createHatGameSession({
    teams,
    players,
    clueSubmissions,
    config: GAME_DEFAULTS,
    rng: () => 0.5,
  });
}

/** Between-turns screen with a recap card from the previous turn. */
export function hatGallerySessionReadyWithSummary(): HatGameSession {
  let session = hatGalleryBaseSession();
  session = unwrap(
    applyHatGameAction(session, { type: "start-turn" }, galleryHatActionOpts),
  );
  session = unwrap(
    applyHatGameAction(session, { type: "mark-correct" }, galleryHatActionOpts),
  );
  session = unwrap(
    applyHatGameAction(session, { type: "end-turn" }, galleryHatActionOpts),
  );
  return session;
}

export function hatGallerySessionMidTurn(): HatGameSession {
  return unwrap(
    applyHatGameAction(
      hatGalleryBaseSession(),
      { type: "start-turn" },
      galleryHatActionOpts,
    ),
  );
}

/** Includes at least one skipped clue so the dashed “waiting” panel appears. */
export function hatGallerySessionMidTurnWithSkips(): HatGameSession {
  let session = hatGallerySessionMidTurn();
  session = unwrap(
    applyHatGameAction(session, { type: "skip-clue" }, galleryHatActionOpts),
  );
  return session;
}

export function hatGallerySessionFinalTurnRecap(): HatGameSession {
  let session = hatGalleryBaseSession();
  while (session.stage !== "finalSummary") {
    if (session.stage === "ready") {
      session = unwrap(
        applyHatGameAction(session, { type: "start-turn" }, galleryHatActionOpts),
      );
    }
    session = unwrap(
      applyHatGameAction(session, { type: "mark-correct" }, galleryHatActionOpts),
    );
  }
  return session;
}

export function hatGallerySessionResults(): HatGameSession {
  const session = hatGallerySessionFinalTurnRecap();
  return unwrap(
    applyHatGameAction(session, { type: "view-results" }, galleryHatActionOpts),
  );
}
