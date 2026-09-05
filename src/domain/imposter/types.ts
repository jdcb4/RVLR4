export type ImposterStep =
  | "landing"
  | "settings"
  | "roster"
  | "review"
  | "reveal"
  | "guidePregame"
  | "guidePrediscussion"
  | "guideWarning"
  | "results";

export type ImposterPlayer = {
  readonly id: string;
  readonly name: string;
  readonly avatarId?: string | undefined;
};

/** Active round: assignments + pass-and-play reveal progress. */
export type ImposterRoundState = {
  readonly secretWord: string;
  readonly imposterPlayerIds: readonly string[];
  /** Pass-and-play: single-phone sequential reveal. */
  revealPlayerIndex: number;
  revealRevealed: boolean;
  /**
   * Multiplayer: everyone reveals on their own device at once.
   * When present, `revealPlayerIndex` / `revealRevealed` are ignored by the server.
   */
  parallelRoleSeen?: Record<string, boolean>;
  parallelRevealDone?: Record<string, boolean>;
};

export type ImposterSnapshot = {
  step: ImposterStep;
  playerCount: number;
  imposterCount: number;
  players: ImposterPlayer[];
  round: ImposterRoundState | null;
  /** Random starter for the clue circle (set when leaving parallel reveal). */
  cluesStartPlayerId?: string | null;
};
