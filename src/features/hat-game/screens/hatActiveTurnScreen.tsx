import {
  FooterOutlineIconTextButton,
  PrimaryFooterButton,
  SecondaryFooterButton,
} from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { TurnPlayHighlight } from "@/components/game/TurnPlayHighlight";
import { IconCheck, IconSkipForward } from "@/components/icons";
import { Metric } from "@/components/Metric";
import {
  getHatGameContext,
  getHatGamePhaseMeta,
} from "@/domain/hat-game/engine";
import { formatCountdown } from "@/domain/hat-game/time";
import type { HatGameSession } from "@/domain/hat-game/types";
import { HatPhaseBanner } from "@/features/hat-game/HatPhaseBanner";
import type { ScreenModel } from "@/features/hat-game/hatSingleplayerAppTypes";
import type { HatSingleplayerAppController } from "@/features/hat-game/useHatSingleplayerApp";

export function hatActiveTurnScreen(
  controller: HatSingleplayerAppController,
  session: HatGameSession,
): ScreenModel {
  const context = getHatGameContext(session);
  const phase = getHatGamePhaseMeta(session.phaseNumber);
  const activeTurn = session.activeTurn;
  const currentClue =
    activeTurn?.clueQueue[activeTurn.queueIndex]?.text ?? "Loading";

  return {
    content: (
      <div className="flex flex-1 flex-col gap-4 pb-4">
        <HatPhaseBanner
          instruction={phase.instruction}
          phaseName={phase.name}
          phaseNumber={session.phaseNumber}
        />
        <GamePanel
          subtitle={`${context.activeDescriberName} is presenting`}
          title={`${context.activeTeam?.name ?? "Team"} guessing`}
        >
          <TurnPlayHighlight>{currentClue}</TurnPlayHighlight>
          <div className="grid grid-cols-2 gap-3">
            <Metric
              label="Time left"
              value={formatCountdown(controller.secondsRemaining)}
            />
            <Metric label="Phase" value={phase.name} />
            <Metric label="Score" value={String(activeTurn?.score ?? 0)} />
            <Metric
              label="Skipped waiting"
              value={String(activeTurn?.skippedClues.length ?? 0)}
            />
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
                  icon={<span aria-hidden="true">↶</span>}
                  label={clue.text}
                  onClick={() =>
                    controller.dispatchGameAction({
                      type: "return-skipped-clue",
                      payload: { poolIndex: clue.poolIndex },
                    })
                  }
                />
              ))}
            </div>
          </div>
          ) : null}
        </GamePanel>
      </div>
    ),
    actions: (
      <>
        <SecondaryFooterButton
          disabled={(activeTurn?.skipsRemaining ?? 0) <= 0}
          icon={<IconSkipForward className="size-5" />}
          label="Skip"
          onClick={() => controller.dispatchGameAction({ type: "skip-clue" })}
        />
        <PrimaryFooterButton
          icon={<IconCheck className="size-5" />}
          label="Correct"
          onClick={() => controller.dispatchGameAction({ type: "mark-correct" })}
        />
      </>
    ),
  };
}
