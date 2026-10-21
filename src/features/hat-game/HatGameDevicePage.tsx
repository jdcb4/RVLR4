import { Check, Pause, SkipForward, WandSparkles } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { FooterActionLockContext } from "@/components/footerActionLockContext";
import {
  DeviceSetupSteps,
  DeviceTeamReview,
  DeviceTeamSetup,
} from "@/components/game/DeviceTeamSetup";
import { PrimaryFooterButton, SecondaryFooterButton } from "@/components/game/GameFooterButtons";
import { GameShell } from "@/components/GameShell";
import { IconTopHat } from "@/components/icons";
import { OptionButton, OptionGroup } from "@/components/setup/OptionGroup";
import { Button } from "@/components/ui/button";
import { GAME_DEFAULTS } from "@/config/hatDefaults";
import { getHatGameContext, getHatGamePhaseMeta } from "@/domain/hat-game/engine";
import { hatStateToRosterRows } from "@/domain/hat-game/setup";
import { useDeviceController } from "@/features/game-app-hooks/useDeviceController";
import { HatDeviceController } from "@/features/hat-game/hatDeviceController";
import {
  HatDeviceReady,
  HatDeviceRecap,
  HatDeviceResults,
  HatDeviceTurn,
} from "@/features/hat-game/HatDevicePlay";
import { HAT_CLUE_INPUT_CLASS } from "@/features/hat-game/screens/hatScreenTokens";
import { formatSavedAt } from "@/lib/formatSavedAt";
import { keepKeyboardSafeInputVisible } from "@/lib/keyboardSafeInput";

type HatDeviceView = ReturnType<HatDeviceController["getSnapshot"]>;

