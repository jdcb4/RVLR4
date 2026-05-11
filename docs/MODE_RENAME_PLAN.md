# Mode rename + structural refactor plan

Goal:

1. Re-frame the two play modes as **Pass-and-Play** (was "legacy") and
   **Multi-Device** (was the default / "multiplayer"). Both are first-class.
2. Landing page defaults to Multi-Device but exposes a **prominent** entry
   point to Pass-and-Play (not a buried footer link).
3. Move pass-and-play code out of the "legacy" mental model — it lives in the
   same monorepo, on equal footing structurally.
4. Refactor for component reuse across **games** and across **modes**, keeping
   distinct gameplay or UX intact. Use Fallow to prioritize.

This plan is broken into small, independently-shippable commits so a session
that ends partway through still leaves the codebase in a consistent state.
Each step lists deterministic checks; never mark a step complete with a
failing `pnpm run verify`.

---

## Step 1 — Plan doc (this file)

**Scope:** Land this plan. No code changes.

**Commit:** `docs: mode rename + structural refactor plan`.

---

## Step 2 — Concept rename in copy + promote Pass-and-Play link

**Scope:**

- Rename "Legacy pass-and-play" / "legacy" copy across `MultiplayerHomePage`,
  `LegacyHubPage`, and any other surface text to **Pass-and-Play** and
  **Multi-Device** (where the latter is needed).
- Replace the small footer link `Open legacy pass-and-play hub` on the home
  page with a **prominent secondary card** ("Prefer one phone? Pass-and-Play
  mode →").
- Update the Pass-and-Play hub copy ("These flows keep the original
  single-device rhythm…") to drop "original" / "legacy" framing.

**Out of scope:**

- URL changes (`/legacy` stays for now).
- File moves.

**Verification:** `pnpm run verify`. Smoke: open `/`, confirm the new card
links to `/legacy`; open `/legacy`, confirm the copy no longer says "legacy".

**Commit:** `feat(home): rename Legacy → Pass-and-Play, promote on landing`.
Version bump: PATCH (UX copy + layout, no behaviour change).

---

## Step 3 — URL rename `/legacy` → `/passnplay`

**Scope:**

- Add `/passnplay` route pointing to the hub.
- Keep `/legacy` as a `<Navigate to="/passnplay" replace />` redirect so
  shared links keep working.
- Update internal `<Link to="/legacy">` references to `/passnplay`.

**Verification:** `pnpm run verify`. Smoke: `/legacy` redirects to
`/passnplay`; the prominent card from Step 2 points to `/passnplay`.

**Commit:** `feat(router): /passnplay replaces /legacy (legacy redirects)`.
Version bump: PATCH.

---

## Step 4 — Drop orphan home page + rename hub file

**Scope:**

- Delete `src/features/home/HomePage.tsx` — confirmed orphan, no router or
  test references it after the audit reading.
- Rename `src/features/multiplayer/LegacyHubPage.tsx` →
  `src/features/passnplay/PassNPlayHubPage.tsx`. Update imports in the
  router.
- Move `features/home/` to deleted (`HomePage.test.tsx` already targets
  `MultiplayerHomePage`).

**Out of scope:**

- The per-game pass-and-play apps stay in their existing folders for now.

**Verification:** `pnpm run verify`.

**Commit:** `refactor(home): drop orphan home page, rename Legacy hub → PassNPlay hub`.
Version bump: PATCH (refactor, no behaviour change).

---

## Step 5 — Move multiplayer views next to per-game features

**Scope:**

- `features/multiplayer/HatMultiplayerView.tsx` →
  `features/hat-game/multiplayer/HatMultiplayerView.tsx`
- `features/multiplayer/WhoWhatWhereMultiplayerView.tsx` →
  `features/whowhatwhere/multiplayer/WhoWhatWhereMultiplayerView.tsx`
- `features/multiplayer/ImposterMultiplayerView.tsx` →
  `features/imposter/multiplayer/ImposterMultiplayerView.tsx`
- Keep `features/multiplayer/{RoomPage,EnterNamePage,MultiplayerHomePage,MultiplayerGameShell,lobbyCaptain}.tsx`
  in `features/multiplayer/` — they are mode-shell concerns, not per-game.
- Update imports + barrel files where needed.
- Update `docs/PROJECT_INDEX.md` to reflect the new layout.

**Verification:** `pnpm run verify`. Smoke: room + game flows from
`docs/MULTIPLAYER_QA.md` (or note skipped).

**Commit:** `refactor(features): co-locate per-game multiplayer views`.
Version bump: PATCH.

---

## Step 6+ — Fallow-driven component reuse passes

Run `pnpm dlx fallow --no-cache --format human` after Step 5. Pick the
**highest-ROI** clone group and extract it in a single commit. Repeat.

Hard rules for each refactor commit:

- One clone group per commit. Don't bundle two refactors.
- Preserve UX exactly. Behavior-affecting changes go in their own commit
  with a version bump.
- After every commit, `pnpm run verify` must still pass.
- If a refactor needs new shared infrastructure (hooks, components), put
  the new files in `src/components/` or a shared subfolder under
  `src/features/<game>/` if game-specific.

Likely targets (audit snapshot, will be re-confirmed by Fallow):

- **Landing screens** (`HomePage` + `LegacyHubPage` had a 32-line clone) —
  extract a shared `<GameLauncherList items={...} onSelect={...} />` so the
  per-mode pages declare the games and pick the click handler.
- **Per-screen landing builders** (`hatLandingScreen.tsx` vs
  `imposterLandingScreen.tsx` — 43-line clone) — extract a shared
  `buildGameLandingScreen({ title, resume, footerActions })`.
- **`useHatGameApp` / `useImposterApp` overlap** — 32-line clone, likely a
  small shared hook (e.g. action-lock timing).

Stop after each Fallow pass to re-prioritize. **Do not** try to refactor
`RoomPage.tsx`, `ImposterMultiplayerView.tsx`, or `useHatGameApp.ts`
wholesale — those are deferred from the original audit and need their own
plan.

---

## What is explicitly NOT in this plan

- Adding new gameplay features (e.g. Imposter follow-ups in `ROADMAP.md`).
- Replacing `react-router-dom` or any framework swap.
- Touching the legacy `/games/*` routes (these will be relabelled as
  `passnplay` routes only after the user signs off on the URL change, in a
  follow-up).
- Persisting Pass-and-Play preference somewhere — defaults to landing on
  Multi-Device every visit, as the user described.

---

## Definition of done for the whole plan

- `/` shows Multi-Device join/host as the default with a single,
  prominent Pass-and-Play card visible without scrolling on a phone.
- `/passnplay` (and `/legacy` redirect) shows the Pass-and-Play hub with
  no "legacy" copy.
- `docs/PROJECT_INDEX.md` reflects the new folder map.
- Fallow clone-group count is lower than the v0.14.8 baseline (18) by at
  least 3 groups, and no new dead exports introduced.
- `pnpm run verify` passes.
