# Naming

Game-specific rules and state remain in their game directory, with direct imports. DeviceSession names validated persisted payloads; DeviceController owns lifecycle and transitions; DevicePage names native route composition. Who What Where retains its existing SingleplayerApp/Chrome entry names for compatibility, but uses only its DeviceController.

Shared services name capabilities (nativeSnapshotStore, deviceLifecycle, turnClock); shared UI names its rendered role (DeviceTeamSetup, GameShell). Do not create a universal game reducer or duplicate game-owned Player/Team contracts in an ambiguous barrel.

Historical web, multiplayer, gallery and browser-persistence controller names are retired. Use docs/PROJECT_INDEX.md and current imports as the source of ownership. The older naming-audit script is advisory and may still contain historical heuristics.
