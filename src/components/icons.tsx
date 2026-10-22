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

import { GameArtwork } from "./GameArtwork";

type IconProps = SVGAttributes<SVGSVGElement>;

export function IconTrivia({ className }: IconProps) {
  return <GameArtwork game="trivia" className={className} />;
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

/** Game identities follow the selected artwork family; controls remain Lucide. */
export function IconTopHat({ className }: IconProps) {
  return <GameArtwork game="hat" className={className} />;
}

export function IconDisguise({ className }: IconProps) {
  return <GameArtwork game="imposter" className={className} />;
}

export function IconWhoWhatWhere({ className }: IconProps) {
  return <GameArtwork game="www" className={className} />;
}

/** Retained name for the historical multiplayer game's identity icon. */
export function IconQuestionMark(props: IconProps) {
  return <IconWhoWhatWhere {...props} />;
}
