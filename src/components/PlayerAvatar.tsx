import type { ReactNode } from "react";

import bearUrl from "@/assets/avatars/bear.webp";
import catUrl from "@/assets/avatars/cat.webp";
import deerUrl from "@/assets/avatars/deer.webp";
import dogUrl from "@/assets/avatars/dog.webp";
import elephantUrl from "@/assets/avatars/elephant.webp";
import foxUrl from "@/assets/avatars/fox.webp";
import frogUrl from "@/assets/avatars/frog.webp";
import hedgehogUrl from "@/assets/avatars/hedgehog.webp";
import koalaUrl from "@/assets/avatars/koala.webp";
import lionUrl from "@/assets/avatars/lion.webp";
import monkeyUrl from "@/assets/avatars/monkey.webp";
import owlUrl from "@/assets/avatars/owl.webp";
import pandaUrl from "@/assets/avatars/panda.webp";
import penguinUrl from "@/assets/avatars/penguin.webp";
import rabbitUrl from "@/assets/avatars/rabbit.webp";
import raccoonUrl from "@/assets/avatars/raccoon.webp";
import squirrelUrl from "@/assets/avatars/squirrel.webp";
import tigerUrl from "@/assets/avatars/tiger.webp";
import turtleUrl from "@/assets/avatars/turtle.webp";
import wolfUrl from "@/assets/avatars/wolf.webp";
import { cn } from "@/lib/utils";
import { type AvatarId, isAvatarId } from "@/multiplayer/avatarCatalog";

const avatarUrls: Record<AvatarId, string> = {
  bear: bearUrl,
  cat: catUrl,
  deer: deerUrl,
  dog: dogUrl,
  elephant: elephantUrl,
  fox: foxUrl,
  frog: frogUrl,
  hedgehog: hedgehogUrl,
  koala: koalaUrl,
  lion: lionUrl,
  monkey: monkeyUrl,
  owl: owlUrl,
  panda: pandaUrl,
  penguin: penguinUrl,
  rabbit: rabbitUrl,
  raccoon: raccoonUrl,
  squirrel: squirrelUrl,
  tiger: tigerUrl,
  turtle: turtleUrl,
  wolf: wolfUrl,
};

export function PlayerAvatar({
  avatarId,
  name,
  className,
}: {
  readonly avatarId: AvatarId;
  readonly name?: string;
  readonly className?: string;
}) {
  return (
    <img
      alt={name ? `${name} avatar` : "Player avatar"}
      className={cn(
        "size-10 rounded-full border border-border bg-muted object-cover shadow-sm",
        className,
      )}
      draggable={false}
      src={avatarUrls[avatarId]}
    />
  );
}

export function PlayerAvatarBadge({
  avatarId,
  name,
  detail,
  className,
  avatarClassName,
}: {
  readonly avatarId?: unknown;
  readonly name: string;
  readonly detail?: ReactNode;
  readonly className?: string;
  readonly avatarClassName?: string;
}) {
  const safeAvatarId = isAvatarId(avatarId) ? avatarId : null;

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {safeAvatarId ? (
        <PlayerAvatar
          avatarId={safeAvatarId}
          className={cn("size-11", avatarClassName)}
          name={name}
        />
      ) : null}
      <div className="min-w-0">
        <p className="truncate text-typ-ui font-semibold text-foreground">{name}</p>
        {detail ? <p className="truncate text-typ-ui-snug text-muted-foreground">{detail}</p> : null}
      </div>
    </div>
  );
}