function HatDeviceClues({
  game,
  controller,
}: {
  readonly game: HatDeviceView;
  readonly controller: HatDeviceController;
}) {
  const snapshot = game.session.snapshot;
  const player = snapshot.players[snapshot.clueEntryIndex];
  if (!player) return null;
  if (!snapshot.clueEntryRevealed || game.saving)
    return (
      <section className="flex flex-1 flex-col justify-center gap-3">
        <h2 className="break-words text-typ-section-title font-semibold">Pass to {player.name}.</h2>
        <p className="text-typ-body text-muted-foreground">
          Only {player.name} should look. Enter {GAME_DEFAULTS.cluesPerPlayer} people or characters
          that most players will know.
        </p>
        <p className="text-typ-ui text-muted-foreground">
          Player {snapshot.clueEntryIndex + 1} of {snapshot.players.length}
        </p>
      </section>
    );
  const clues = snapshot.clueSubmissions[player.id]?.clues ?? [];
  return (
    <section className="flex flex-col gap-3">
      <h2 className="break-words text-typ-section-title font-semibold">
        {player.name}’s famous figures
      </h2>
      <p className="text-typ-ui text-muted-foreground">
        Keep these private. Everyone’s figures go into the same hat.
      </p>
      <div className="space-y-2">
        {clues.map((clue, index) => (
          <div key={`${player.id}-${index}`} className="flex items-center gap-2">
            <label className="min-w-0 flex-1">
              <span className="sr-only">Famous figure {index + 1}</span>
              <input
                className={HAT_CLUE_INPUT_CLASS}
                autoComplete="off"
                autoCapitalize="words"
                data-hat-device-clue={index}
                enterKeyHint={index === clues.length - 1 ? "done" : "next"}
                maxLength={GAME_DEFAULTS.maxClueLength}
                placeholder={`Famous figure ${index + 1}`}
                spellCheck={false}
                value={clue}
                onChange={(event) => controller.updateClue(index, event.target.value)}
                onFocus={(event) => keepKeyboardSafeInputVisible(event.currentTarget)}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                  event.preventDefault();
                  const next = event.currentTarget
                    .closest("section")
                    ?.querySelector<HTMLInputElement>(`[data-hat-device-clue="${index + 1}"]`);
                  if (next) next.focus();
                  else event.currentTarget.blur();
                }}
              />
            </label>
            <Button
              aria-label={`Suggest famous figure ${index + 1}`}
              className="size-11 shrink-0"
              variant="outline"
              onClick={() => controller.suggestClue(index)}
            >
              <WandSparkles className="size-4" />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

function HatDeviceContent({
  game,
  controller,
  confirm,
}: {
  readonly game: HatDeviceView;
  readonly controller: HatDeviceController;
  readonly confirm: "replace" | "discard" | null;
}) {
  const session = game.session;
  const snapshot = session.snapshot;
  const match = snapshot.session;
  const context = match ? getHatGameContext(match) : null;
  if (!game.loaded) return <p role="status">Loading saved game…</p>;
  if (game.storageError)
    return (
      <section className="flex flex-1 flex-col justify-center gap-3">
        <h2 className="text-typ-section-title font-semibold">
          {confirm === "discard"
            ? "Discard saved game?"
            : game.hydrationFailed
              ? "Saved game unavailable"
              : "Progress needs saving"}
        </h2>
        <p className="text-typ-body">
          {confirm === "discard"
            ? "Its setup, figures and progress will be removed."
            : game.hydrationFailed
              ? "Your saved game has been kept. Retry loading, or deliberately discard it."
              : "Your latest progress is still in memory. Retry saving before continuing."}
        </p>
        <p role="alert" className="text-typ-ui text-destructive">
          {game.storageError}
        </p>
      </section>
    );
  if (confirm === "replace")
    return (
      <section className="flex flex-1 flex-col justify-center gap-3">
        <h2 className="text-typ-section-title font-semibold">Replace the saved game?</h2>
        <p className="text-typ-body text-muted-foreground">
          Keep the teams and settings. The current game and private figures will be removed.
        </p>
      </section>
    );
  if (game.savedGameAvailable)
    return (
      <section className="flex flex-1 flex-col justify-center gap-3">
        <h2 className="text-typ-section-title font-semibold">Ready when you are.</h2>
        <div className="space-y-2 rounded-xl bg-card p-4">
          <h3 className="text-typ-body font-semibold">Saved Hat Game</h3>
          <p className="text-typ-ui text-muted-foreground">{formatSavedAt(session.savedAt)}</p>
          {match ? (
            <>
              <p className="break-words text-typ-body">
                {context?.activeDescriberName} · {context?.activeTeam?.name}
              </p>
              <p className="text-typ-ui text-muted-foreground">
                Phase {match.phaseNumber}: {getHatGamePhaseMeta(match.phaseNumber).name}
                {match.stage === "turn"
                  ? ` · ${Math.ceil((session.remainingMs ?? 0) / 1000)} seconds remaining`
                  : session.recap || match.stage === "finalSummary"
                    ? " · Turn recap"
                    : " · Ready to play"}
              </p>
            </>
          ) : (
            <p className="text-typ-body">
              {snapshot.teamCount} teams ·{" "}
              {snapshot.step === "clues" ? "Private figure entry" : "Setup"}
            </p>
          )}
        </div>
      </section>
    );
  if (!game.deviceActive || (session.paused && !game.saving))
    return (
      <section className="flex flex-1 flex-col justify-center gap-3">
        <h2 className="text-typ-section-title font-semibold">Take your time.</h2>
        <p className="break-words text-typ-body">
          {match
            ? `${context?.activeDescriberName} · ${context?.activeTeam?.name}`
            : "Setup paused."}
        </p>
        {match?.stage === "turn" ? (
          <p className="text-typ-body text-muted-foreground">
            {Math.ceil((session.remainingMs ?? 0) / 1000)} seconds remaining
            <br />
            {match.activeTurn?.correctCount} correct this turn
          </p>
        ) : null}
      </section>
    );
  if (match) {
    if (session.recap || match.stage === "finalSummary") return <HatDeviceRecap match={match} />;
    if (match.stage === "ready") return <HatDeviceReady match={match} />;
    if (match.stage === "turn")
      return (
        <HatDeviceTurn
          match={match}
          saving={game.saving}
          seconds={Math.ceil((session.remainingMs ?? 0) / 1000)}
          onReturnSkipped={(index) =>
            controller.action({ type: "return-skipped-clue", payload: { poolIndex: index } })
          }
        />
      );
    return <HatDeviceResults match={match} />;
  }
  const rows = hatStateToRosterRows(snapshot.teams, snapshot.players);
  return (
    <>
      {snapshot.step === "settings" || snapshot.step === "team" || snapshot.step === "review" ? (
        <DeviceSetupSteps current={snapshot.step} />
      ) : null}
      {snapshot.step === "settings" ? (
        <section className="space-y-5">
          <h2 className="text-typ-section-title font-semibold">Game settings</h2>
          <OptionGroup inlineLayout label="Teams">
            {[2, 3, 4].map((count) => (
              <OptionButton
                key={count}
                selected={snapshot.teamCount === count}
                onClick={() => controller.updateSettings({ ...snapshot, teamCount: count })}
              >
                {count}
              </OptionButton>
            ))}
          </OptionGroup>
          <OptionGroup inlineLayout label="Turn length">
            {[30, 45].map((seconds) => (
              <OptionButton
                key={seconds}
                selected={snapshot.turnDurationSeconds === seconds}
                onClick={() =>
                  controller.updateSettings({ ...snapshot, turnDurationSeconds: seconds })
                }
              >
                {seconds}s
              </OptionButton>
            ))}
          </OptionGroup>
          <OptionGroup inlineLayout label="Skips">
            {[1, 2, 3].map((skips) => (
              <OptionButton
                key={skips}
                selected={snapshot.skipsPerTurn === skips}
                onClick={() => controller.updateSettings({ ...snapshot, skipsPerTurn: skips })}
              >
                {skips}
              </OptionButton>
            ))}
          </OptionGroup>
          <p className="text-typ-ui text-muted-foreground">
            Six famous figures per player. Three phases: Describe, One Word, then Charades. Correct
            guesses score one point.
          </p>
        </section>
      ) : null}
      {snapshot.step === "team" ? (
        <DeviceTeamSetup
          teams={rows}
          teamIndex={snapshot.teamEditIndex}
          error=""
          onTeamsChange={controller.setRoster}
          onAddPlayer={controller.addPlayer}
          onRemovePlayer={controller.removePlayer}
          onPlayerNameChange={controller.updatePlayerName}
        />
      ) : null}
      {snapshot.step === "review" ? <DeviceTeamReview teams={rows} /> : null}
      {snapshot.step === "clues" ? <HatDeviceClues controller={controller} game={game} /> : null}
    </>
  );
}

export function HatGameDevicePage() {
  const { controller, view: game } = useDeviceController(() => new HatDeviceController());
  const [confirm, setConfirm] = useState<"replace" | "discard" | null>(null);
  const navigate = useNavigate();
  const leave = useCallback(() => {
    void controller.leaveGame().then((saved) => {
      if (saved) navigate("/passnplay");
    });
  }, [controller, navigate]);
  const snapshot = game.session.snapshot;
  const match = snapshot.session;
  const paused = game.session.paused;
  const back = useCallback(() => {
    if (confirm) setConfirm(null);
    else if (
      game.savedGameAvailable ||
      paused ||
      game.hydrationFailed ||
      match?.stage === "results"
    )
      leave();
    else if (match || snapshot.step === "clues") controller.pauseGame();
    else if (snapshot.step === "team") controller.backTeam();
    else if (snapshot.step === "review") controller.editTeams();
    else leave();
  }, [
    confirm,
    game.savedGameAvailable,
    game.hydrationFailed,
    paused,
    match,
    snapshot.step,
    controller,
    leave,
  ]);
  useEffect(() => {
    const handleBack = (event: Event) => {
      event.preventDefault();
      back();
    };
    window.addEventListener("rvlry:back", handleBack);
    return () => window.removeEventListener("rvlry:back", handleBack);
  }, [back]);
  const primary = (label: string, action: () => void) => (
    <PrimaryFooterButton label={label} onClick={action} />
  );
  const secondary = (label: string, action: () => void) => (
    <SecondaryFooterButton label={label} onClick={action} />
  );
  let footer: ReactNode = null;
  if (game.loaded) {
    if (game.storageError)
      footer =
        confirm === "discard" ? (
          <>
            {primary("Discard saved game", () => {
              void controller.discardUnavailableSave().then(() => setConfirm(null));
            })}
            {secondary("Cancel", () => setConfirm(null))}
          </>
        ) : (
          <>
            {primary(game.hydrationFailed ? "Retry loading" : "Retry saving", () => {
              void controller.retrySave();
            })}
            {game.hydrationFailed
              ? secondary("Discard saved game", () => setConfirm("discard"))
              : null}
          </>
        );
    else if (confirm === "replace")
      footer = (
        <>
          {primary("Replace game and review setup", () => {
            void controller.startNewGame().then(() => setConfirm(null));
          })}
          {secondary("Keep saved game", () => setConfirm(null))}
        </>
      );
    else if (game.savedGameAvailable)
      footer = (
        <>
          {primary("Resume game", () => {
            void controller.openSavedGame();
          })}
          {secondary("Start new game", () => setConfirm("replace"))}
        </>
      );
    else if (paused && !game.saving)
      footer = (
        <>
          {primary(
            match?.stage === "turn"
              ? `Resume ${getHatGameContext(match).activeDescriberName}’s turn`
              : "Continue",
            () => {
              void controller.resumeGame();
            },
          )}
          {secondary("Save and leave", leave)}
          {match?.stage === "turn" ? (
            <Button variant="ghost" onClick={controller.endPausedTurn}>
              End turn
            </Button>
          ) : null}
          <Button variant="ghost" onClick={() => setConfirm("replace")}>
            Start new game
          </Button>
        </>
      );
    else if (match) {
      if (game.session.recap || match.stage === "finalSummary")
        footer = primary(
          match.stage === "finalSummary"
            ? "Final scores"
            : `Pass phone to ${getHatGameContext(match).activeDescriberName}`,
          controller.advanceRecap,
        );
      else if (match.stage === "ready")
        footer = (
          <>
            {primary(`I’m ${getHatGameContext(match).activeDescriberName}, start turn`, () =>
              controller.action({ type: "start-turn" }),
            )}
            <Button variant="ghost" onClick={leave}>
              Save and leave
            </Button>
          </>
        );
      else if (match.stage === "turn")
        footer = (
          <>
            <div className="grid grid-cols-[1fr_2fr] gap-3">
              <Button
                className="min-h-[4.75rem] border-semantic-skipped-border bg-semantic-skipped-bg text-semantic-skipped-foreground"
                variant="outline"
                disabled={game.saving || (match.activeTurn?.skipsRemaining ?? 0) <= 0}
                onClick={() => controller.action({ type: "skip-clue" })}
              >
                <SkipForward className="size-5" />
                Skip
              </Button>
              <Button
                className="min-h-[4.75rem]"
                disabled={game.saving}
                onClick={() => controller.action({ type: "mark-correct" })}
              >
                <Check className="size-5" />
                Correct
              </Button>
            </div>
            <Button
              className="min-h-11"
              variant="ghost"
              disabled={game.saving}
              onClick={controller.pauseGame}
            >
              <Pause className="size-4" />
              Pause turn
            </Button>
          </>
        );
      else
        footer = (
          <>
            {primary("Play again with these teams", () => {
              void controller.startNewGame();
            })}
            {secondary("Back to games", leave)}
          </>
        );
    } else if (snapshot.step === "settings" || snapshot.step === "landing")
      footer = primary("Next: Team 1", controller.beginTeams);
    else if (snapshot.step === "team")
      footer = (
        <>
          {primary("Save team", controller.confirmTeam)}
          {secondary(
            snapshot.teamEditIndex === 0
              ? "Back to settings"
              : `Back to Team ${snapshot.teamEditIndex}`,
            controller.backTeam,
          )}
        </>
      );
    else if (snapshot.step === "review")
      footer = (
        <>
          {primary("Enter private figures", controller.beginClues)}
          {secondary("Edit teams", controller.editTeams)}
        </>
      );
    else if (snapshot.step === "clues")
      footer = primary(
        snapshot.clueEntryRevealed
          ? snapshot.clueEntryIndex === snapshot.players.length - 1
            ? "Confirm and start game"
            : "Confirm and pass on"
          : `I’m ${snapshot.players[snapshot.clueEntryIndex]?.name}`,
        snapshot.clueEntryRevealed ? controller.confirmClues : controller.revealClues,
      );
  }
  return (
    <FooterActionLockContext.Provider value={game.saving || !game.deviceActive}>
      <GameShell
        compact
        title={
          <span className="flex items-center justify-center gap-2">
            <IconTopHat className="size-7 text-primary" />
            Hat Game
          </span>
        }
        headerRight={
          match && !game.savedGameAvailable ? (
            <span className="text-right text-typ-micro text-muted-foreground">
              Phase {match.phaseNumber}
              <br />
              of 3
            </span>
          ) : undefined
        }
        onHome={leave}
        footer={<div className="flex w-full flex-col gap-2">{footer}</div>}
      >
        <fieldset
          className="flex min-h-0 flex-1 flex-col"
          disabled={game.saving || !game.deviceActive}
        >
          <HatDeviceContent game={game} controller={controller} confirm={confirm} />
        </fieldset>
        {game.error ? (
          <p role="alert" className="mt-3 text-typ-ui text-destructive">
            {game.error}
          </p>
        ) : null}
        {game.notice ? (
          <p role="status" className="mt-2 text-typ-ui text-muted-foreground">
            {game.notice}
          </p>
        ) : null}
      </GameShell>
    </FooterActionLockContext.Provider>
  );
}
