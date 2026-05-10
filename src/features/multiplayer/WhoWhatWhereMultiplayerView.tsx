import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { FooterActionLockContext } from "@/components/footerActionLockContext";
import {
  PrimaryFooterButton,
  SecondaryFooterButton,
} from "@/components/game/GameFooterButtons";
import { GameScreenHeaderActions } from "@/components/game/GameScreenHeaderActions";
import { GameResultActions } from "@/components/GameResultActions";
import { GameShell } from "@/components/GameShell";
import { IconCheck, IconSkipForward } from "@/components/icons";
import { canQueueSkipped, getActiveContext } from "@/domain/whowhatwhere/game";
import {
  FinalTurnRecapScreen,
} from "@/features/whowhatwhere/results/FinalTurnRecapScreen";
import { ResultsScreen } from "@/features/whowhatwhere/results/ResultsScreen";
import { ActiveTurnScreen } from "@/features/whowhatwhere/turn/ActiveTurnScreen";
import { ReadyScreen } from "@/features/whowhatwhere/turn/ReadyScreen";
import type { WhoWhatWhereSyncDto } from "@/multiplayer/roomTypes";

export function WhoWhatWhereMultiplayerView({
  payload,
  emitWithAck,
}: {
  readonly payload: WhoWhatWhereSyncDto;
  readonly emitWithAck: (
    event: string,
    body?: unknown,
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
}) {
  const navigate = useNavigate();
  const match = payload.match;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const role = payload.role;

  const showEndTurn =
    match.stage === "turn" &&
    Boolean(match.activeTurn) &&
    payload.showTurnFooter;

  const headerRight = (
    <GameScreenHeaderActions
      {...(showEndTurn
        ? {
            endTurn: {
              onClick: async () => {
                setBusy(true);
                const ack = await emitWithAck("www:endTurn");

                if (ack?.ok === false) {
                  setError(ack.error ?? "");
                }

                setBusy(false);
              },
            },
          }
        : {})}
    />
  );

  let footer: ReactNode | undefined;

  if (match.stage === "ready") {
    const waitingContext = getActiveContext(match);

    if (role !== "describer") {
      footer = (
        <PrimaryFooterButton
          disabled
          label={`Waiting on ${waitingContext.describer.name}, from ${waitingContext.team.name}`}
          onClick={() => {}}
        />
      );
    } else {
      footer = (
        <PrimaryFooterButton
          disabled={busy}
          label={busy ? "Loading words" : "Start turn"}
          onClick={async () => {
            setBusy(true);
            const ack = await emitWithAck("www:startTurn");

            if (ack?.ok === false) {
              setError(ack.error ?? "");
            }

            setBusy(false);
          }}
        />
      );
    }
  } else if (match.stage === "turn" && match.activeTurn && payload.showTurnFooter) {
    footer = (
      <div className="flex w-full flex-col gap-2">
        <SecondaryFooterButton
          disabled={busy || !canQueueSkipped(match.activeTurn)}
          icon={<IconSkipForward className="size-5" />}
          label="Skip"
          onClick={async () => {
            setBusy(true);
            const ack = await emitWithAck("www:skip");

            if (ack?.ok === false) {
              setError(ack.error ?? "");
            }

            setBusy(false);
          }}
        />
        <PrimaryFooterButton
          disabled={busy}
          icon={<IconCheck className="size-5" />}
          label="Correct"
          onClick={async () => {
            setBusy(true);
            const ack = await emitWithAck("www:correct");

            if (ack?.ok === false) {
              setError(ack.error ?? "");
            }

            setBusy(false);
          }}
        />
      </div>
    );
  } else if (match.stage === "finalSummary") {
    footer = (
      <PrimaryFooterButton
        disabled={busy}
        label="Final scores"
        onClick={async () => {
          setBusy(true);
          const ack = await emitWithAck("www:finalScores");

          if (ack?.ok === false) {
            setError(ack.error ?? "");
          }

          setBusy(false);
        }}
      />
    );
  } else if (match.stage === "results") {
    footer = (
      <GameResultActions
        onNewGame={() => navigate("/")}
        onPickAnotherGame={() => navigate("/")}
        onReplay={() => navigate("/")}
      />
    );
  }

  let body: ReactNode = null;

  if (match.stage === "ready") {
    body = (
      <ReadyScreen
        error={error}
        handoffRevealed
        match={match}
        presentation="multiplayer"
      />
    );
  } else if (match.stage === "turn" && match.activeTurn) {
    if (role === "describer") {
      body = (
        <ActiveTurnScreen
          match={match}
          onReturnSkipped={async (skippedWordId) => {
            if (!payload.canReturnSkipped) {
              return;
            }

            const ack = await emitWithAck("www:returnSkipped", { skippedWordId });

            if (ack?.ok === false) {
              setError(ack.error ?? "");
            }
          }}
        />
      );
    } else {
      body = <GuessOrObserveTurn match={match} role={role} />;
    }
  } else if (match.stage === "finalSummary") {
    body = <FinalTurnRecapScreen match={match} />;
  } else if (match.stage === "results") {
    body = <ResultsScreen match={match} />;
  }

  return (
    <FooterActionLockContext.Provider value={false}>
      <GameShell footer={footer} headerRight={headerRight} title="Who What Where">
        {body}
      </GameShell>
    </FooterActionLockContext.Provider>
  );
}

function GuessOrObserveTurn({
  match,
  role,
}: {
  readonly match: import("@/domain/whowhatwhere/types").MatchState;
  readonly role: "guesser" | "observer";
}) {
  const activeTurn = match.activeTurn!;

  return (
    <section className="flex flex-1 flex-col gap-4 pb-4">
      <div className="rounded-2xl border border-border bg-card p-4 shadow-sm">
        <p className="text-typ-panel-title font-semibold">
          {role === "guesser" ? "Guess with your team" : "Sit tight"}
        </p>
        <p className="mt-2 text-typ-ui-snug text-muted-foreground">
          {role === "guesser"
            ? "You do not see the secret words. Listen to your describer and shout guesses together."
            : "Another team is describing right now. Wait for your bench to rotate in."}
        </p>
        <p className="mt-4 font-mono text-typ-display text-foreground">••••••</p>
        <p className="mt-2 text-typ-ui text-muted-foreground">
          Category: <span className="font-semibold text-foreground">{activeTurn.category}</span>
        </p>
      </div>
    </section>
  );
}
