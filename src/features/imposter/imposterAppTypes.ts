import type React from "react";

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
};

/** Active round: assignments + pass-and-play reveal progress. */
export type ImposterRoundState = {
  readonly secretWord: string;
  readonly imposterPlayerIds: readonly string[];
  revealPlayerIndex: number;
  revealRevealed: boolean;
};

export type ImposterSnapshot = {
  step: ImposterStep;
  playerCount: number;
  imposterCount: number;
  players: ImposterPlayer[];
  round: ImposterRoundState | null;
};

export type ImposterStoragePayload = {
  schemaVersion: 1;
  lastSavedAt: string;
  snapshot: ImposterSnapshot;
};

export type ScreenModel = {
  content: React.ReactNode;
  actions?: React.ReactNode;
};
