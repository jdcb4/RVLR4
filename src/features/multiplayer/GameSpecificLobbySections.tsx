import { useMemo } from "react";

import { FooterIconSlotButton } from "@/components/game/GameFooterButtons";
import { TeamCountOptionGroup } from "@/components/setup/TeamCountOptionGroup";
import { GAME_DEFAULTS } from "@/config/hatDefaults";
import type { SharedTeamCount } from "@/config/teamRoster";
import { maxImpostersForPlayers } from "@/domain/imposter/round";
import { HAT_CLUE_INPUT_CLASS } from "@/features/hat-game/screens/hatScreenTokens";
import { SettingsScreen } from "@/features/whowhatwhere/setup/SettingsScreen";
import type { LobbyDto, RoomSyncPayload } from "@/multiplayer/roomTypes";

type EmitWithAck = (
  event: string,
  body?: unknown,
) => Promise<{ ok?: boolean; error?: string } | undefined>;

export function GameSpecificLobbySections({
  sync,
  lobby,
  isHost,
  myPlayerId,
  emitWithAck,
}: {
  readonly sync: RoomSyncPayload;
  readonly lobby: LobbyDto;
  readonly isHost: boolean;
  readonly myPlayerId: string;
  readonly emitWithAck: EmitWithAck;
}) {
  return (
    <>
      {sync.gameKind === "hat" ? (
        <HatLobbyFamousFiguresSection
          clueSlots={GAME_DEFAULTS.cluesPerPlayer}
          drafts={lobby.hatClueDrafts[myPlayerId] ?? []}
          emitWithAck={emitWithAck}
        />
      ) : null}

      {sync.gameKind === "imposter" ? (
        <ImposterLobbyCard emitWithAck={emitWithAck} isHost={isHost} lobby={lobby} />
      ) : null}

      {sync.gameKind === "whowhatwhere" && isHost ? (
        <WhoWhatWhereSettingsCard emitWithAck={emitWithAck} lobby={lobby} />
      ) : null}

      {sync.gameKind === "hat" && isHost ? (
        <HatTeamCountCard emitWithAck={emitWithAck} lobby={lobby} />
      ) : null}
    </>
  );
}

function HatLobbyFamousFiguresSection({
  emitWithAck,
  drafts,
  clueSlots,
}: {
  readonly emitWithAck: EmitWithAck;
  readonly drafts: readonly string[];
  readonly clueSlots: number;
}) {
  const rowValues = useMemo(() => {
    const padded = [...drafts];

    while (padded.length < clueSlots) {
      padded.push("");
    }

    return padded.slice(0, clueSlots);
  }, [drafts, clueSlots]);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-typ-card-title font-semibold">Your famous figures</p>
      <p className="mt-1 text-typ-ui-snug text-muted-foreground">
        Enter six people or characters your table will recognize. Tap the lightning if you want a
        random suggestion for that row.
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-typ-ui">
          <tbody>
            {Array.from({ length: clueSlots }).map((_, index) => (
              <tr className="border-b border-border last:border-b-0" key={index}>
                <td className="py-2 pr-2 align-middle tabular-nums text-muted-foreground">
                  {index + 1}
                </td>
                <td className="py-2 pr-2 align-middle">
                  <input
                    className={`${HAT_CLUE_INPUT_CLASS} w-full min-w-0`}
                    maxLength={GAME_DEFAULTS.maxClueLength}
                    placeholder="Enter a famous figure"
                    value={rowValues[index] ?? ""}
                    onChange={(event) => {
                      void emitWithAck("lobby:hatSetClueCell", {
                        clueIndex: index,
                        value: event.target.value,
                      });
                    }}
                  />
                </td>
                <td className="w-14 py-2 align-middle">
                  <FooterIconSlotButton
                    icon={<span aria-hidden="true">{"\u26a1"}</span>}
                    label="Lightning suggestion"
                    onClick={() => {
                      void emitWithAck("lobby:hatSuggestClue", { clueIndex: index });
                    }}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function ImposterLobbyCard({
  lobby,
  isHost,
  emitWithAck,
}: {
  readonly lobby: LobbyDto;
  readonly isHost: boolean;
  readonly emitWithAck: EmitWithAck;
}) {
  const playerCount = lobby.players.length;
  const maxImposters = maxImpostersForPlayers(playerCount);
  const options = Array.from({ length: maxImposters }, (_, index) => index + 1);

  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <p className="text-typ-card-title font-semibold">Imposter setup</p>
      <p className="mt-1 text-typ-ui-snug text-muted-foreground">
        Everyone in this room plays ({playerCount} {playerCount === 1 ? "player" : "players"}). At
        least 4 players are required to start.
      </p>
      {isHost ? (
        <>
          <label className="mt-4 block text-typ-ui font-medium" htmlFor="imposter-count">
            Number of imposters
          </label>
          <select
            className="mt-2 w-full max-w-xs rounded-xl border border-input bg-background px-3 py-2 text-typ-ui"
            id="imposter-count"
            value={lobby.imposterImposterCount}
            onChange={(event) => {
              void emitWithAck("lobby:hostPatchImposterCounts", {
                imposterImposterCount: Number(event.target.value),
              });
            }}
          >
            {options.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
          {playerCount < 6 ? (
            <p className="mt-2 text-typ-ui-snug text-muted-foreground">
              With fewer than six players, only one imposter is allowed.
            </p>
          ) : null}
        </>
      ) : (
        <p className="mt-4 text-typ-ui text-muted-foreground">
          Imposters this round:{" "}
          <span className="font-semibold text-foreground">{lobby.imposterImposterCount}</span>
        </p>
      )}
    </section>
  );
}

function WhoWhatWhereSettingsCard({
  lobby,
  emitWithAck,
}: {
  readonly lobby: LobbyDto;
  readonly emitWithAck: EmitWithAck;
}) {
  return (
    <details className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <summary className="cursor-pointer text-typ-card-title font-semibold">
        Who What Where settings
      </summary>
      <div className="mt-4">
        <SettingsScreen
          embedded
          settings={lobby.wwwSettings}
          onChange={(next) => {
            void emitWithAck("lobby:hostPatchWhoWhatWhereSettings", {
              patch: next,
            });
          }}
        />
      </div>
    </details>
  );
}

function HatTeamCountCard({
  lobby,
  emitWithAck,
}: {
  readonly lobby: LobbyDto;
  readonly emitWithAck: EmitWithAck;
}) {
  return (
    <details className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <summary className="cursor-pointer text-typ-card-title font-semibold">Number of teams</summary>
      <div className="mt-4">
        <TeamCountOptionGroup
          value={lobby.teamCount as SharedTeamCount}
          onChange={(count) => {
            void emitWithAck("lobby:hostSetTeamCount", { teamCount: count });
          }}
        />
      </div>
    </details>
  );
}
