# Agent Instructions — RVLRY Android

## Active Android conversion

Joe approved a standalone offline Android project in this checkout. This
section supersedes the original web deployment/branch guidance below for
the Android conversion.

- Work on `android-prototype`; do not push to the original web app's `dev`
  or `main`, run Railway deployment, or merge into those branches.
- First delivery is Who What Where with native durability and phone testing.
  Hat/Imposter follow the Pixel 10 checkpoint in `docs/ANDROID_IMPLEMENTATION_PLAN.md`.
- React/Vite/Capacitor is the current runtime. Native SQLite snapshots store
  local game state; there is no runtime multiplayer server.
- Historical multiplayer source is removed; do not reintroduce it into Android routes.
- Keep dependencies/architecture in `docs/DECISIONS.md`, preserve tests,
  and bump app/native versions together for behaviour changes. Commit each bump
  with the code and changelog. Do not commit APKs, generated web assets or keys.
- GPT-6.1-Sol high subagents are authorized for bounded work. The coordinator
  owns shared contracts, integration, manifests/lockfiles and final review.
- Read `docs/ANDROID.md` for native builds/tests; browser-only checks do not
  establish Android durability.

## Working contract

Before changes read docs/PROJECT_INDEX.md, relevant canonical docs and package scripts. Prefer existing patterns. TypeScript strict, pnpm, React/Vite, Tailwind, Zod and Vitest remain established choices. Do not introduce auth, dependencies or framework changes without an explicit need and a docs/DECISIONS.md entry.

Work on android-prototype only. Do not deploy Railway or push/merge the original web app branches. The multiplayer server/client and Draw & Guess have been retired from this standalone branch; git retains their history.

Run pnpm run verify before behavior commits, and native checks from docs/ANDROID.md for integration milestones. Run Fallow for significant changes and consider its findings. Never weaken tests to make them pass. Bump package/native versions together and commit each bump with code and docs/CHANGELOG.md. Do not commit secrets, APKs or generated assets.

Local shell is Windows PowerShell. Use PowerShell syntax and resolved workspace-contained paths for recursive removal. Keep durable contracts in canonical docs; roadmap ideas are not implementation authorization. Retire completed one-shot plans, preserve shipped history in changelog/git. Report failures and unverified phone behavior honestly.
