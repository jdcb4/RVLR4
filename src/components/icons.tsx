import {
  ArrowLeftRight,
  ArrowRightToLine,
  Check,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Crown,
  House,
  Pencil,
  Plus,
  QrCode,
  RotateCcw,
  Share2,
  SkipForward,
  Trash2,
} from "lucide-react";
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
  return <ChevronLeft size="1em" aria-hidden="true" {...props} />;
}

export function IconCheck(props: IconProps) {
  return <Check size="1em" aria-hidden="true" {...props} />;
}

export function IconSkipForward(props: IconProps) {
  return <SkipForward size="1em" aria-hidden="true" {...props} />;
}

export function IconPlus(props: IconProps) {
  return <Plus size="1em" aria-hidden="true" {...props} />;
}

export function IconTrash(props: IconProps) {
  return <Trash2 size="1em" aria-hidden="true" {...props} />;
}

export function IconRotateCcw(props: IconProps) {
  return <RotateCcw size="1em" aria-hidden="true" {...props} />;
}

export function IconHouse(props: IconProps) {
  return <House size="1em" aria-hidden="true" {...props} />;
}

export function IconChevronRight(props: IconProps) {
  return <ChevronRight size="1em" aria-hidden="true" {...props} />;
}

export function IconPencil(props: IconProps) {
  return <Pencil size="1em" aria-hidden="true" {...props} />;
}

export function IconCrown(props: IconProps) {
  return <Crown size="1em" aria-hidden="true" {...props} />;
}

export function IconClipboard(props: IconProps) {
  return <ClipboardList size="1em" aria-hidden="true" {...props} />;
}

/** Share icon — three dots connected by lines (universal share-sheet glyph). */
export function IconShare(props: IconProps) {
  return <Share2 size="1em" aria-hidden="true" {...props} />;
}

/** Compact QR-style grid for buttons (not a real QR bitmap). */
export function IconQrCode(props: IconProps) {
  return <QrCode size="1em" aria-hidden="true" {...props} />;
}

export function IconArrowRightToLine(props: IconProps) {
  return <ArrowRightToLine size="1em" aria-hidden="true" {...props} />;
}

/** Host control: move a player to another team (horizontal arrows). */
export function IconArrowLeftRight(props: IconProps) {
  return <ArrowLeftRight size="1em" aria-hidden="true" {...props} />;
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
