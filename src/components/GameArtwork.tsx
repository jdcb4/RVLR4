import { useId, useSyncExternalStore } from "react";

import regions from "@/themes/gameArtworkRegions.json";
import { getThemeState, subscribeTheme } from "@/themes/themePreference";

type GameArtworkProps = {
  game: "www" | "hat" | "imposter" | "trivia";
  className?: string | undefined;
};

/** Display-only crops isolate each illustration; the approved source pixels stay unchanged. */
export function GameArtwork({ game, className }: GameArtworkProps) {
  const { theme } = useSyncExternalStore(subscribeTheme, getThemeState);
  const clipId = useId();
  const sheet = regions[theme];
  const region = sheet.games[game];
  return (
    <svg
      className={className}
      width="1em"
      height="1em"
      viewBox={region.viewBox}
      fill="none"
      aria-hidden="true"
      focusable="false"
      data-game-artwork={game}
      data-artwork-theme={theme}
      style={{ overflow: "hidden", pointerEvents: "none" }}
    >
      <defs>
        <clipPath id={clipId} clipPathUnits="userSpaceOnUse">
          <polygon points={region.points} />
        </clipPath>
      </defs>
      <image
        href={sheet.src}
        width={sheet.width}
        height={sheet.height}
        clipPath={`url(#${clipId})`}
      />
    </svg>
  );
}
