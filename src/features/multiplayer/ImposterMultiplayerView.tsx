import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { PrimaryFooterButton } from "@/components/game/GameFooterButtons";
import { GamePanel } from "@/components/game/GamePanel";
import { TurnPlayHighlight } from "@/components/game/TurnPlayHighlight";
import { GameResultActions } from "@/components/GameResultActions";
import { GameShell } from "@/components/GameShell";
import { IMPOSTER_ROLE_CARD_COPY } from "@/config/imposterDefaults";
import { IMPOSTER_NOTICE_CLASS } from "@/features/imposter/screens/imposterScreenTokens";
import type { ImposterSyncDto } from "@/multiplayer/roomTypes";

export function ImposterMultiplayerView({
  payload,
  viewerPlayerId,
  isHost,
  emitWithAck,
}: {
  readonly payload: ImposterSyncDto;
  readonly viewerPlayerId: string;
  readonly isHost: boolean;
  readonly emitWithAck: (
    event: string,
    body?: unknown,
  ) => Promise<{ ok?: boolean; error?: string } | undefined>;
}) {
  const navigate = useNavigate();
  const { snapshot, revealSubjectId, revealSubjectIsImposter } = payload;
  const round = snapshot.round;
  const step = snapshot.step;
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const dispatch = async (action: { readonly type: string }) => {
    setBusy(true);
    const ack = await emitWithAck("imposter:dispatch", action);

    if (ack?.ok === false) {
      setError(ack.error ?? "");
    }

    setBusy(false);
  };

  let footer: ReactNode | undefined;

  if (step === "reveal" && round && revealSubjectId) {
    const canInteract = viewerPlayerId === revealSubjectId;

    if (!round.revealRevealed) {
      footer = (
        <PrimaryFooterButton
          disabled={busy || !canInteract}
          label={`${snapshot.players[round.revealPlayerIndex]?.name ?? "Player"} ready`}
          onClick={() => void dispatch({ type: "reveal-show-role" })}
        />
      );
    } else {
      const isLast = round.revealPlayerIndex >= snapshot.players.length - 1;

      footer = (
        <PrimaryFooterButton
          disabled={busy || !canInteract}
          label={isLast ? "Continue to clues" : "Confirm and pass on"}
          onClick={() => void dispatch({ type: "reveal-confirm-next" })}
        />
      );
    }
  } else if (step === "guidePregame") {
    footer = (
      <PrimaryFooterButton
        disabled={busy || !isHost}
        label="Ready for discussion"
        onClick={() => void dispatch({ type: "guide-pregame-done" })}
      />
    );
  } else if (step === "guidePrediscussion") {
    footer = (
      <PrimaryFooterButton
        disabled={busy || !isHost}
        label="Vote done"
        onClick={() => void dispatch({ type: "guide-prediscussion-done" })}
      />
    );
  } else if (step === "guideWarning") {
    footer = (
      <PrimaryFooterButton
        disabled={busy || !isHost}
        label="Reveal"
        onClick={() => void dispatch({ type: "guide-warning-done" })}
      />
    );
  } else if (step === "results") {
    footer = (
      <GameResultActions
        onNewGame={() => navigate("/")}
        onPickAnotherGame={() => navigate("/")}
        onReplay={() => navigate("/")}
      />
    );
  }

  let body: ReactNode;

  if (step === "reveal" && round && revealSubjectId) {
    const subject = snapshot.players[round.revealPlayerIndex];
    const isViewerTurn = viewerPlayerId === revealSubjectId;

    if (!isViewerTurn) {
      body = (
        <GamePanel title="Reveal roles">
          <p className={IMPOSTER_NOTICE_CLASS}>
            Waiting for{" "}
            <span className="font-semibold text-foreground">{subject?.name}</span>{" "}
            to finish this reveal step on their device.
          </p>
        </GamePanel>
      );
    } else if (!round.revealRevealed) {
      body = (
        <GamePanel
          eyebrow={`Secret role ${round.revealPlayerIndex + 1} of ${snapshot.players.length}`}
          subtitle="Only you should look when it is your step."
          title={`Reveal — ${subject?.name ?? "Player"}`}
        >
          <p className={IMPOSTER_NOTICE_CLASS}>
            When you are ready in private, tap the footer button to see your role.
          </p>
        </GamePanel>
      );
    } else {
      body = (
        <GamePanel
          eyebrow={revealSubjectIsImposter ? "Your role" : "Remember this"}
          subtitle={
            revealSubjectIsImposter
              ? "Blend in during clues — the crew does not know who you are."
              : "Give a clue that proves you know the word without handing it to imposters."
          }
          title={subject?.name ?? "Player"}
        >
          {revealSubjectIsImposter ? (
            <TurnPlayHighlight>{IMPOSTER_ROLE_CARD_COPY}</TurnPlayHighlight>
          ) : (
            <TurnPlayHighlight>{round.secretWord}</TurnPlayHighlight>
          )}
        </GamePanel>
      );
    }
  } else if (step === "guidePregame") {
    body = (
      <GamePanel
        eyebrow="Clue round"
        subtitle="Talk together at the table — this app only carries instructions."
        title="Give your clues"
      >
        <p className="text-typ-body text-foreground">
          Go around the circle <strong>twice</strong>. On each pass, say one short clue
          about the secret word. Imposters should try to sound like everyone else.
        </p>
        <p className={`mt-4 ${IMPOSTER_NOTICE_CLASS}`}>
          When two full rounds of clues are done, the host taps the footer when you are
          ready to discuss.
        </p>
        {!isHost ? (
          <p className={`mt-4 ${IMPOSTER_NOTICE_CLASS}`}>Waiting on host to continue.</p>
        ) : null}
      </GamePanel>
    );
  } else if (step === "guidePrediscussion") {
    body = (
      <GamePanel
        eyebrow="Discussion & vote"
        subtitle="The app is not tracking votes — your group decides together."
        title="Talk it out, then vote"
      >
        <p className="text-typ-body text-foreground">
          Discuss who felt suspicious. When you are ready, vote at the table on who you
          think is the imposter (use whatever rule your group agrees on).
        </p>
        <p className={`mt-4 ${IMPOSTER_NOTICE_CLASS}`}>
          After voting is settled, the host taps below before anyone reads the phone again
          for the reveal.
        </p>
        {!isHost ? (
          <p className={`mt-4 ${IMPOSTER_NOTICE_CLASS}`}>Waiting on host to continue.</p>
        ) : null}
      </GamePanel>
    );
  } else if (step === "guideWarning") {
    body = (
      <GamePanel
        eyebrow="Big reveal"
        subtitle="Everyone should be ready for spoilers."
        title="About to reveal the imposter"
      >
        <p className="text-typ-body text-foreground">
          The next screen shows who was secretly the imposter and what the word was.
        </p>
        <p className={`mt-4 ${IMPOSTER_NOTICE_CLASS}`}>
          Are all players okay moving on — including anyone who should look away until
          you say so?
        </p>
        {!isHost ? (
          <p className={`mt-4 ${IMPOSTER_NOTICE_CLASS}`}>Waiting on host to continue.</p>
        ) : null}
      </GamePanel>
    );
  } else if (step === "results" && round) {
    const imposterNames =
      round.imposterPlayerIds
        .map((id) => snapshot.players.find((player) => player.id === id)?.name ?? id)
        .join(", ") ?? "—";

    body = (
      <GamePanel
        eyebrow="Round reveal"
        subtitle="Resolve winners together at the table."
        title="Imposter & word"
      >
        <div className="space-y-6">
          <div>
            <p className="text-typ-overline font-semibold uppercase tracking-wide text-muted-foreground">
              Imposter
            </p>
            <p className="mt-2 text-typ-display font-bold text-foreground">
              {imposterNames}
            </p>
          </div>
          <div>
            <p className="text-typ-overline font-semibold uppercase tracking-wide text-muted-foreground">
              Secret word
            </p>
            <p className="mt-2 text-typ-display font-bold text-foreground">
              {round.secretWord}
            </p>
          </div>
        </div>
      </GamePanel>
    );
  } else {
    body = (
      <GamePanel title="Imposter">
        <p className={IMPOSTER_NOTICE_CLASS}>
          {error || "Unexpected Imposter state — try reconnecting."}
        </p>
      </GamePanel>
    );
  }

  return (
    <GameShell footer={footer} title="Imposter">
      {body}
    </GameShell>
  );
}
