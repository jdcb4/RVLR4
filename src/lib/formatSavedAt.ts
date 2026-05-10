/** Format an ISO timestamp for “saved at …” UI (games, resume cards). */
export function formatSavedAt(value?: string): string {
  if (!value) {
    return "";
  }
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}
