export function gameKindLabel(kind: string): string {
  if (kind === "whowhatwhere") {
    return "Who What Where";
  }

  if (kind === "hat") {
    return "Hat Game";
  }

  if (kind === "imposter") {
    return "Imposter";
  }

  if (kind === "drawnguess") {
    return "DrawNGuess";
  }

  return kind;
}
