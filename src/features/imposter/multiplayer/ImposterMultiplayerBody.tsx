import type React from "react";

import { GamePanel } from "@/components/game/GamePanel";
import { ImposterRemindMeCard } from "@/components/game/ImposterRemindMeCard";
import { ReadyNextStepsCard } from "@/components/game/ReadyNextStepsCard";
import { TurnPlayHighlight } from "@/components/game/TurnPlayHighlight";
import { PlayerAvatarBadge } from "@/components/PlayerAvatar";
import { IMPOSTER_ROLE_CARD_COPY } from "@/config/imposterDefaults";
import type { ImposterSnapshot } from "@/domain/imposter/types";
import type { ImposterSyncDto } from "@/domain/multiplayer/protocol";
import { IMPOSTER_NOTICE_CLASS } from "@/features/imposter/screens/imposterScreenTokens";

import {
  getParallelRevealProgress,
  imposterPlayerName,
  imposterPlayerOrdinal,
} from "./imposterMultiplayerReveal";

export function ImposterMultiplayerBody({
  payload,
  viewerPlayerId,
  isHost,
  error,
}: {
  readonly payload: ImposterSyncDto;
  readonly viewerPlayerId: string;
  readonly isHost: boolean;
  readonly error: string;
}) {
  const { snapshot, revealSubjectId, revealSubjectIsImposter } = payload;
  const { round, step } = snapshot;

  if (step === "reveal" && round && revealSubjectId) {
    return (
      <ImposterRevealBody
        revealSubjectId={revealSubjectId}
        revealSubjectIsImposter={revealSubjectIsImposter}
        snapshot={snapshot}
        viewerPlayerId={viewerPlayerId}
      />
    );
  }

  if (step === "guidePregame") {
    return <GuidePregameBody isHost={isHost} snapshot={snapshot} viewerPlayerId={viewerPlayerId} />;
  }

  if (step === "guidePrediscussion") {
    return <GuidePrediscussionBody isHost={isHost} />;
  }

  if (step === "guideWarning") {
    return <GuideWarningBody isHost={isHost} />;
  }

  if (step === "results" && round) {
    const imposters = round.imposterPlayerIds
      .map((id) => snapshot.players.find((player) => player.id === id))
      .filter((player) => player !== undefined);
    const fallbackImposterNames =
      round.imposterPlayerIds
        .map((id) => snapshot.players.find((player) => player.id === id)?.name ?? id)
        .join(", ") || "-";

    return (
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
            {imposters.length > 0 ? (
              <div className="mt-3 grid gap-3">
                {imposters.map((player) => (
                  <PlayerAvatarBadge
                    key={player.id}
                    avatarId={player.avatarId}
                    avatarClassName="size-12"
                    name={player.name}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-2 text-typ-display font-bold text-foreground">
                {fallbackImposterNames}
              </p>
            )}
          </div>
          <div>
            <p className="text-typ-overline font-semibold uppercase tracking-wide text-muted-foreground">
              Secret word
            </p>
            <p className="mt-2 text-typ-display font-bold text-foreground">{round.secretWord}</p>
          </div>
        </div>
        <div className="mt-8">
          <ReadyNextStepsCard primaryText="Compare notes at the table. Use Pick another game in the footer when your group is ready to leave this room." />
        </div>
      </GamePanel>
    );
  }

  return (
    <GamePanel title="Imposter">
      <p className={IMPOSTER_NOTICE_CLASS}>
        {error || "Unexpected Imposter state - try reconnecting."}
      </p>
    </GamePanel>
  );
}

function ImposterRevealBody({
  snapshot,
  revealSubjectId,
  revealSubjectIsImposter,
  viewerPlayerId,
}: {
  readonly snapshot: ImposterSnapshot;
  readonly revealSubjectId: string;
  readonly revealSubjectIsImposter: boolean;
  readonly viewerPlayerId: string;
}) {
  const round = snapshot.round;

  if (!round) {
    return null;
  }

  const parallelProgress = getParallelRevealProgress(round, viewerPlayerId);

  if (parallelProgress) {
    return (
      <ParallelRevealBody
        done={parallelProgress.done}
        isImposter={revealSubjectIsImposter}
        seen={parallelProgress.seen}
        snapshot={snapshot}
        viewerPlayerId={viewerPlayerId}
      />
    );
  }

  return (
    <SequentialRevealBody
      isImposter={revealSubjectIsImposter}
      revealSubjectId={revealSubjectId}
      snapshot={snapshot}
      viewerPlayerId={viewerPlayerId}
    />
  );
}

function ParallelRevealBody({
  snapshot,
  viewerPlayerId,
  seen,
  done,
  isImposter,
}: {
  readonly snapshot: ImposterSnapshot;
  readonly viewerPlayerId: string;
  readonly seen: boolean;
  readonly done: boolean;
  readonly isImposter: boolean;
}) {
  const round = snapshot.round;

  if (!round) {
    return null;
  }

  const viewerName = imposterPlayerName(snapshot.players, viewerPlayerId);
  const viewer = snapshot.players.find((player) => player.id === viewerPlayerId);

  if (!seen) {
    return (
      <PrivateRevealPrompt
        avatarId={viewer?.avatarId}
        eyebrow={`Secret role - player ${imposterPlayerOrdinal(snapshot.players, viewerPlayerId)} of ${snapshot.players.length}`}
        name={viewerName}
        primaryText="When you are in private, tap Reveal my role in the footer. The table cannot start the clue round until everyone has looked."
        subtitle="Only you should look at your phone for this step."
      />
    );
  }

  if (!done) {
    return (
      <RoleRevealCard
        avatarId={viewer?.avatarId}
        isImposter={isImposter}
        name={viewerName}
        secretWord={round.secretWord}
        primaryText={
          <>
            You must remember your role. Once you have memorised it, tap <strong>Continue</strong>.
            The game will start once everybody is ready.
          </>
        }
      />
    );
  }

  return (
    <GamePanel title="Reveal roles">
      <p className={IMPOSTER_NOTICE_CLASS}>
        You are done on this device. Wait quietly while everyone else finishes their private reveal.
      </p>
    </GamePanel>
  );
}

function SequentialRevealBody({
  snapshot,
  revealSubjectId,
  viewerPlayerId,
  isImposter,
}: {
  readonly snapshot: ImposterSnapshot;
  readonly revealSubjectId: string;
  readonly viewerPlayerId: string;
  readonly isImposter: boolean;
}) {
  const round = snapshot.round;

  if (!round) {
    return null;
  }

  const subject = snapshot.players[round.revealPlayerIndex];
  const isViewerTurn = viewerPlayerId === revealSubjectId;

  if (!isViewerTurn) {
    return (
      <GamePanel title="Reveal roles">
        <p className={IMPOSTER_NOTICE_CLASS}>
          Waiting for <span className="font-semibold text-foreground">{subject?.name}</span> to
          finish this reveal step on their device.
        </p>
      </GamePanel>
    );
  }

  if (!round.revealRevealed) {
    return (
      <PrivateRevealPrompt
        avatarId={subject?.avatarId}
        eyebrow={`Secret role ${round.revealPlayerIndex + 1} of ${snapshot.players.length}`}
        name={subject?.name ?? "Player"}
        primaryText="When you are in private, use the footer button on this screen. Wait quietly if it is not your turn yet."
        subtitle="Only you should look when it is your step."
      />
    );
  }

  return (
    <RoleRevealCard
      avatarId={subject?.avatarId}
      isImposter={isImposter}
      name={subject?.name ?? "Player"}
      secretWord={round.secretWord}
      primaryText={
        <>
          You must remember your role. Once you have memorised it, use the footer button to pass the
          phone or continue. The game moves on once everyone has confirmed.
        </>
      }
    />
  );
}

function PrivateRevealPrompt({
  avatarId,
  eyebrow,
  name,
  subtitle,
  primaryText,
}: {
  readonly avatarId?: string | undefined;
  readonly eyebrow: string;
  readonly name: string;
  readonly subtitle: string;
  readonly primaryText: string;
}) {
  return (
    <GamePanel eyebrow={eyebrow} subtitle={subtitle} title={`Reveal - ${name}`}>
      <PlayerAvatarBadge avatarId={avatarId} detail="Private reveal" name={name} />
      <p className={IMPOSTER_NOTICE_CLASS}>
        When you are ready in private, tap the footer button to see your role.
      </p>
      <div className="mt-6">
        <ReadyNextStepsCard primaryText={primaryText} />
      </div>
    </GamePanel>
  );
}

function RoleRevealCard({
  avatarId,
  isImposter,
  name,
  secretWord,
  primaryText,
}: {
  readonly avatarId?: string | undefined;
  readonly isImposter: boolean;
  readonly name: string;
  readonly secretWord: string;
  readonly primaryText: React.ReactNode;
}) {
  return (
    <GamePanel
      eyebrow={isImposter ? "Your role" : "Remember this"}
      subtitle={
        isImposter
          ? "Blend in during clues - the crew does not know who you are."
          : "Give a clue that proves you know the word without handing it to imposters."
      }
      title={name}
    >
      <PlayerAvatarBadge
        avatarId={avatarId}
        detail={isImposter ? "Secret role" : "Secret word"}
        name={name}
      />
      {isImposter ? (
        <TurnPlayHighlight>{IMPOSTER_ROLE_CARD_COPY}</TurnPlayHighlight>
      ) : (
        <TurnPlayHighlight>{secretWord}</TurnPlayHighlight>
      )}
      <div className="mt-6">
        <ReadyNextStepsCard primaryText={primaryText} />
      </div>
    </GamePanel>
  );
}

function GuidePregameBody({
  snapshot,
  viewerPlayerId,
  isHost,
}: {
  readonly snapshot: ImposterSnapshot;
  readonly viewerPlayerId: string;
  readonly isHost: boolean;
}) {
  const starterName = snapshot.cluesStartPlayerId
    ? imposterPlayerName(snapshot.players, snapshot.cluesStartPlayerId, "Someone")
    : "Someone";
  const starter = snapshot.cluesStartPlayerId
    ? snapshot.players.find((player) => player.id === snapshot.cluesStartPlayerId)
    : null;

  return (
    <GamePanel
      eyebrow="Clue round"
      subtitle="Talk together at the table - this app only carries instructions."
      title="Give your clues"
    >
      <PlayerAvatarBadge
        avatarId={starter?.avatarId}
        detail="Starts the clue circle"
        name={starterName}
      />
      <p className="text-typ-body text-foreground">
        Start with <strong>{starterName}</strong> and then move left around the circle, until
        everyone has gone twice. On each pass, say one short clue about the secret word. Imposters
        should try to sound like everyone else.
      </p>
      <div className="mt-6 space-y-4">
        <ReadyNextStepsCard primaryText="Once you have finished two rounds of guesses the host must move you on to the next phase." />
        {snapshot.round ? (
          <ImposterRemindMeCard
            isImposter={snapshot.round.imposterPlayerIds.includes(viewerPlayerId)}
            secretWord={snapshot.round.secretWord}
          />
        ) : null}
      </div>
      <HostWaitingNotice isHost={isHost} />
    </GamePanel>
  );
}

function GuidePrediscussionBody({ isHost }: { readonly isHost: boolean }) {
  return (
    <GamePanel
      eyebrow="Discussion & vote"
      subtitle="The app is not tracking votes - your group decides together."
      title="Talk it out, then vote"
    >
      <p className="text-typ-body text-foreground">
        Discuss who felt suspicious. When you are ready, vote at the table on who you think is the
        imposter (use whatever rule your group agrees on).
      </p>
      <p className={`mt-4 ${IMPOSTER_NOTICE_CLASS}`}>
        After voting is settled, the host taps below before anyone reads the phone again for the
        reveal.
      </p>
      <div className="mt-6">
        <ReadyNextStepsCard primaryText="Once you have finished voting the host must move you on to the next phase." />
      </div>
      <HostWaitingNotice isHost={isHost} />
    </GamePanel>
  );
}

function GuideWarningBody({ isHost }: { readonly isHost: boolean }) {
  return (
    <GamePanel
      eyebrow="Big reveal"
      subtitle="Everyone should be ready for spoilers."
      title="About to reveal the imposter"
    >
      <p className="text-typ-body text-foreground">
        The next screen shows who was secretly the imposter and what the word was.
      </p>
      <p className={`mt-4 ${IMPOSTER_NOTICE_CLASS}`}>
        Are all players okay moving on - including anyone who should look away until you say so?
      </p>
      <div className="mt-6">
        <ReadyNextStepsCard primaryText="When you are ready, the host should tap Reveal in the footer to show the imposter(s) and the secret word on everyone's phones." />
      </div>
      <HostWaitingNotice isHost={isHost} />
    </GamePanel>
  );
}

function HostWaitingNotice({ isHost }: { readonly isHost: boolean }) {
  if (isHost) {
    return null;
  }

  return <p className={`mt-4 ${IMPOSTER_NOTICE_CLASS}`}>Waiting on host to continue.</p>;
}
