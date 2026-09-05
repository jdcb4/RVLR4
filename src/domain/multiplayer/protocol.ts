import type { z } from "zod";

import type { DrawNGuessSettings, DrawNGuessSyncDto } from "@/domain/drawnguess/types";
import type { HatGameSession } from "@/domain/hat-game/types";
import type { ImposterSnapshot } from "@/domain/imposter/types";
import type { LobbyStartReadiness } from "@/domain/multiplayer/lobbyReadiness";
import type { GameSettings, MatchState } from "@/domain/whowhatwhere/types";
import type { AvatarId } from "@/multiplayer/avatarCatalog";

import type { gameKindSchema } from "./sessionCredentials";
import type { SocketEventName, socketSchemas } from "./socketSchemas";

/** Shared wire shapes. Server projections remain responsible for hiding private data. */
export type LobbyPlayerDto = {
  readonly id: string;
  readonly name: string;
  readonly avatarId: AvatarId;
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
  readonly drawnguessSettings: DrawNGuessSettings;
  readonly players: readonly LobbyPlayerDto[];
  readonly myHatClueDrafts: readonly string[];
  readonly startReadiness: LobbyStartReadiness;
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

/** Scrubbed snapshot and reveal hints for the authenticated viewer. */
export type ImposterSyncDto = {
  readonly snapshot: ImposterSnapshot;
  readonly revealSubjectId: string | null;
  readonly revealSubjectIsImposter: boolean;
};

export type RoomSyncPayload = {
  readonly code: string;
  readonly gameKind: GameKind;
  readonly phase: RoomPhase;
  readonly you: {
    readonly playerId: string;
    readonly isHost: boolean;
  };
  readonly lobby: LobbyDto | null;
  readonly www: WhoWhatWhereSyncDto | null;
  readonly hat: HatSyncDto | null;
  readonly imposter: ImposterSyncDto | null;
  readonly drawnguess: DrawNGuessSyncDto | null;
  readonly replay: {
    readonly offerActive: boolean;
    readonly offerId?: string;
    readonly acceptedIds: readonly string[];
    readonly cancelledByDisconnect: boolean;
  };
};

export type GameKind = z.infer<typeof gameKindSchema>;
export type RoomPhase = "lobby" | "playing" | "ended";
export type ReplaySync = RoomSyncPayload["replay"];

export type SocketErrorCode =
  | "INVALID_REQUEST"
  | "PAYLOAD_TOO_LARGE"
  | "RATE_LIMITED"
  | "INTERNAL_ERROR"
  | "ROOM_NOT_FOUND"
  | "SESSION_EXPIRED";
/** Unknown future server codes may be displayed by older clients. */
export type SocketReply = { ok: boolean; error?: string; code?: string };
export type SocketAck = (reply: SocketReply & { code?: SocketErrorCode }) => void;

type ReadonlyInput<T> = T extends object ? { readonly [K in keyof T]: ReadonlyInput<T[K]> } : T;
export type SocketInput<E extends SocketEventName> = ReadonlyInput<
  z.input<(typeof socketSchemas)[E]>
>;
/** A union of correlated tuples prevents a payload for one event being sent to another. */
export type SocketRequestArgs<E extends SocketEventName = SocketEventName> =
  E extends SocketEventName
    ? undefined extends SocketInput<E>
      ? [event: E, payload?: SocketInput<E>]
      : [event: E, payload: SocketInput<E>]
    : never;
export type EmitWithAck = (...args: SocketRequestArgs) => Promise<SocketReply>;
export type { SocketEventName } from "./socketSchemas";
