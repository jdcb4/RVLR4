# Browser persistence

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
