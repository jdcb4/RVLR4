# RVLRY — Actionable Engineering & UX Tasks

> **Source**: Playtesting Battery (60 Suites across 4 Games) + Full Code Quality Review  
> **Repository**: `https://github.com/jdcb4/RVLR4.git`  
> **Target Audience**: Autonomous Agents & Developers executing direct fixes.

---

## 📑 Action Items Overview

| ID | Category | Severity | Summary | Primary File(s) |
| :--- | :--- | :--- | :--- | :--- |
| **`ACT-01`** | Bug Fix | 🔴 **Critical** | Re-bind session on Socket.IO auto-reconnect | `src/multiplayer/useRoomChannel.ts` |
| **`ACT-02`** | Bug Fix | 🟠 **High** | Handle direct `/games/drawnguess` URL & catch-all 404 fallback | `src/app/router.tsx` |
| **`ACT-03`** | Performance | 🟡 **Medium** | Route-level code splitting (`React.lazy`) to reduce 567kB bundle | `src/app/router.tsx` |
| **`ACT-04`** | Performance | 🟡 **Medium** | Dynamic on-demand import for 258kB word dictionary | `src/domain/whowhatwhere/words.ts` |
| **`ACT-05`** | UX Guidance | 🟡 **Medium** | Informational helper chip for multi-device player thresholds | `src/features/multiplayer/RoomLobbyView.tsx` |
| **`ACT-06`** | Mobile Polish | 🔵 **Low** | Standardize mobile keyboard attributes (`enterkeyhint`, `autocapitalize`) | Roster and prompt input components |
| **`ACT-07`** | Accessibility | 🔵 **Low** | Suppress continuous screen reader chatter on 1s timer tickers | Turn timer countdown components |
| **`ACT-08`** | Tooling | 🔵 **Low** | Normalize Prettier line-ending configuration for Windows/Linux | `.prettierrc.json` |

---

## 🛠️ Detailed Action Items

