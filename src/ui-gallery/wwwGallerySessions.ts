import { wordDeck } from "@/data/words.generated";
import {
  correctWord,
  createMatch,
  endTurn,
  showResults,
  startTurn,
} from "@/domain/whowhatwhere/game";
import { createDefaultSettings, createTeamSetups } from "@/domain/whowhatwhere/setup";
import type { GameSettings, MatchState } from "@/domain/whowhatwhere/types";

const galleryNow = new Date("2026-05-10T12:00:00.000Z");
const tick = new Date("2026-05-10T12:00:03.000Z");

export function wwwGallerySettings(): GameSettings {
  return createDefaultSettings();
}

export function wwwGalleryTeamSetups() {
  return createTeamSetups(2);
}

/** First ready screen — no prior turn recap. */
export function wwwGalleryMatchFresh(): MatchState {
  return createMatch(createTeamSetups(2), createDefaultSettings());
}

/** Ready screen showing `LastTurnCard` content. */
export function wwwGalleryMatchReadyWithSummary(): MatchState {
  let match = startTurn(wwwGalleryMatchFresh(), wordDeck, galleryNow, () => 0);
  match = correctWord(match, tick);
  return endTurn(match);
}

/** Timer frozen far ahead so the Active Turn screen does not emit warning sounds while browsing. */
export function wwwGalleryMatchActiveFrozen(): MatchState {
  const match = startTurn(wwwGalleryMatchFresh(), wordDeck, galleryNow, () => 0);
  const endsAt = new Date(galleryNow.getTime() + 120 * 60 * 1000).toISOString();
  const activeTurn = match.activeTurn
    ? { ...match.activeTurn, endsAt, startedAt: galleryNow.toISOString() }
    : null;
  return { ...match, activeTurn };
}

/** End of match — stage `finalSummary` (Final turn recap), results payload present but not yet “revealed”. */
export function wwwGalleryMatchFinalSummary(): MatchState {
  const settings = { ...createDefaultSettings(), totalRounds: 1 as const };
  let match = createMatch(createTeamSetups(2), settings);
  match = startTurn(match, wordDeck, galleryNow, () => 0);
  match = endTurn(match);
  match = startTurn(match, wordDeck, galleryNow, () => 0);
  match = endTurn(match);
  return match;
}

export function wwwGalleryMatchResults(): MatchState {
  return showResults(wwwGalleryMatchFinalSummary());
}
