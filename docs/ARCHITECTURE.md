# Android architecture

React, Vite and Capacitor bundle a standalone offline application. Native uses hash routing; browser previews use ordinary routes. There is no server or multiplayer runtime. The historical server and Draw & Guess were removed after an import audit; git preserves their history.

## Ownership

- Game domains own rules, decks, scoring and transitions. Hat, Imposter and Who What Where retain separate domain types.
- Each device controller owns its complete validated session, draft state, privacy cover, transitions and save-error recovery. Do not force games with different privacy/rule requirements into a universal reducer.
- `useDeviceController` binds one stable controller to React subscriptions and lifecycle cleanup.
- `nativeSnapshotStore` is the single persistence boundary: per-key ordered reads/writes/removal, version validation, current/previous recovery, and explicit refusal to overwrite unknown versions.
- `deviceLifecycle` deduplicates native/DOM events and serializes privacy/keep-awake requests.
- `turnClock` calculates monotonic remaining time and adapts it to domain ISO deadlines. Background time never consumes a turn; restored active turns require explicit resume.
- Shared GameShell, footer buttons, dialogs, roster inputs and Lucide icons provide phone UI primitives. Game-specific phase/reveal screens remain owned by the game.

SQLite transactions rotate current/previous records atomically. Browser preview uses separate localStorage envelopes and does not establish native durability. Who What Where keeps `whowhatwhere.device-session.v1` and its payload contract unchanged.

Independent aesthetic demos live under `docs/design/aesthetic-demos`; they are outside production routes and bundles. No production theme choice is implied by their existence.

See [Android verification](ANDROID.md) and [persistence](PERSISTENCE.md).
