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

/** Pass-and-play hub actions (three buttons). */
export function PassAndPlayGameResultActions({
  onPickAnotherGame,
  onReplay,
  onNewGame,
}: {
  readonly onPickAnotherGame: () => void;
  readonly onReplay: () => void;
  readonly onNewGame: () => void;
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
      <Button className="h-12 w-full" onClick={onReplay} type="button">
        Replay
      </Button>
      <Button
        className="h-12 w-full"
        variant="secondary"
        onClick={onNewGame}
        type="button"
      >
        New game
      </Button>
    </div>
  );
}
