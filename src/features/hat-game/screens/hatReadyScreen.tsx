import { BetweenTurnsLayout } from "@/components/game/BetweenTurnsLayout";
import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { HatLastTurnCard } from "@/components/game/HatLastTurnCard";
import { ReadyNextStepsCard } from "@/components/game/ReadyNextStepsCard";
import { ReadyProgressCard } from "@/components/game/ReadyProgressCard";
import {
  getHatGameContext,
  getHatGamePhaseMeta,
} from "@/domain/hat-game/engine";
import type { HatGameSession } from "@/domain/hat-game/types";
import type { ScreenModel } from "@/features/hat-game/hatGameAppTypes";
import { HatScoreboard } from "@/features/hat-game/screens/HatScoreboard";
import type { HatGameAppController } from "@/features/hat-game/useHatGameApp";

export function hatReadyScreen(
  controller: HatGameAppController,
  session: HatGameSession,
): ScreenModel {
  const context = getHatGameContext(session);
  const phase = getHatGamePhaseMeta(session.phaseNumber);
  const previousTurn = session.lastTurnSummary;

  const nextStepsPrimary = phase.instruction;

  const nextStepsGivePhone = controller.snapshot.handoffRevealed ? (
    <>
      <span className="font-semibold text-foreground">
        {context.activeDescriberName}
      </span>{" "}
      has the phone — start the turn from the footer when everyone is ready.
    </>
  ) : (
    <>
      Give the phone to{" "}
      <span className="font-semibold text-foreground">
        {context.activeDescriberName}
      </span>
      .
    </>
  );

  return {
    content: (
      <BetweenTurnsLayout
        heading={
          <GamePanel
            title={`${context.activeTeam?.name ?? "Next team"} up next`}
          />
        }
        lastTurnCard={
          previousTurn ? <HatLastTurnCard summary={previousTurn} /> : null
        }
        nextSteps={
          <ReadyNextStepsCard
            givePhoneLine={nextStepsGivePhone}
            primaryText={nextStepsPrimary}
          />
        }
        progressCard={
          <ReadyProgressCard label="Phase">
            {session.phaseNumber}: {phase.name}
          </ReadyProgressCard>
        }
        scoreboard={<HatScoreboard session={session} />}
      />
    ),
    actions: controller.snapshot.handoffRevealed ? (
      <PrimaryFooterButton
        label="Start turn"
        onClick={() => controller.dispatchGameAction({ type: "start-turn" })}
      />
    ) : (
      <PrimaryFooterButton
        label={`${context.activeDescriberName} Ready`}
        onClick={controller.revealHandoff}
      />
    ),
  };
}
