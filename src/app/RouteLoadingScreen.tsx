export function RouteLoadingScreen() {
  return (
    <main
      className="grid min-h-dvh place-items-center bg-background px-6 text-foreground"
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 shadow-sm">
        <span
          aria-hidden="true"
          className="size-5 animate-spin rounded-full border-2 border-muted border-t-primary"
        />
        <span className="text-typ-ui font-medium">Loading game…</span>
      </div>
    </main>
  );
}
