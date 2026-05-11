import type { HatGameSession } from "@/domain/hat-game/types";
import type { GameSettings, MatchState } from "@/domain/whowhatwhere/types";
import type { ImposterSnapshot } from "@/features/imposter/imposterAppTypes";

/** Mirrors `server/sync.ts` — lightweight typing without a shared package boundary. */
export type LobbyPlayerDto = {
  readonly id: string;
  readonly name: string;
  readonly isHost: boolean;
  readonly teamIndex: number | null;
  readonly ready: boolean;
  readonly disconnectedAt: number | null;
};

export type LobbyDto = {
  readonly teamCount: number;
  readonly teamNames: readonly string[];
  readonly wwwSettings: GameSettings;
  readonly hatTurnDurationSeconds: number;
  readonly hatSkipsPerTurn: number;
  readonly imposterPlayerCount: number;
  readonly imposterImposterCount: number;
  readonly players: readonly LobbyPlayerDto[];
  readonly hatClueDrafts: Record<string, readonly string[]>;
};

export type WhoWhatWherePeerRole = "describer" | "guesser" | "observer";

export type WhoWhatWhereSyncDto = {
  readonly match: MatchState;
  readonly role: WhoWhatWherePeerRole;
  readonly readyReveal: boolean;
  readonly showTurnFooter: boolean;
  readonly canReturnSkipped: boolean;
};

export type HatPeerRole = "describer" | "guesser" | "observer";

export type HatSyncDto = {
  readonly session: HatGameSession;
  readonly role: HatPeerRole;
  readonly readyReveal: boolean;
  readonly showTurnFooter: boolean;
  readonly canReturnSkipped: boolean;
};

/** Mirrors `server/sync.ts` — scrubbed snapshot + reveal rotation hints for the viewer. */
export type ImposterSyncDto = {
  readonly snapshot: ImposterSnapshot;
  readonly revealSubjectId: string | null;
  readonly revealSubjectIsImposter: boolean;
};

export type RoomSyncPayload = {
  readonly code: string;
  readonly gameKind: "whowhatwhere" | "hat" | "imposter";
  readonly phase: "lobby" | "playing" | "ended";
  readonly you: {
    readonly playerId: string;
    readonly isHost: boolean;
  };
  readonly lobby: LobbyDto | null;
  readonly www: WhoWhatWhereSyncDto | null;
  readonly hat: HatSyncDto | null;
  readonly imposter: ImposterSyncDto | null;
  readonly replay: {
    readonly offerActive: boolean;
    readonly acceptedIds: readonly string[];
    readonly cancelledByDisconnect: boolean;
  };
};
