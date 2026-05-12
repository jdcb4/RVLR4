import type React from "react";

import type {
  ClueSubmissionMap,
  HatGameSession,
  Player,
  Team,
} from "@/domain/hat-game/types";

export type AppStep = 'landing' | 'settings' | 'team' | 'review' | 'clues' | 'game';

export type AppSnapshot = {
  step: AppStep;
  teamEditIndex: number;
  playerCount: number;
  teamCount: number;
  teams: Team[];
  players: Player[];
  clueSubmissions: ClueSubmissionMap;
  clueEntryIndex: number;
  clueEntryRevealed: boolean;
  handoffRevealed: boolean;
  session: HatGameSession | null;
  /** Setup preferences (used when starting `HatGameSession`; mirrors WWW Game settings). */
  turnDurationSeconds: number;
  skipsPerTurn: number;
};

export type StoragePayload = {
  schemaVersion: 1;
  lastSavedAt: string;
  snapshot: AppSnapshot;
};

export type ScreenModel = {
  content: React.ReactNode;
  actions?: React.ReactNode;
};

