import { Button } from "@/components/ui/button";

export function PassAndPlayGameResultActions({
  onPickAnotherGame,
  onPlayAgain,
}: {
  readonly onPickAnotherGame: () => void;
  readonly onPlayAgain: () => void;
}) {
  return (
    <div className="mt-auto grid w-full max-w-full gap-3">
      <Button className="h-12 w-full" variant="outline" onClick={onPickAnotherGame} type="button">
        Pick another game
      </Button>
      <Button className="h-12 w-full" onClick={onPlayAgain} type="button">
        Play again
      </Button>
    </div>
  );
}
