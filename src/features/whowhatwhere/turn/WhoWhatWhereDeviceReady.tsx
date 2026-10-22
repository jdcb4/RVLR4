import { GameArtwork } from "@/components/GameArtwork";
import { getActiveContext } from "@/domain/whowhatwhere/game";
import type { MatchState } from "@/domain/whowhatwhere/types";
import { WhoWhatWhereDeviceProgress } from "@/features/whowhatwhere/WhoWhatWhereDeviceProgress";

export function WhoWhatWhereDeviceReady({
  match,
  error,
}: {
  readonly match: MatchState;
  readonly error: string;
}) {
  const { describer } = getActiveContext(match);
  return (
    <section className="flex min-h-full flex-col">
      <WhoWhatWhereDeviceProgress match={match} />
      <div className="flex flex-1 flex-col justify-center gap-2 pb-6">
        <div className="flex items-center gap-3">
          <GameArtwork game="www" className="size-12 shrink-0" />
          <h2 className="material-callout min-w-0 break-words text-typ-display font-semibold">
            {`Pass to ${describer.name}.`}
          </h2>
        </div>
        <p className="text-typ-body text-muted-foreground">Everyone else: look away.</p>
      </div>
      {error ? (
        <p role="alert" className="text-typ-ui text-destructive">
          {error}
        </p>
      ) : null}
    </section>
  );
}
