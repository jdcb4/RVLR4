import { AccessibleCountdownValue } from "@/components/game/AccessibleCountdownValue";
import { FooterOutlineIconTextButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { TurnPlayHighlight } from "@/components/game/TurnPlayHighlight";
import { Metric } from "@/components/Metric";
import { PlayerAvatarBadge } from "@/components/PlayerAvatar";
import { getHatGameContext, getHatGamePhaseMeta } from "@/domain/hat-game/engine";
import { formatCountdown } from "@/domain/hat-game/time";
import type { HatGameSession } from "@/domain/hat-game/types";
import { HatPhaseBanner } from "@/features/hat-game/HatPhaseBanner";

export function HatActiveTurnPanel({
  session,
  secondsRemaining,
  showPhaseMetric = false,
  onReturnSkipped,
}: {
  readonly session: HatGameSession;
  readonly secondsRemaining: number;
  readonly showPhaseMetric?: boolean;
  readonly onReturnSkipped: (poolIndex: number) => void;
}) {
  const context = getHatGameContext(session);
  const phase = getHatGamePhaseMeta(session.phaseNumber);
  const activeTurn = session.activeTurn;
  const currentClue = activeTurn?.clueQueue[activeTurn.queueIndex]?.text ?? "Loading";
  const activeDescriber = session.players.find((player) => player.id === context.activeDescriberId);

  return (
    <section className="flex flex-1 flex-col gap-4 pb-4">
      <HatPhaseBanner
        instruction={phase.instruction}
        phaseName={phase.name}
        phaseNumber={session.phaseNumber}
      />

      <GamePanel
        subtitle={`${context.activeDescriberName} is presenting`}
        title={`${context.activeTeam?.name ?? "Team"} guessing`}
      >
        <PlayerAvatarBadge
          avatarId={activeDescriber?.avatarId}
          detail="Presenting"
          name={context.activeDescriberName}
        />

        <TurnPlayHighlight>{currentClue}</TurnPlayHighlight>
        <div className="grid grid-cols-2 gap-3">
          <Metric
            label="Time left"
            value={
              <AccessibleCountdownValue
                countdownKey={
                  activeTurn?.startedAt ??
                  `hat-${session.phaseNumber}-${session.roundNumber}-${session.teamIndex}`
                }
                formattedValue={formatCountdown(secondsRemaining)}
                secondsLeft={secondsRemaining}
              />
            }
            {...(!showPhaseMetric ? { className: "col-span-2" } : {})}
          />
          {showPhaseMetric ? <Metric label="Phase" value={phase.name} /> : null}
          <Metric label="Score" value={String(activeTurn?.score ?? 0)} />
          <Metric label="Skipped waiting" value={String(activeTurn?.skippedClues.length ?? 0)} />
        </div>
        {activeTurn?.skippedClues.length ? (
          <div className="rounded-lg border border-dashed border-border p-3">
            <p className="mb-2 text-typ-ui font-semibold">Skipped famous figures</p>
            <p className="mb-3 text-typ-ui text-muted-foreground">
              Pick a waiting word to return to it now.
            </p>
            <div className="grid gap-2">
              {activeTurn.skippedClues.map((clue) => (
                <FooterOutlineIconTextButton
                  key={clue.poolIndex}
                  icon={<span aria-hidden="true">{"\u21b6"}</span>}
                  label={clue.text}
                  onClick={() => onReturnSkipped(clue.poolIndex)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </GamePanel>
    </section>
  );
}
