import { PrimaryFooterButton, SecondaryFooterButton } from "@/components/game/GameFooterButtons";
import { IconCheck, IconSkipForward } from "@/components/icons";
import type { EmitWithAck } from "@/domain/multiplayer/protocol";
import { playGameSoundEffect } from "@/services/gameSoundEffects";

/**
 * Shared Skip + Correct footer for the multiplayer turn screen. Used by
 * Hat and Who What Where — the only delta between games is which Socket.IO
 * event to emit and how each game decides whether Skip is currently allowed.
 *
 * Owns the click handler boilerplate (busy flag, error message, success tone)
 * so the call site is the props alone.
 */
export function MultiplayerSkipCorrectFooter({
  busy,
  correctEvent,
  emitWithAck,
  setBusy,
  setError,
  skipDisabled,
  skipEvent,
}: {
  readonly busy: boolean;
  readonly correctEvent: "hat:correct" | "www:correct";
  readonly emitWithAck: EmitWithAck;
  readonly setBusy: (value: boolean) => void;
  readonly setError: (value: string) => void;
  readonly skipDisabled: boolean;
  readonly skipEvent: "hat:skip" | "www:skip";
}) {
  return (
    <div className="flex w-full flex-col gap-2">
      <SecondaryFooterButton
        disabled={busy || skipDisabled}
        icon={<IconSkipForward className="size-5" />}
        label="Skip"
        onClick={async () => {
          setBusy(true);
          const ack = await emitWithAck(skipEvent);

          if (ack?.ok === false) {
            setError(ack.error ?? "");
          } else {
            void playGameSoundEffect("skip");
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
          const ack = await emitWithAck(correctEvent);

          if (ack?.ok === false) {
            setError(ack.error ?? "");
          } else {
            void playGameSoundEffect("correct");
          }

          setBusy(false);
        }}
      />
    </div>
  );
}
