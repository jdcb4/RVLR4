import { Button } from "@/components/ui/button";

export type MultiplayerReplayUi =
  | { readonly mode: "inactive"; readonly label: string }
  | { readonly mode: "hostOffer"; readonly onClick: () => void }
  | { readonly mode: "waitingHost"; readonly disabled: true }
  | { readonly mode: "joinReplay"; readonly onClick: () => void };

/**
 * Final multiplayer results footer: leave hub + staged replay (host offers → guests join).
 */
export function GameResultActions({
  onPickAnotherGame,
  replay,
}: {
  readonly onPickAnotherGame: () => void;
  readonly replay: MultiplayerReplayUi;
}) {
  return (
    <div className="mt-auto grid w-full max-w-full gap-3">
      <Button
        className="h-12 w-full"
        variant="outline"
        onClick={onPickAnotherGame}
        type="button"
      >
        Pick another game
      </Button>
      {replay.mode === "inactive" ? (
        <Button className="h-12 w-full" disabled type="button" variant="secondary">
          {replay.label}
        </Button>
      ) : null}
      {replay.mode === "waitingHost" ? (
        <Button className="h-12 w-full" disabled type="button" variant="secondary">
          Replay: Waiting for host
        </Button>
      ) : null}
      {replay.mode === "hostOffer" ? (
        <Button className="h-12 w-full" onClick={replay.onClick} type="button">
          Replay
        </Button>
      ) : null}
      {replay.mode === "joinReplay" ? (
        <Button className="h-12 w-full" onClick={replay.onClick} type="button">
          Replay: Join the next game
        </Button>
      ) : null}
    </div>
  );
}

/**
 * Pass-and-play final results actions — two buttons, mirroring the multi-device
 * shape:
 * - `Pick another game` returns to the Pass-and-Play hub.
 * - `Play again` returns to this game's settings screen with the same prefs as
 *   before, so the user can confirm or tweak and start the next match.
 */
export function PassAndPlayGameResultActions({
  onPickAnotherGame,
  onPlayAgain,
}: {
  readonly onPickAnotherGame: () => void;
  readonly onPlayAgain: () => void;
}) {
  return (
    <div className="mt-auto grid w-full max-w-full gap-3">
      <Button
        className="h-12 w-full"
        variant="outline"
        onClick={onPickAnotherGame}
        type="button"
      >
        Pick another game
      </Button>
      <Button className="h-12 w-full" onClick={onPlayAgain} type="button">
        Play again
      </Button>
    </div>
  );
}
