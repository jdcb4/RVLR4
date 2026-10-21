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
        <h2 className="break-words text-typ-display font-semibold">
          {`Pass to ${describer.name}.`}
        </h2>
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
