/** Re-centre a focused field after the software keyboard has finished opening. */
export function keepKeyboardSafeInputVisible(input: HTMLInputElement) {
  window.setTimeout(() => {
    if (!input.isConnected || input.ownerDocument.activeElement !== input) return;
    input.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
  }, 250);
}
