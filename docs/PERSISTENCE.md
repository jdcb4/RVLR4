# Device persistence

## Prerelease compatibility policy

Backward compatibility with saves from earlier app versions is optional during prerelease (Joe, 22 October 2026). Keep compatibility when overhead is low or zero; schema changes need not carry migrations or legacy support solely to retain old games. Document any save reset required by an update. This does not relax current-version interruption recovery, atomic saves, privacy or isolation between games. The compatibility details below describe the current implementation, not a requirement to preserve those formats indefinitely.

## Current storage contract

Each game owns a separate complete validated session through nativeSnapshotStore. The native RvlryDevice plugin atomically rotates current/previous checkpoints in SQLite; successful writes acknowledge only after transaction commit. Per-key reads, writes and removal share an ordered queue. No runtime server or network storage exists.

| Key                            | Contents                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| whowhatwhere.device-session.v1 | Setup position, teams/settings, full match/deck, monotonic remaining time, pause cover and recap/round-complete presentation position.                        |
| hat.device-session.v1          | Setup and private figure drafts/entry position, complete match/deck, phase/team/presenter, remaining time and recap position.                                 |
| imposter.device-session.v1     | Setup/roster, once-generated secret and assignments, current private-reveal player and clue/discussion/final-reveal step. Visibility is always false on disk. |
| trivia.device.v3               | Cooperative setup, selected question/answer copies and order, progress, reveal state, optional end-mode shared answers and nullable Correct/Incorrect marks; schemaVersion 3. |

Who What Where version-1 compatibility is preserved: old records without presentationStage default to null. Tests load an installed-style active-turn envelope and prove its bytes remain unchanged while other games save or clear their own records.

Bundled catalogue metadata is not stored in game snapshots. Game adapters project only the existing `{ word, category, hint }` or string values. Catalogue additions, canonical-name corrections and alias merges apply to newly generated content; a saved deck, submitted Hat clue or Imposter secret keeps its existing value when resumed.

## App preferences

`app.content.v1` stores `{ schemaVersion: 1, kidsMode }` independently of themes and games. Defaults off only when no record exists; corrupt or unsupported preferences block new automatic selection until loading succeeds. Preference changes publish after durable commit; failed writes leave the last committed value active. A new pool waits for an outstanding preference write.

WWW and Imposter settings use `wordDifficulty` with Easy, Medium and Hard selections; Hard is the new default, and legacy `all` values are accepted as Hard. Easy uses only easy entries, Medium targets equal easy/medium shares, and Hard targets equal easy/medium/hard shares, filling shortages only within allowed tiers and existing category/Kids filters. WWW freezes `kidsMode` when a match starts. Later turns use saved settings; changing the app preference does not change an existing match. Missing legacy Kids settings default to false, independently of the retained legacy `difficultyMode` rule field. New Imposter deals read the global preference, while resumed secrets never regenerate. Hat suggestions read the preference per request and discard delayed results after edits or navigation; manual and already-submitted clues remain intact.

`app.appearance.v1` stores `{ schemaVersion: 1, theme }` independently of every game. The theme enum is validated and uses the same native current/previous snapshot store. Selection is shown only after commit; unsupported/corrupt records are preserved, and Settings offers a load retry rather than silently replacing them. Browser previews use the same localStorage envelope adapter as game sessions.

## Recovery and private-screen handoffs

Validate before enabling writes. A corrupt current record may fall back to the valid previous record; repair preserves that validated checkpoint. Unsupported versions are retained with an explicit error. Failed writes stop play and offer retry. Replacement commits before discarding the old game; merely viewing a saved-game chooser does not update its timestamp.

Timed games measure elapsed time with performance.now and persist a remaining budget. ISO deadlines are engine adapters only. Backgrounding pauses and conceals; cold restore opens the saved chooser, then a pause cover before resuming a live turn. Drafts debounce briefly and flush on background/leave; active turns checkpoint every second. Abrupt process termination may lose the last short draft interval or return a small amount of time.

Hat commits generated queues before showing them. A phase can advance midturn without resetting its remaining time. Private entry is concealed after restoration. Imposter commits the deal before any reveal, keeps the same current player's role through pause/reload, hides it before the next player, and retains failed generated deals in memory for retry rather than rerolling. Final results persist a reusable setup instead of a resumable completed secret/game.

The browser preview uses localStorage envelopes prefixed rvlry.snapshot.; it is a development adapter, not evidence of Android durability. Native backups are disabled. Uninstalling/clearing data deletes saves. No automatic import of the old website's saves occurs.

## Retained validation code

services/savedStates contains reusable nested rule validation and tested historical migration helpers. Hat uses its nested schema; Who What Where uses its setup/match schemas. Legacy browser-storage helpers remain where validation/regression tests require them, but old browser controllers and multiplayer credentials are not in Android routes. Do not reintroduce fallback-to-memory persistence as a successful durable save.

## Trivia content foundation — 0.33.0

Content packs use separate `rvlry-content.db` chunk rows rather than the 1 MiB session envelopes. Atomic full-synchronous transactions retain current and previous pack bodies independently for Trivia and words. Native compare-and-swap prevents competing installations from overwriting newer content. The TypeScript layer validates packs and retains the selected valid checkpoint during recovery. Browser previews use separate `rvlry.content.trivia` storage and are not evidence of native durability. See [TRIVIA_CONTENT.md](TRIVIA_CONTENT.md).

Cooperative Trivia uses `trivia.device.v3` with `schemaVersion: 3` in 0.37.0. It stores selected question copies, optional shared written answers for end reveal mode, reveal/progress state and per-question `mark: boolean | null`. `true` means Correct, `false` means Incorrect and `null` means unmarked. Reveal-after-each mode has no writing. On end-mode reveal, trimming, lowercasing and collapsing whitespace must produce an exact canonical-answer or acceptable-alias match for an automatic Correct mark; other answers remain unmarked. Players can override marks, and advancing revealed questions requires a mark. The shared result and scrollable recap derive from marked, non-excluded questions; expired unshown questions contribute to neither. Earlier `trivia.device.v1` and `trivia.device.v2` sessions are ignored rather than migrated, so upgrading starts a fresh Trivia quiz. This deliberate prerelease reset does not affect other games or the independently versioned question pack. `app.features.v1` stores the default-off picker toggle; hiding Trivia preserves its current save.

## Screenshots (0.34.1)

Screenshots, screen recording and Android recent-app previews are allowed throughout the app, including private words and roles, as requested by Joe. The native FLAG_SECURE setting and privacy bridge API have been removed. Background pause/conceal behavior and player handoff covers remain unchanged.

Trivia 0.37.1 adds a persisted `ready` phase within v3 for end-mode quizzes. All played questions remain unrevealed until Go to answers, including after reload. Existing v3 questions/answers/results saves remain compatible.
