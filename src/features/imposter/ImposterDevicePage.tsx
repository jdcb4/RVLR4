import { ArrowLeft, Eye, EyeOff, Minus, Plus, RotateCcw } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { PrimaryFooterButton, SecondaryFooterButton } from "@/components/game/GameFooterButtons";
import { GameArtwork } from "@/components/GameArtwork";
import { GameShell } from "@/components/GameShell";
import { IconDisguise } from "@/components/icons";
import { DifficultySelect } from "@/components/setup/DifficultySelect";
import { Button } from "@/components/ui/button";
import { maxImpostersForPlayers } from "@/domain/imposter/round";
import { useDeviceController } from "@/features/game-app-hooks/useDeviceController";
import { ImposterDeviceController } from "@/features/imposter/imposterDeviceController";

export function ImposterDevicePage() {
  const navigate = useNavigate();
  const { controller, view: game } = useDeviceController(() => new ImposterDeviceController());
  const [confirmNew, setConfirmNew] = useState(false);
  const leave = useCallback(() => {
    void controller.leave().then((saved) => {
      if (saved) navigate("/");
    });
  }, [controller, navigate]);
  const snapshot = game.session.snapshot;
  const step = snapshot.step;
  const back = useCallback(() => {
    if (confirmNew) {
      setConfirmNew(false);
      return;
    }
    if (
      game.savedGameAvailable ||
      game.paused ||
      step === "settings" ||
      step === "results" ||
      game.storageError
    )
      leave();
    else void controller.back();
  }, [
    confirmNew,
    controller,
    game.paused,
    game.savedGameAvailable,
    game.storageError,
    leave,
    step,
  ]);
  useEffect(() => {
    const handle = (event: Event) => {
      event.preventDefault();
      back();
    };
    window.addEventListener("rvlry:back", handle);
    return () => window.removeEventListener("rvlry:back", handle);
  }, [back]);

  const action = (label: string, onClick: () => void, secondary = false) =>
    secondary ? (
      <SecondaryFooterButton disabled={game.saving} label={label} onClick={onClick} />
    ) : (
      <PrimaryFooterButton
        disabled={game.saving}
        label={game.saving ? "Saving…" : label}
        onClick={onClick}
      />
    );
  const requestNew = () => {
    controller.pause();
    setConfirmNew(true);
  };
  let content;
  let footer;
  if (!game.loaded) content = <p role="status">Loading saved game…</p>;
  else if (game.storageError) {
    content = (
      <section className="space-y-3">
        <h2 className="text-typ-section-title font-semibold">Save needs attention</h2>
        <p role="alert">{game.storageError}</p>
        <p className="text-typ-muted text-muted-foreground">
          Keep the app open and retry to continue.
        </p>
      </section>
    );
    footer = (
      <div className="space-y-2">
        {action("Retry", () => void controller.retry())}
        {game.hydrationFailed && action("Discard unreadable save", () => setConfirmNew(true), true)}
        {action("Game picker", leave, true)}
      </div>
    );
    if (confirmNew) {
      content = (
        <section className="space-y-3">
          <h2 className="text-typ-section-title font-semibold">Discard this saved game?</h2>
          <p>The saved game cannot be recovered after you discard it.</p>
        </section>
      );
      footer = (
        <div className="space-y-2">
          {action("Discard and start new", () => {
            setConfirmNew(false);
            void controller.discardUnavailable();
          })}
          {action("Keep saved game", () => setConfirmNew(false), true)}
        </div>
      );
    }
  } else if (confirmNew) {
    content = (
      <section className="space-y-3">
        <h2 className="text-typ-section-title font-semibold">Start a new game?</h2>
        <p>This replaces the saved round. Your names and settings stay ready to use.</p>
      </section>
    );
    footer = (
      <div className="space-y-2">
        {action("Start new game", () => {
          setConfirmNew(false);
          void controller.startNew();
        })}
        {action(
          "Keep current game",
          () => {
            setConfirmNew(false);
            if (!game.savedGameAvailable) controller.resume();
          },
          true,
        )}
      </div>
    );
  } else if (game.savedGameAvailable) {
    content = (
      <section className="space-y-3">
        <h2 className="text-typ-section-title font-semibold">Your saved game</h2>
        <p>
          {snapshot.playerCount} players · {snapshot.imposterCount}{" "}
          {snapshot.imposterCount === 1 ? "imposter" : "imposters"}
        </p>
        <p className="text-typ-muted text-muted-foreground">
          Saved {new Date(game.session.savedAt).toLocaleString()}
        </p>
      </section>
    );
    footer = (
      <div className="space-y-2">
        {action("Resume", controller.resume)}
        {action("Start new game", requestNew, true)}
      </div>
    );
  } else if (game.paused) {
    content = (
      <section className="space-y-3">
        <EyeOff aria-hidden className="size-8 text-primary" />
        <h2 className="text-typ-section-title font-semibold">Game covered</h2>
        <p>
          {step === "reveal"
            ? `Return the phone to ${snapshot.players[snapshot.round!.revealPlayerIndex]!.name}. Their role stays hidden until they reveal it again.`
            : "Continue when everyone is ready."}
        </p>
      </section>
    );
    footer = (
      <div className="space-y-2">
        {action("Continue", controller.resume)}
        {action("Game picker", leave, true)}
        {action("Start new game", requestNew, true)}
      </div>
    );
  } else {
    if (["settings", "roster", "review"].includes(step)) {
      content = (
        <>
          <ol
            aria-label="Setup progress"
            className="mb-3 flex justify-between gap-2 text-typ-micro"
          >
            {["Settings", "Players", "Review"].map((name, index) => (
              <li
                key={name}
                aria-current={
                  index === ["settings", "roster", "review"].indexOf(step) ? "step" : undefined
                }
                className={
                  index === ["settings", "roster", "review"].indexOf(step)
                    ? "font-semibold text-primary"
                    : "text-muted-foreground"
                }
              >
                {name}
              </li>
            ))}
          </ol>
          {step === "settings" ? (
            <section className="space-y-5">
              <h2 className="text-typ-section-title font-semibold">Game settings</h2>
              <ImposterDeviceCount
                label="Players"
                value={snapshot.playerCount}
                min={4}
                max={10}
                disabled={game.saving}
                onChange={controller.updatePlayerCount}
              />
              <ImposterDeviceCount
                label="Imposters"
                value={snapshot.imposterCount}
                min={1}
                max={maxImpostersForPlayers(snapshot.playerCount)}
                disabled={game.saving}
                onChange={controller.updateImposterCount}
              />
              <DifficultySelect
                value={snapshot.wordDifficulty}
                onChange={controller.updateWordDifficulty}
                disabled={game.saving}
              />
              <p className="text-typ-muted text-muted-foreground">
                Everyone gets the secret word except the imposters. Give clues and work out who is
                bluffing.
              </p>
            </section>
          ) : step === "roster" ? (
            <section className="space-y-3">
              <h2 className="text-typ-section-title font-semibold">Who’s playing?</h2>
              {snapshot.players.map((player, index) => (
                <label key={player.id} className="flex items-center gap-3 text-typ-ui font-medium">
                  <span className="w-16 shrink-0">Player {index + 1}</span>
                  <input
                    autoCapitalize="words"
                    autoComplete="off"
                    className="keyboard-safe-input h-12 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-typ-body text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    disabled={game.saving}
                    enterKeyHint={index === snapshot.players.length - 1 ? "done" : "next"}
                    maxLength={80}
                    value={player.name}
                    onChange={(event) => controller.updateName(player.id, event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.nativeEvent.isComposing) {
                        event.preventDefault();
                        const inputs = event.currentTarget
                          .closest("section")
                          ?.querySelectorAll("input");
                        if (index < snapshot.players.length - 1) inputs?.[index + 1]?.focus();
                        else {
                          event.currentTarget.blur();
                          void controller.advanceSetup();
                        }
                      }
                    }}
                  />
                </label>
              ))}
            </section>
          ) : (
            <section className="space-y-3">
              <h2 className="text-typ-section-title font-semibold">Ready to deal?</h2>
              <p>
                {snapshot.playerCount} players · {snapshot.imposterCount}{" "}
                {snapshot.imposterCount === 1 ? "imposter" : "imposters"}
              </p>
              <p className="text-typ-muted text-muted-foreground">
                Difficulty:{" "}
                {snapshot.wordDifficulty === "all"
                  ? "Hard"
                  : snapshot.wordDifficulty === "easy"
                    ? "Easy"
                    : snapshot.wordDifficulty === "medium"
                      ? "Medium"
                      : "Hard"}
              </p>
              <ol className="divide-y divide-border">
                {snapshot.players.map((player) => (
                  <li key={player.id} className="break-words py-2">
                    {player.name}
                  </li>
                ))}
              </ol>
              <p className="text-typ-muted text-muted-foreground">
                Pass the phone in this order. Each player sees their own role privately.
              </p>
            </section>
          )}
          {game.setupError && (
            <p role="alert" className="mt-3 text-destructive">
              {game.setupError}
            </p>
          )}
        </>
      );
      footer = (
        <div className="space-y-2">
          {action(
            step === "settings"
              ? "Continue to players"
              : step === "roster"
                ? "Review players"
                : "Deal roles",
            () => void (step === "review" ? controller.startRound() : controller.advanceSetup()),
          )}
          {step !== "settings" && (
            <SecondaryFooterButton
              disabled={game.saving}
              icon={<ArrowLeft aria-hidden className="size-4" />}
              label={step === "review" ? "Players" : "Settings"}
              onClick={() => void controller.back()}
            />
          )}
        </div>
      );
    } else if (step === "reveal") {
      const player = snapshot.players[snapshot.round!.revealPlayerIndex]!;
      const imposter = snapshot.round!.imposterPlayerIds.includes(player.id);
      content = (
        <section className="flex flex-1 flex-col justify-center gap-5 py-4 text-center">
          <p className="text-typ-muted text-muted-foreground">
            Player {snapshot.round!.revealPlayerIndex + 1} of {snapshot.playerCount}
          </p>
          <h2 className="material-callout break-words text-typ-section-title font-semibold">
            {game.roleVisible ? player.name : `Pass to ${player.name}`}
          </h2>
          {game.roleVisible ? (
            <div className="material-clue space-y-3 rounded-2xl bg-secondary p-5">
              <h3 className="break-words text-typ-display font-semibold">
                {imposter ? "You are the imposter" : snapshot.round!.secretWord}
              </h3>
              <p>
                {imposter
                  ? "You don’t know the word. Listen to the clues and blend in."
                  : "This is your secret word. Keep it to yourself."}
              </p>
            </div>
          ) : (
            <>
              <GameArtwork game="imposter" className="mx-auto size-16 shrink-0" />
              <p>Only {player.name} should look at the next screen.</p>
            </>
          )}
        </section>
      );
      footer = (
        <PrimaryFooterButton
          disabled={game.saving}
          icon={
            game.roleVisible ? (
              <EyeOff aria-hidden className="size-5" />
            ) : (
              <Eye aria-hidden className="size-5" />
            )
          }
          label={
            game.saving
              ? "Saving…"
              : game.roleVisible
                ? snapshot.round!.revealPlayerIndex === snapshot.playerCount - 1
                  ? "Hide role and begin clues"
                  : "Hide role and pass phone"
                : "Reveal my role"
          }
          onClick={() => {
            if (game.roleVisible) void controller.finishRole();
            else controller.revealRole();
          }}
        />
      );
    } else if (step === "results") {
      const imposters = snapshot.players.filter((player) =>
        snapshot.round!.imposterPlayerIds.includes(player.id),
      );
      content = (
        <section className="space-y-5">
          <div className="flex items-center gap-3">
            <GameArtwork game="imposter" className="size-10 shrink-0" />
            <h2 className="min-w-0 text-typ-section-title font-semibold">The reveal</h2>
          </div>
          <div>
            <p className="text-typ-muted text-muted-foreground">Secret word</p>
            <p className="break-words text-typ-display font-semibold">
              {snapshot.round!.secretWord}
            </p>
          </div>
          <div>
            <h3 className="text-typ-muted text-muted-foreground">
              {imposters.length === 1 ? "The imposter was" : "The imposters were"}
            </h3>
            <ul>
              {imposters.map((player) => (
                <li
                  key={player.id}
                  className="break-words py-1 text-typ-section-title font-semibold"
                >
                  {player.name}
                </li>
              ))}
            </ul>
          </div>
        </section>
      );
      footer = (
        <div className="space-y-2">
          <PrimaryFooterButton
            disabled={game.saving}
            icon={<RotateCcw aria-hidden className="size-5" />}
            label="Play again"
            onClick={() => void controller.startNew()}
          />
          {action("Game picker", leave, true)}
        </div>
      );
    } else {
      content = (
        <section className="space-y-4 py-3">
          <h2 className="text-typ-section-title font-semibold">
            {step === "guidePregame"
              ? "Give your clues"
              : step === "guidePrediscussion"
                ? "Talk it out, then vote"
                : "Ready for the reveal?"}
          </h2>
          {step === "guidePregame" ? (
            <>
              <p>
                Go around the circle <strong>twice</strong>. Each time, say one short clue about the
                secret word.
              </p>
              <p>Imposters: listen and try to sound like everyone else.</p>
              <p className="text-typ-muted text-muted-foreground">
                Keep the phone aside until both rounds of clues are finished.
              </p>
            </>
          ) : step === "guidePrediscussion" ? (
            <>
              <p>
                Discuss who felt suspicious. When you’re ready, vote at the table using the rule
                your group agrees on.
              </p>
              <p className="text-typ-muted text-muted-foreground">
                Continue once everyone has finished voting.
              </p>
            </>
          ) : (
            <>
              <p>The next screen shows the secret word and every imposter.</p>
              <p>Make sure everyone is ready to see the answer.</p>
            </>
          )}
        </section>
      );
      footer = action(
        step === "guidePregame"
          ? "Ready for discussion"
          : step === "guidePrediscussion"
            ? "Vote done"
            : "Reveal the answer",
        () => void controller.advanceGuide(),
      );
    }
  }
  return (
    <GameShell
      compact
      footer={footer}
      onHome={leave}
      title={
        <span className="flex items-center justify-center gap-2">
          <IconDisguise className="size-7 text-primary" />
          Imposter
        </span>
      }
    >
      {game.notice && (
        <p role="status" className="mb-3 text-typ-muted text-muted-foreground">
          {game.notice}
        </p>
      )}
      {content}
    </GameShell>
  );
}

function ImposterDeviceCount({
  label,
  value,
  min,
  max,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  onChange: (count: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-typ-body font-medium">{label}</span>
      <div role="group" aria-label={label} className="flex items-center gap-3">
        <Button
          aria-label={`Fewer ${label.toLowerCase()}`}
          className="size-12"
          disabled={disabled || value <= min}
          variant="outline"
          onClick={() => onChange(value - 1)}
        >
          <Minus aria-hidden className="size-5" />
        </Button>
        <span
          className="min-w-6 text-center text-typ-section-title font-semibold tabular-nums"
          aria-live="polite"
        >
          {value}
        </span>
        <Button
          aria-label={`More ${label.toLowerCase()}`}
          className="size-12"
          disabled={disabled || value >= max}
          variant="outline"
          onClick={() => onChange(value + 1)}
        >
          <Plus aria-hidden className="size-5" />
        </Button>
      </div>
    </div>
  );
}
