/**
 * Shared start-new-game / resume-saved-game factories for singleplayer
 * controllers (Hat + Imposter today). Each controller wires its own state
 * setters and storage clear-function; the factories own the call order
 * (clear confirm flag → drop saved record → clear error → persist clear →
 * reset snapshot) so the two controllers don't drift.
 */

type StartNewGameArgs<TSnapshot> = {
  readonly clearSavedState: () => Promise<void> | void;
  readonly resetSnapshot: () => TSnapshot;
  readonly setConfirmNewGame: (value: boolean) => void;
  readonly setError: (value: string) => void;
  readonly setSavedRecord: (value: null) => void;
  readonly setSnapshot: (value: TSnapshot) => void;
};

export function makeSingleplayerStartNewGame<TSnapshot>({
  clearSavedState,
  resetSnapshot,
  setConfirmNewGame,
  setError,
  setSavedRecord,
  setSnapshot,
}: StartNewGameArgs<TSnapshot>): () => Promise<void> {
  return async () => {
    setConfirmNewGame(false);
    setSavedRecord(null);
    setError("");
    await clearSavedState();
    setSnapshot(resetSnapshot());
  };
}

type ResumeSavedGameArgs<TSnapshot, TRecord extends { readonly snapshot: TSnapshot }> = {
  /** Current saved record reference — captured at the call site each render. */
  readonly savedRecord: TRecord | null;
  readonly setConfirmNewGame: (value: boolean) => void;
  readonly setError: (value: string) => void;
  readonly setSnapshot: (value: TSnapshot) => void;
  /**
   * Optional per-game normalizer (Hat uses it to upgrade an older snapshot
   * shape; Imposter passes through unchanged).
   */
  readonly normalize?: (snapshot: TSnapshot) => TSnapshot;
};

export function makeSingleplayerResumeSavedGame<
  TSnapshot,
  TRecord extends { readonly snapshot: TSnapshot },
>({
  savedRecord,
  setConfirmNewGame,
  setError,
  setSnapshot,
  normalize,
}: ResumeSavedGameArgs<TSnapshot, TRecord>): () => void {
  return () => {
    if (!savedRecord) {
      return;
    }

    setConfirmNewGame(false);
    setError("");
    setSnapshot(normalize ? normalize(savedRecord.snapshot) : savedRecord.snapshot);
  };
}