### `ACT-01`: Re-bind Session on Socket.IO Auto-Reconnect
- **Severity**: 🔴 Critical (Bug Fix)
- **Target File**: [`src/multiplayer/useRoomChannel.ts`](file:///c:/Users/joedo/Documents/antigravity/charming-borg/rvlry_repo/src/multiplayer/useRoomChannel.ts)
- **Problem**:
  When a transient network drop occurs, Socket.IO automatically reconnects and establishes a new socket connection on the server. However, `session:bind` is currently only emitted once during component mount (in the `useEffect` body), **not** inside `handleConnect`. The new server socket instance lacks `socket.data.roomCode` and `socket.data.playerId`, causing subsequent user actions to fail with `"Join the room before sending commands."` until the page is manually reloaded.
- **Action Required**:
  Move the `session:bind` emit inside the `handleConnect` callback so every successful connection and reconnection automatically re-registers credentials with the server.
- **Implementation Guide**:
  In `src/multiplayer/useRoomChannel.ts`:
  ```typescript
  const handleConnect = () => {
    setConnected(true);
    setShuttingDown(false);

    const creds = loadSession(code);
    if (!creds) {
      setBindError("Missing session. Go back and enter your name again.");
      return;
    }

    socket.emit(
      "session:bind",
      {
        code: creds.code,
        playerId: creds.playerId,
        secret: creds.secret,
      },
      (ack?: { ok?: boolean; error?: string }) => {
        if (ack && ack.ok === false) {
          setBindError(ack.error ?? "Unable to reconnect.");
        } else {
          setBindError(null);
        }
      },
    );
  };

  socket.on("connect", handleConnect);
  socket.on("disconnect", handleDisconnect);
  socket.on("room:sync", handleSync);
  socket.on("server:shuttingDown", handleShutdown);

  if (!socket.connected) {
    socket.connect();
  }
  ```

---

### `ACT-02`: Handle Direct `/games/drawnguess` URL & Add Catch-All 404 Route
- **Severity**: 🟠 High (Bug Fix)
- **Target File**: [`src/app/router.tsx`](file:///c:/Users/joedo/Documents/antigravity/charming-borg/rvlry_repo/src/app/router.tsx)
- **Problem**:
  Navigating directly to `https://rvlry.jboxgames.com/games/drawnguess` or typing an invalid URL crashes into React Router's default unstyled ErrorBoundary (`404 Not Found`). DrawNGuess is exclusively multi-device, but should gracefully redirect users rather than crash.
- **Action Required**:
  Add an explicit redirect for `games/drawnguess` to `/name?intent=host&game=drawnguess`, and add a catch-all route `{ path: "*", element: <Navigate replace to="/" /> }`.
- **Implementation Guide**:
  In `src/app/router.tsx`:
  ```typescript
  export const router = createBrowserRouter(
    [
      {
        path: "/",
        element: <RootLayout />,
        children: [
          { index: true, element: <MultiplayerHomePage /> },
          { path: "passnplay", element: <PassNPlayHubPage /> },
          { path: "legacy", element: <Navigate replace to="/passnplay" /> },
          { path: "name", element: <EnterNamePage /> },
          { path: "room/:code", element: <RoomPage /> },
          { path: "games/whowhatwhere", element: <WhoWhatWhereSingleplayerApp /> },
          { path: "games/hat", element: <HatSingleplayerApp /> },
          { path: "games/imposter", element: <ImposterSingleplayerApp /> },
          // Redirect direct pass-and-play DrawNGuess traffic to multi-device host setup
          { path: "games/drawnguess", element: <Navigate replace to="/name?intent=host&game=drawnguess" /> },
          // Catch-all fallback
          { path: "*", element: <Navigate replace to="/" /> },
        ],
      },
    ],
    { basename: baseUrl.replace(/\/$/, "") || "/" },
  );
  ```

---

### `ACT-03`: Implement Route-Level Code Splitting (`React.lazy`)
- **Severity**: 🟡 Medium (Performance)
- **Target File**: [`src/app/router.tsx`](file:///c:/Users/joedo/Documents/antigravity/charming-borg/rvlry_repo/src/app/router.tsx)
- **Problem**:
  All 4 game frontends and multiplayer room pages are bundled into a single entry file (`index-B1VIahVA.js`: **567 kB** minified). Users on mobile networks download all game engines before choosing what to play.
- **Action Required**:
  Wrap route-level components in `React.lazy()` and wrap `<RootLayout>` / route outlet in `<Suspense>`.
- **Implementation Guide**:
  ```typescript
  import React, { Suspense } from "react";
  import { createBrowserRouter, Navigate } from "react-router-dom";

  const MultiplayerHomePage = React.lazy(() =>
    import("@/features/multiplayer/MultiplayerHomePage").then((m) => ({ default: m.MultiplayerHomePage }))
  );
  const RoomPage = React.lazy(() =>
    import("@/features/multiplayer/RoomPage").then((m) => ({ default: m.RoomPage }))
  );
  const WhoWhatWhereSingleplayerApp = React.lazy(() =>
    import("@/features/whowhatwhere/WhoWhatWhereSingleplayerApp").then((m) => ({ default: m.WhoWhatWhereSingleplayerApp }))
  );
  const HatSingleplayerApp = React.lazy(() =>
    import("@/features/hat-game/HatSingleplayerApp").then((m) => ({ default: m.HatSingleplayerApp }))
  );
  const ImposterSingleplayerApp = React.lazy(() =>
    import("@/features/imposter/ImposterSingleplayerApp").then((m) => ({ default: m.ImposterSingleplayerApp }))
  );
  ```

---

### `ACT-04`: Dynamic On-Demand Import for 258kB Mystery Word Dictionary
- **Severity**: 🟡 Medium (Performance)
- **Target File**: `src/domain/whowhatwhere/words.ts` (or word loader module)
- **Problem**:
  The static dictionary (`words.generated.js`: **258.31 kB**) is bundled eagerly and parsed even when playing *Hat Game*, *Imposter*, or *DrawNGuess*.
- **Action Required**:
  Convert dictionary loading into an asynchronous getter (`async function loadWordDeck()`) loaded when *Who What Where* starts.

---

### `ACT-05`: Add Explanatory Helper Banner for Multi-Device Player Thresholds
- **Severity**: 🟡 Medium (UX Friction)
- **Target File**: [`src/features/multiplayer/RoomLobbyView.tsx`](file:///c:/Users/joedo/Documents/antigravity/charming-borg/rvlry_repo/src/features/multiplayer/RoomLobbyView.tsx)
- **Problem**:
  In Multi-Device mode with 2 teams (Who What Where & Hat Game), the host `Start game` button remains disabled when there are fewer than 4 players (or fewer than 2 players per team). New hosts have no feedback indicating why the button is locked.
- **Action Required**:
  Add an informative status badge above the start button:
  - If total players < 4: *"Need at least 2 players on each team to start (currently {count}/4)"*
  - If a team has < 2 players: *"Each team needs at least 2 players"*
  - If players are not ready: *"Waiting for everyone to ready up"*
  - When ready: *"All players ready! Tap Start Game."*

---

### `ACT-06`: Standardize Mobile Keyboard Attributes across Inputs
- **Severity**: 🔵 Low (Mobile Polish)
- **Target Files**:
  - `src/features/multiplayer/EnterNamePage.tsx`
  - `src/features/whowhatwhere/setup/TeamSetupScreen.tsx`
  - `src/features/hat-game/screens/hatClueEntryScreen.tsx`
  - `src/features/drawnguess/multiplayer/DrawNGuessMultiplayerView.tsx`
- **Action Required**:
  Add standard HTML attributes to all `<input>` elements so mobile virtual keyboards render optimal layouts:
  ```html
  <input
    type="text"
    autocapitalize="words"
    autocomplete="off"
    enterkeyhint="done"
    spellcheck="false"
  />
  ```
  *(For DrawNGuess prompts, use `autocapitalize="sentences"` and `enterkeyhint="send"`).*

---

### `ACT-07`: Suppress Rapid Screen Reader Announcements on 1s Countdown Timer
- **Severity**: 🔵 Low (Accessibility)
- **Target Files**:
  - `src/features/whowhatwhere/turn/ActiveTurnScreen.tsx`
  - `src/features/hat-game/screens/hatActiveTurnScreen.tsx`
  - `src/features/drawnguess/multiplayer/DrawNGuessMultiplayerView.tsx`
- **Action Required**:
  1. Add `aria-live="off"` or `aria-hidden="true"` to the numerical seconds element that ticks every 1000ms.
  2. Maintain an off-screen polite live region (`<div className="sr-only" aria-live="polite">`) that only announces critical milestones (e.g. at 10 seconds and 0 seconds).

---

### `ACT-08`: Normalize Prettier Line-Ending Configuration
- **Severity**: 🔵 Low (Developer Tooling)
- **Target File**: [`.prettierrc.json`](file:///c:/Users/joedo/Documents/antigravity/charming-borg/rvlry_repo/.prettierrc.json) / `.gitattributes`
- **Problem**:
  `pnpm run format:check` reports style issues across 288 files on Windows checkouts due to CRLF vs LF line endings.
- **Action Required**:
  Add `"endOfLine": "auto"` to `.prettierrc.json`:
  ```json
  {
    "semi": true,
    "singleQuote": false,
    "trailingComma": "all",
    "endOfLine": "auto"
  }
  ```

---

## 🚀 Verification Commands after Fixes

Run the project verification suite to ensure all fixes pass cleanly:

```bash
pnpm run typecheck
pnpm run lint
pnpm test
pnpm run build
pnpm run format:check
pnpm run smoke:server-imports
```

