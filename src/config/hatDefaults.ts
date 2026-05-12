export type HatGameConfig = {
  minPlayers: number;
  maxPlayers: number;
  minTeams: number;
  maxTeams: number;
  turnDurationSeconds: number;
  cluesPerPlayer: number;
  skipsPerTurn: number;
  maxClueLength: number;
  maxNameLength: number;
};

export const GAME_DEFAULTS: HatGameConfig = {
  /** 2 teams × 2 players minimum; 4 teams × 6 players maximum. */
  minPlayers: 4,
  maxPlayers: 24,
  minTeams: 2,
  maxTeams: 4,
  turnDurationSeconds: 45,
  cluesPerPlayer: 6,
  skipsPerTurn: 1,
  maxClueLength: 80,
  maxNameLength: 24
} as const;
