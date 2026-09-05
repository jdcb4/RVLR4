import { useEffect, useMemo, useRef, useState } from "react";

import { FooterIconSlotButton } from "@/components/game/GameFooterButtons";
import { TeamCountOptionGroup } from "@/components/setup/TeamCountOptionGroup";
import { GAME_DEFAULTS } from "@/config/hatDefaults";
import type { SharedTeamCount } from "@/config/teamRoster";
import { maxImpostersForPlayers } from "@/domain/imposter/round";
import type { LobbyDto, RoomSyncPayload } from "@/domain/multiplayer/protocol";
import type { EmitWithAck } from "@/domain/multiplayer/protocol";
import { HAT_CLUE_INPUT_CLASS } from "@/features/hat-game/screens/hatScreenTokens";
import { SettingsScreen } from "@/features/whowhatwhere/setup/SettingsScreen";
import { keepKeyboardSafeInputVisible } from "@/lib/keyboardSafeInput";

export function GameSpecificLobbySections({
  sync,
  lobby,
  isHost,
  emitWithAck,
}: {
  readonly sync: RoomSyncPayload;
  readonly lobby: LobbyDto;
  readonly isHost: boolean;
  readonly emitWithAck: EmitWithAck;
}) {
  return (
    <>
      {sync.gameKind === "hat" ? (
        <HatLobbyFamousFiguresSection
          clueSlots={GAME_DEFAULTS.cluesPerPlayer}
          drafts={lobby.myHatClueDrafts}
          emitWithAck={emitWithAck}
        />
      ) : null}

      {sync.gameKind === "imposter" ? (
        <ImposterLobbyCard emitWithAck={emitWithAck} isHost={isHost} lobby={lobby} />
      ) : null}

      {sync.gameKind === "drawnguess" ? (
        <DrawNGuessLobbySettingsCard emitWithAck={emitWithAck} isHost={isHost} lobby={lobby} />
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

function DrawNGuessLobbySettingsCard({
  lobby,
  isHost,
  emitWithAck,
}: {
  readonly lobby: LobbyDto;
  readonly isHost: boolean;
  readonly emitWithAck: EmitWithAck;
}) {
  const settings = lobby.drawnguessSettings;
  const drawSeconds = Math.round(settings.drawingDurationMs / 1000);
  const guessSeconds = Math.round(settings.guessDurationMs / 1000);
  const modeLabel =
    settings.startingPromptMode === "predetermined"
      ? "Predetermined words"
      : "Players pick prompts";

  return (
    <details className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <summary className="cursor-pointer text-typ-card-title font-semibold">
        DrawNGuess settings
      </summary>
      <div className="mt-4 space-y-4">
        <p className="text-typ-ui-snug text-muted-foreground">
          Mode: <span className="font-semibold text-foreground">{modeLabel}</span>. Drawing is{" "}
          <span className="font-semibold text-foreground">{drawSeconds}s</span>; guessing is{" "}
          <span className="font-semibold text-foreground">{guessSeconds}s</span>.
        </p>

        {isHost ? (
          <>
            <label className="block text-typ-ui font-medium" htmlFor="drawnguess-prompt-mode">
              Starting prompts
            </label>
            <select
              className="w-full rounded-xl border border-input bg-background px-3 py-2 text-typ-ui"
              id="drawnguess-prompt-mode"
              value={settings.startingPromptMode}
              onChange={(event) => {
                void emitWithAck("lobby:hostPatchDrawNGuessSettings", {
                  startingPromptMode: event.target.value === "custom" ? "custom" : "predetermined",
                });
              }}
            >
              <option value="predetermined">Predetermined words</option>
              <option value="custom">Players pick their own prompt</option>
            </select>

            <TimerSelect
              id="drawnguess-draw-timer"
              label="Drawing timer"
              durationMs={settings.drawingDurationMs}
              values={[45000, 60000, 90000, 120000]}
              onChange={(durationMs) => {
                void emitWithAck("lobby:hostPatchDrawNGuessSettings", {
                  drawingDurationMs: durationMs,
                });
              }}
            />

            <TimerSelect
              id="drawnguess-guess-timer"
              label="Guessing timer"
              durationMs={settings.guessDurationMs}
              values={[20000, 30000, 45000, 60000]}
              onChange={(durationMs) => {
                void emitWithAck("lobby:hostPatchDrawNGuessSettings", {
                  guessDurationMs: durationMs,
                });
              }}
            />
          </>
        ) : (
          <p className="text-typ-ui text-muted-foreground">
            The host can change these before starting the game.
          </p>
        )}
      </div>
    </details>
  );
}

function TimerSelect<const Value extends number>({
  id,
  label,
  durationMs,
  values,
  onChange,
}: {
  readonly id: string;
  readonly label: string;
  readonly durationMs: number;
  readonly values: readonly Value[];
  readonly onChange: (durationMs: Value) => void;
}) {
  return (
    <div>
      <label className="block text-typ-ui font-medium" htmlFor={id}>
        {label}
      </label>
      <select
        className="mt-2 w-full rounded-xl border border-input bg-background px-3 py-2 text-typ-ui"
        id={id}
        value={durationMs}
        onChange={(event) => {
          const selected = values.find((value) => String(value) === event.target.value);
          if (selected !== undefined) onChange(selected);
        }}
      >
        {values.map((value) => (
          <option key={value} value={value}>
            {value / 1000} seconds
          </option>
        ))}
      </select>
    </div>
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
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[280px] border-collapse text-typ-ui">
          <tbody>
            {Array.from({ length: clueSlots }).map((_, index) => (
              <tr className="border-b border-border last:border-b-0" key={index}>
                <td className="py-1 pr-2 align-middle tabular-nums text-muted-foreground">
                  {index + 1}
                </td>
                <td className="py-1 pr-2 align-middle">
                  <HatClueDraftInput
                    clueIndex={index}
                    emitWithAck={emitWithAck}
                    isLast={index === clueSlots - 1}
                    value={rowValues[index] ?? ""}
                  />
                </td>
                <td className="w-14 py-1 align-middle">
                  <FooterIconSlotButton
                    compact
                    icon={<span aria-hidden="true">{"\u26a1"}</span>}
                    label={`Suggest famous figure ${index + 1}`}
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

function HatClueDraftInput({
  clueIndex,
  isLast,
  value,
  emitWithAck,
}: {
  readonly clueIndex: number;
  readonly isLast: boolean;
  readonly value: string;
  readonly emitWithAck: EmitWithAck;
}) {
  const [draft, setDraft] = useState(value);
  const focusedRef = useRef(false);
  const latestDraftRef = useRef(value);
  const serverValueRef = useRef(value);
  const lastSentRef = useRef(value);
  const debounceRef = useRef<number | null>(null);

  useEffect(() => {
    latestDraftRef.current = draft;
  }, [draft]);

  useEffect(() => {
    serverValueRef.current = value;

    if (!focusedRef.current) {
      setDraft(value);
      lastSentRef.current = value;
    }
  }, [value]);

  useEffect(
    () => () => {
      if (debounceRef.current !== null) {
        window.clearTimeout(debounceRef.current);
      }
    },
    [],
  );

  const flushDraft = (next = latestDraftRef.current) => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (next === lastSentRef.current && next === serverValueRef.current) {
      return;
    }

    lastSentRef.current = next;
    void emitWithAck("lobby:hatSetClueCell", {
      clueIndex,
      value: next,
    });
  };

  const scheduleFlush = (next: string) => {
    if (debounceRef.current !== null) {
      window.clearTimeout(debounceRef.current);
    }

    debounceRef.current = window.setTimeout(() => flushDraft(next), 250);
  };

  return (
    <input
      aria-label={`Famous figure ${clueIndex + 1}`}
      autoCapitalize="words"
      autoComplete="off"
      className={`${HAT_CLUE_INPUT_CLASS} w-full min-w-0`}
      data-hat-clue-index={clueIndex}
      enterKeyHint={isLast ? "done" : "next"}
      inputMode="text"
      maxLength={GAME_DEFAULTS.maxClueLength}
      placeholder="Enter a famous figure"
      spellCheck={false}
      type="text"
      value={draft}
      onBlur={() => {
        focusedRef.current = false;
        flushDraft();
      }}
      onChange={(event) => {
        const next = event.target.value;
        setDraft(next);
        scheduleFlush(next);
      }}
      onFocus={(event) => {
        focusedRef.current = true;
        keepKeyboardSafeInputVisible(event.currentTarget);
      }}
      onKeyDown={(event) => {
        if (event.key !== "Enter" || event.nativeEvent.isComposing) {
          return;
        }

        event.preventDefault();
        flushDraft(event.currentTarget.value);
        const nextInput = event.currentTarget
          .closest("section")
          ?.querySelector<HTMLInputElement>(`[data-hat-clue-index="${clueIndex + 1}"]`);
        if (nextInput) {
          nextInput.focus();
        } else {
          event.currentTarget.blur();
        }
      }}
    />
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
      <summary className="cursor-pointer text-typ-card-title font-semibold">
        Number of teams
      </summary>
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
