import type { SVGAttributes } from "react";

type IconProps = SVGAttributes<SVGSVGElement>;

function iconProps(props: IconProps): IconProps {
  return {
    width: "1em",
    height: "1em",
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    "aria-hidden": true,
    ...props,
  };
}

export function IconArrowLeft(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

export function IconCheck(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function IconSkipForward(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <polygon points="5 4 15 12 5 20 5 4" />
      <line x1="19" x2="19" y1="5" y2="19" />
    </svg>
  );
}

export function IconX(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

export function IconPlus(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

export function IconTrash(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

export function IconRotateCcw(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

export function IconHouse(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

export function IconChevronRight(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

export function IconPencil(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

export function IconCrown(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M2 18h20" />
      <path d="M5 14h14v4H5z" />
      <path d="m2 10 4 4 5-8 5 8 4-4" />
    </svg>
  );
}

export function IconClipboard(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect height="16" rx="2" width="8" x="8" y="2" />
      <path d="M4 6h16v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z" />
    </svg>
  );
}

/** Share icon — three dots connected by lines (universal share-sheet glyph). */
export function IconShare(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <path d="m8.59 13.51 6.83 3.98" />
      <path d="m15.41 6.51-6.82 3.98" />
    </svg>
  );
}

/** Compact QR-style grid for buttons (not a real QR bitmap). */
export function IconQrCode(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <rect height="7" rx="1" width="7" x="3" y="3" />
      <rect height="3" width="3" x="5" y="5" />
      <rect height="7" rx="1" width="7" x="14" y="3" />
      <rect height="3" width="3" x="16" y="5" />
      <rect height="7" rx="1" width="7" x="3" y="14" />
      <rect height="7" rx="1" width="7" x="14" y="14" />
      <rect height="3" width="3" x="5" y="16" />
      <rect height="3" width="3" x="16" y="16" />
    </svg>
  );
}

export function IconArrowRightToLine(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </svg>
  );
}

/** Host control: move a player to another team (horizontal arrows). */
export function IconArrowLeftRight(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M8 12H3" />
      <path d="m5 9-3 3 3 3" />
      <path d="M16 12h5" />
      <path d="m19 9 3 3-3 3" />
    </svg>
  );
}

export function IconSparkles(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3Z" />
    </svg>
  );
}

export function IconTheatre(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M7 4v16" />
      <path d="M17 4v16" />
      <path d="M3 8h4" />
      <path d="M17 8h4" />
      <path d="M3 16h4" />
      <path d="M17 16h4" />
      <path d="M7 12h10" />
    </svg>
  );
}

export function IconMask(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M2 12a10 10 0 1 0 20 0 10 10 0 1 0-20 0" />
      <path d="M8 10h.01" />
      <path d="M16 10h.01" />
      <path d="M9.5 15.5c.5 1 1.5 1.5 2.5 1.5s2-.5 2.5-1.5" />
    </svg>
  );
}

/** Classic top hat (brim + crown + band) — used for Hat Game. */
export function IconTopHat(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      {/* Brim */}
      <path d="M3 19h18" />
      {/* Crown (sides + flat top) */}
      <path d="M7 19V6h10v13" />
      {/* Hat band */}
      <path d="M7 14h10" />
    </svg>
  );
}

/**
 * Classic Groucho-style disguise — round glasses + a handlebar mustache.
 * Used for Imposter.
 */
export function IconDisguise(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      {/* Left lens */}
      <circle cx="7" cy="10" r="3" />
      {/* Right lens */}
      <circle cx="17" cy="10" r="3" />
      {/* Nose bridge */}
      <path d="M10 10h4" />
      {/* Handlebar mustache with center divot */}
      <path d="M6 16c2-1 4-1 6 1c2-2 4-2 6-1" />
    </svg>
  );
}

/** Question mark glyph (curl + dot) — used for Who What Where. */
export function IconQuestionMark(props: IconProps) {
  return (
    <svg {...iconProps(props)}>
      <path d="M9 9a3 3 0 1 1 3 3v2" />
      <circle cx="12" cy="18" r="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
