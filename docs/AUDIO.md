# Game audio

All game effects use **Cuelume 0.2.2** through
`src/services/gameSoundEffects.ts`. There are no audio files, CDN requests,
Tone synthesizers, or per-effect AudioContexts. The library is MIT licensed.

| Existing event                            | Cuelume sound | Used for                   |
| ----------------------------------------- | ------------- | -------------------------- |
| `correct`                                 | `success`     | Correct answer             |
| `skip`                                    | `droplet`     | Skip answer                |
| `returnSkipped`                           | `page`        | Return to skipped answer   |
| `warn10`                                  | `scan`        | Ten seconds remaining      |
| `timeout`                                 | `error`       | End of timed turn          |
| `victory`                                 | `sparkle`     | Winning result / game over |
| `defeat`                                  | `whisper`     | Losing result              |
| `phaseAdvance`                            | `arrival`     | Advance game phase         |
| `turnStart`                               | `ready`       | Start a turn               |
| `phaseOneWord` (formerly `OneWord.wav`)   | `chime`       | Hat one-word phase         |
| `phaseCharades` (formerly `Charades.wav`) | `bloom`       | Hat charades phase         |

The Hat and Who What Where services translate their existing event aliases
into this shared mapping. Multiplayer and pass-and-play use the same cues.
The two Hat phase recordings are now nonverbal cues; the phase name and rules
remain visible on screen.

Playback uses volume 0.65 and one lazily created browser AudioContext. Browsers
may suppress sound before a user gesture or when the device is muted. Cuelume
resumes a suspended context when allowed and safely ignores unavailable audio;
the app also catches playback errors so game state never depends on sound.

To change a sound, edit `GAME_SOUND_MAP`, retain the semantic event name, run
the sound service tests, and audition it on an actual device at a comfortable
volume. A new event must have a visible equivalent. See the decision and
comparison with ReactSounds in [DECISIONS.md](DECISIONS.md).
