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

/** Game identities share a 32-unit canvas and the same rounded stroke. */
export function IconTopHat(props: IconProps) {
  return (
    <svg {...iconProps({ viewBox: "0 0 32 32", strokeWidth: 1.8, ...props })}>
      <path d="m9 12-2-7 7-2 3 9M19 12l1-7 7 1-1 6" />
      <path d="m10 7 3-.8M22 8l2 .3" />
      <path d="M7 12h18l-2 13H9Z" />
      <path d="M8.5 21h15M3 25h26v1c0 2-5.8 3-13 3S3 28 3 26Z" />
    </svg>
  );
}

/** A party mask with a hidden gaze for Imposter. */
export function IconDisguise(props: IconProps) {
  return (
    <svg {...iconProps({ viewBox: "0 0 32 32", strokeWidth: 1.8, ...props })}>
      <path d="M3 11c4-2.5 8-2.5 13 0 5-2.5 9-2.5 13 0l-1 7c-.6 4.2-6 6-9 2l-3-3-3 3c-3 4-8.4 2.2-9-2Z" />
      <path d="M7 14c2-1 4-.5 6 1-2 2-4.5 2-6-1ZM25 14c-2-1-4-.5-6 1 2 2 4.5 2 6-1Z" />
      <path d="m5 9 2-4M27 9l-2-4M13 26c2 1.3 4 1.3 6 0" />
    </svg>
  );
}

/** A person, an object and a place make Who What Where recognizable at a glance. */
export function IconWhoWhatWhere(props: IconProps) {
  return (
    <svg {...iconProps({ viewBox: "0 0 32 32", strokeWidth: 1.8, ...props })}>
      <circle cx="8" cy="7" r="3" />
      <path d="M3 18v-2a5 5 0 0 1 10 0v2M6 18v-3M10 18v-3" />
      <path d="m23 3 6 3.5v7L23 17l-6-3.5v-7ZM17 6.5l6 3.5 6-3.5M23 10v7" />
      <path d="M21 23c0 4-5 7-5 7s-5-3-5-7a5 5 0 0 1 10 0Z" />
      <circle cx="16" cy="23" r="1.5" />
    </svg>
  );
}

/** Retained name for the historical multiplayer game's identity icon. */
export function IconQuestionMark(props: IconProps) {
  return <IconWhoWhatWhere {...props} />;
}
