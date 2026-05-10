import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";

/**
 * Shared header chrome for game modes: optional mid-flow control + trailing slots (e.g. info).
 * Keeps “End turn” placement aligned across Hat Game and WhoWhatWhere.
 */
export function GameScreenHeaderActions({
  endTurn,
  trailing,
}: {
  readonly endTurn?: { readonly onClick: () => void; readonly label?: string };
  readonly trailing?: ReactNode;
}) {
  return (
    <>
      {endTurn ? (
        <Button
          className="h-9 px-2 text-typ-micro"
          onClick={endTurn.onClick}
          type="button"
        >
          {endTurn.label ?? "End turn"}
        </Button>
      ) : null}
      {trailing}
    </>
  );
}
