# Browser persistence

## Android prototype

Who What Where uses a separate complete session snapshot through
`nativeSnapshotStore.ts`, not the historical browser keys below. The snapshot
includes setup position, names/settings, exact match state and timer remaining.
Version 0.26 adds an optional `presentationStage` to the same version-1 record:
`recap`, `roundComplete`, or null. Existing 0.25 saves default to null and retain
their setup, game and countdown. The engine may already point at the next team
while the UI reviews the completed turn; this presentation position is saved too.
The native `RvlryDevice` plugin stores current and previous checkpoints in SQLite.
Writes, reads and clears share an ordered queue. Successful native writes
acknowledge only after committing the transaction.

Loads validate the record before enabling writes; corrupt current data can
recover from a valid previous checkpoint. Unsupported versions are retained and
reported rather than silently discarded. Failed writes surface retry UI.
The web preview stores both checkpoints in one localStorage item; it is a
development adapter and cannot establish native durability.

Cold restoration is paused and concealed. The game first offers its saved
date/time and Resume or Start new game. Opening
an active saved turn shows its pause summary; only Resume turn reveals the clue.
Confirmed replacement commits the new setup before replacing the in-memory
game. A failed replacement retains the old game and exposes retry. Merely viewing
or leaving the saved-game choice does not rewrite its saved timestamp.
Draft changes are briefly debounced; confirmed transitions save promptly and
active timer progress is checkpointed.
Android may terminate without a final callback, so recovery uses the latest
durable checkpoint. Clearing application data/uninstalling removes local saves.
Native backups are disabled in the prototype to avoid restoring private rounds
unexpectedly. No automatic import of the original website's saves is performed.

Hat and Imposter's historical browser flows below are not exposed in the
prototype. Their conversion follows the Pixel 10 checkpoint.

## Historical web storage

Multiplayer rooms live only in server RAM. Browser session credentials identify
a seat; they are not a backup of the room and cannot survive server room loss.
The `sessionCredentials` schema is shared by socket binding, HTTP entry parsing,
and saved credential reads. A display name is not a resume credential.

Pass-and-play games use the existing localStorage keys:

| Key                     | Boundary and supported migration                                                                                                   |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `whowhatwhere.setup.v1` | Settings and team arrays; missing historical settings use current defaults                                                         |
| `whowhatwhere.match.v1` | Version 1 (or older unversioned wrapper), timestamp, complete match; default historical hints, turn summaries and best-turn fields |
| `hat-game.state.v1`     | Version 1 or bare snapshot; `counts` becomes `settings`, missing turn/skip preferences get the established defaults                |
| `imposter.state.v1`     | Version 1 or bare snapshot; complete roster, round, and role references                                                            |

Validators in `src/services/savedStates` reject unknown versions, malformed
nested values, missing active sessions, and invalid team/player references.
Invalid records are cleared with an on-screen explanation. Completed games
are not offered for resume. The application controllers retain their existing
per-game lifecycle and continue to own gameplay.

`browserStorage.ts` contains every browser storage exception. A failed write
remains available in this page's memory, and a failed removal creates a local
tombstone so an older disk save cannot reappear immediately. A notice explains
that refreshing or closing the page may lose progress. This fallback is not
durable storage, and the app does not promise cross-device saves. A successful
later write resumes persistence. Clearing browser data discards saved games.

When adding saved fields, update the game validator and a real state round-trip
test. Provide an explicit migration for known formats; do not cast parsed JSON
or infer a future schema version. Audio, socket objects, and DOM references
never belong in saved snapshots.
