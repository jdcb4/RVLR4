import { GAME_DEFAULTS } from "@/config/hatDefaults";
import { IMPOSTER_MAX_PLAYERS, IMPOSTER_MIN_PLAYERS } from "@/config/imposterDefaults";
import { MIN_PLAYERS_PER_TEAM } from "@/config/teamRoster";
import { DRAWNGUESS_MAX_PLAYERS, DRAWNGUESS_MIN_PLAYERS } from "@/domain/drawnguess/types";

export type LobbyReadinessGameKind = "whowhatwhere" | "hat" | "imposter" | "drawnguess";

export type LobbyReadinessPlayer = {
  readonly id: string;
  readonly name: string;
  readonly isHost: boolean;
  readonly teamIndex: number | null;
  readonly ready: boolean;
  readonly disconnectedAt: number | null;
};

export type LobbyStartBlockerCode =
  | "players-disconnected"
  | "player-count"
  | "team-size"
  | "hat-clues"
  | "players-not-ready";

export type LobbyStartBlocker = {
  readonly code: LobbyStartBlockerCode;
  readonly message: string;
};

export type LobbyStartReadiness = {
  readonly canStart: boolean;
  readonly blockers: readonly LobbyStartBlocker[];
};

export type LobbyReadinessInput = {
  readonly gameKind: LobbyReadinessGameKind;
  readonly teamCount: number;
  readonly teamNames: readonly string[];
  readonly players: readonly LobbyReadinessPlayer[];
  readonly hatClueDrafts: Readonly<Record<string, readonly string[]>>;
};

export function evaluateLobbyStartReadiness(input: LobbyReadinessInput): LobbyStartReadiness {
  const blockers: LobbyStartBlocker[] = [];
  const disconnected = input.players.filter((player) => player.disconnectedAt !== null);

  if (disconnected.length > 0) {
    blockers.push({
      code: "players-disconnected",
      message: `${formatNames(disconnected)} must reconnect before starting.`,
    });
  }

  const playerCountBlocker = getPlayerCountBlocker(input.gameKind, input.players.length);
  if (playerCountBlocker) {
    blockers.push(playerCountBlocker);
  }

  if (input.gameKind === "whowhatwhere" || input.gameKind === "hat") {
    const undersizedTeams = Array.from({ length: input.teamCount }, (_, teamIndex) => ({
      count: input.players.filter((player) => player.teamIndex === teamIndex).length,
      name: input.teamNames[teamIndex] ?? `Team ${teamIndex + 1}`,
    })).filter(({ count }) => count < MIN_PLAYERS_PER_TEAM);

    if (undersizedTeams.length > 0) {
      blockers.push({
        code: "team-size",
        message: `Each team needs at least ${MIN_PLAYERS_PER_TEAM} players (${undersizedTeams
          .map(({ name, count }) => `${name}: ${count}`)
          .join(", ")}).`,
      });
    }
  }

  if (input.gameKind === "hat") {
    const missingClues = input.players.filter((player) => {
      const clues = input.hatClueDrafts[player.id];
      return (
        clues?.length !== GAME_DEFAULTS.cluesPerPlayer ||
        clues.some((clue) => clue.trim().length === 0)
      );
    });

    if (missingClues.length > 0) {
      blockers.push({
        code: "hat-clues",
        message: `Waiting for ${formatNames(missingClues)} to enter ${GAME_DEFAULTS.cluesPerPlayer} famous figures.`,
      });
    }
  }

  const notReady = input.players.filter((player) => !player.isHost && !player.ready);
  if (notReady.length > 0) {
    blockers.push({
      code: "players-not-ready",
      message: `Waiting for ${formatNames(notReady)} to ready up.`,
    });
  }

  return { canStart: blockers.length === 0, blockers };
}

function getPlayerCountBlocker(
  gameKind: LobbyReadinessGameKind,
  playerCount: number,
): LobbyStartBlocker | null {
  if (
    gameKind === "imposter" &&
    (playerCount < IMPOSTER_MIN_PLAYERS || playerCount > IMPOSTER_MAX_PLAYERS)
  ) {
    return {
      code: "player-count",
      message: `Imposter needs ${IMPOSTER_MIN_PLAYERS}–${IMPOSTER_MAX_PLAYERS} players (currently ${playerCount}).`,
    };
  }

  if (
    gameKind === "drawnguess" &&
    (playerCount < DRAWNGUESS_MIN_PLAYERS || playerCount > DRAWNGUESS_MAX_PLAYERS)
  ) {
    return {
      code: "player-count",
      message: `DrawNGuess needs ${DRAWNGUESS_MIN_PLAYERS}–${DRAWNGUESS_MAX_PLAYERS} players (currently ${playerCount}).`,
    };
  }

  return null;
}

function formatNames(players: readonly Pick<LobbyReadinessPlayer, "name">[]): string {
  const names = players.map((player) => player.name);

  if (names.length <= 1) {
    return names[0] ?? "A player";
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(", ")}, and ${names.at(-1)}`;
}
