# Device persistence

Each game owns a separate complete validated session through nativeSnapshotStore. The native RvlryDevice plugin atomically rotates current/previous checkpoints in SQLite; successful writes acknowledge only after transaction commit. Per-key reads, writes and removal share an ordered queue. No runtime server or network storage exists.

| Key                            | Contents                                                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| whowhatwhere.device-session.v1 | Setup position, teams/settings, full match/deck, monotonic remaining time, pause cover and recap/round-complete presentation position.                        |
| hat.device-session.v1          | Setup and private figure drafts/entry position, complete match/deck, phase/team/presenter, remaining time and recap position.                                 |
| imposter.device-session.v1     | Setup/roster, once-generated secret and assignments, current private-reveal player and clue/discussion/final-reveal step. Visibility is always false on disk. |

Who What Where version-1 compatibility is preserved: old records without presentationStage default to null. Tests load an installed-style active-turn envelope and prove its bytes remain unchanged while other games save or clear their own records.

## App preferences

`app.appearance.v1` stores `{ schemaVersion: 1, theme }` independently of every game. The theme enum is validated and uses the same native current/previous snapshot store. Selection is shown only after commit; unsupported/corrupt records are preserved, and Settings offers a load retry rather than silently replacing them. Browser previews use the same localStorage envelope adapter as game sessions.

## Recovery and privacy

Validate before enabling writes. A corrupt current record may fall back to the valid previous record; repair preserves that validated checkpoint. Unsupported versions are retained with an explicit error. Failed writes stop play and offer retry. Replacement commits before discarding the old game; merely viewing a saved-game chooser does not update its timestamp.

Timed games measure elapsed time with performance.now and persist a remaining budget. ISO deadlines are engine adapters only. Backgrounding pauses and conceals; cold restore opens the saved chooser, then a pause cover before resuming a live turn. Drafts debounce briefly and flush on background/leave; active turns checkpoint every second. Abrupt process termination may lose the last short draft interval or return a small amount of time.

Hat commits generated queues before showing them. A phase can advance midturn without resetting its remaining time. Private entry is concealed after restoration. Imposter commits the deal before any reveal, keeps the same current player's role through pause/reload, hides it before the next player, and retains failed generated deals in memory for retry rather than rerolling. Final results persist a reusable setup instead of a resumable completed secret/game.

The browser preview uses localStorage envelopes prefixed rvlry.snapshot.; it is a development adapter, not evidence of Android durability. Native backups are disabled. Uninstalling/clearing data deletes saves. No automatic import of the old website's saves occurs.

## Retained validation code

services/savedStates contains reusable nested rule validation and tested historical migration helpers. Hat uses its nested schema; Who What Where uses its setup/match schemas. Legacy browser-storage helpers remain where validation/regression tests require them, but old browser controllers and multiplayer credentials are not in Android routes. Do not reintroduce fallback-to-memory persistence as a successful durable save.
