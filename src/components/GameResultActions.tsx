import { Button } from "@/components/ui/button";

/**
 * Standard result actions for every pass-and-play game:
 * leave the hub, restart with the same setup, or return to setup for the same game type.
 */
export function GameResultActions({
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
