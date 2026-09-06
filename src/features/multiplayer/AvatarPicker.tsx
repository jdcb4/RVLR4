import { PlayerAvatar } from "@/components/PlayerAvatar";
import { cn } from "@/lib/utils";
import { AVATAR_IDS, type AvatarId, pickRandomAvatarId } from "@/multiplayer/avatarCatalog";

export function AvatarPicker({
  value,
  onChange,
}: {
  readonly value: AvatarId;
  readonly onChange: (next: AvatarId) => void;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-typ-card-title font-semibold">Avatar</p>
          <p className="mt-1 text-typ-ui-snug text-muted-foreground">
            This appears in the lobby and DrawNGuess books.
          </p>
        </div>
        <button
          className="shrink-0 rounded-xl border border-border px-3 py-2 text-typ-ui font-semibold transition hover:bg-muted"
          type="button"
          onClick={() => onChange(pickRandomAvatarId())}
        >
          Random
        </button>
      </div>
      <div className="mt-4 grid grid-cols-5 gap-2">
        {AVATAR_IDS.map((avatarId) => {
          const selected = avatarId === value;

          return (
            <button
              aria-label={`Choose ${avatarId} avatar`}
              aria-pressed={selected}
              className={cn(
                "flex aspect-square items-center justify-center rounded-xl border bg-background p-1 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected
                  ? "border-primary bg-semantic-primary-soft-bg"
                  : "border-border hover:border-semantic-primary-border hover:bg-semantic-accent-hover-wash",
              )}
              key={avatarId}
              type="button"
              onClick={() => onChange(avatarId)}
            >
              <PlayerAvatar avatarId={avatarId} className="size-full border-0 shadow-none" />
            </button>
          );
        })}
      </div>
    </section>
  );
}
