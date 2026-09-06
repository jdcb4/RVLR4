# Deployment — RVLRY

Production cuts bundle the **Vite client** into `dist/` and run the
**Express + Socket.IO** server (`server/index.ts`) so browsers share rooms
through WebSockets.

The primary deployment path is **GitHub repository -> Railway using Railpack**.
The repository retains an optional Docker image path for portability and
self-hosting, but routine work does not build or publish Docker images.

## Local production preview (full stack)

```bash
pnpm run build
pnpm run preview
```

Open [the full-stack preview](http://127.0.0.1:3001/). The preview script sets
production mode and allows both `127.0.0.1` and `localhost` at its port. It
deliberately replaces an inherited `CLIENT_ORIGIN` with these local origins.
`PORT` defaults to **3001** and may be overridden in the same shell. A missing
build produces a clear instruction to build first.

Optional diagnostics in the same shell:

```powershell
$env:MULTIPLAYER_DEBUG='1'
pnpm run preview
```

`pnpm run start` is the hosting command; the host must supply its production
origin. For a static-only diagnostic, `pnpm exec vite preview` serves the
client bundle without multiplayer APIs. HTTPS-only origins keep CSP asset
upgrading enabled; HTTP local preview does not force unavailable HTTPS assets.

## Branch promotion and Railway mapping

| Git branch | Purpose                                                         | Railway environment |
| ---------- | --------------------------------------------------------------- | ------------------- |
| `dev`      | GitHub default and integration branch; current review candidate | `dev`               |
| `main`     | Reviewed production branch                                      | `production`        |

Routine work starts from `dev` (or a short-lived branch based on `dev`) and
integrates back into `dev`. The `dev` deployment is the validation target.
After Joe reviews and explicitly approves the exact candidate, promote with a
`dev` -> `main` pull request or an explicitly requested equivalent merge. A
successful update to `main` becomes the production deployment.

Do not point Railway production at `dev`, and do not merge or push a promotion
to `main` before approval. If a production-only hotfix is unavoidable, merge it
back into `dev` immediately. Railway's service-source branch mappings are live
platform configuration rather than repository files, so verify both mappings
after changing Railway settings.

## Primary path: GitHub to Railway

Railway services should use the GitHub repository as their source with
autodeploy enabled for the mapped branch. Routine deployment happens when an
approved commit reaches `dev` or `main`; do not upload a locally built image or
use a manual CLI deploy as the normal release path.

[`railway.json`](../railway.json) is the repository-owned deployment contract:

- builder: **Railpack**; the optional recipe lives at `docker/Dockerfile` so
  Railway cannot auto-detect it as the deployment builder;
- build command: `pnpm run build`;
- start command: `pnpm run start`.

Railpack installs dependencies from `pnpm-lock.yaml` and respects the Node and
pnpm versions declared by the repository. Configuration in `railway.json`
overrides equivalent dashboard settings for each deployment. Keep both Railway
services pointed at this config file and check the deployment detail panel when
confirming which settings were applied.

For a new or repaired Railway service:

1. Select this GitHub repository as the service source.
2. Map the service to the correct branch and environment using the table above.
3. Leave the build path on Railpack; do not set a custom Dockerfile path.
4. Expose Railway's assigned HTTP port through `PORT` (the server already reads
   it and binds to `0.0.0.0`).
5. Generate or retain the public domain, then set `CLIENT_ORIGIN` to that HTTPS
   origin before deploying. Production startup fails closed when this value is
   missing, empty, or not a valid HTTP(S) origin.
6. After deployment, check build logs, start logs, the public route, and a basic
   two-browser room join. Remember that rooms reset whenever the service sleeps
   or restarts because multiplayer state is in memory.

Railway references:

- [GitHub autodeploys](https://docs.railway.com/guides/github-autodeploys)
- [Config as code](https://docs.railway.com/config-as-code)
- [Railpack](https://docs.railway.com/builds/railpack)

## Production environment variables

For the current **dev** environment, `CLIENT_ORIGIN` includes
`https://rvlry-dev.jboxgames.com,https://rvlry-dev.up.railway.app`. Keep this
aligned with the service's public domains. A missing custom domain can leave
health checks green while browser asset requests and room entry fail with 403;
always test with that domain's `Origin` header and with a real browser.

- **`CLIENT_ORIGIN`** — comma-separated allow-list of browser origins
  (for example, `https://app.example.com,https://www.example.com`). This is
  required in production. Values must be exact HTTP(S) origins without paths,
  queries, or credentials. Requests without an `Origin` header remain valid
  for navigation, health checks, and non-browser clients.
- **`PORT`** — defaults to `3001`; Railway supplies this for the service.
- **`MULTIPLAYER_DEBUG`** — set to `1` or `true` only while diagnosing room
  lifecycle issues. Logs use allow-listed metadata and exclude room codes,
  player identities, secrets, and game content.

## Generic Node hosts

Other Node platforms can use the same commands:

1. Install with `pnpm install --frozen-lockfile`.
2. Build with `pnpm run build`.
3. Start with `pnpm run start` and supply `PORT`.
4. Set `CLIENT_ORIGIN` to the public browser origin.

Because state is **in-memory**, expect rooms to reset whenever the process
restarts.

## Health and activation

`GET /api/health` returns `{status:"ok",version}` with `200` while the process
is ready and `{status:"shutting-down",version}` with `503` after graceful
shutdown begins. Responses are `no-store` and expose no room or player state.
`railway.json` points both environments at this endpoint with a 30-second
activation timeout.
This is an activation check, not continuous uptime monitoring after deployment.

## Capacity, cost, and room lifetime

Run **one service replica in one region**. All room data and rate limits live
in one Node process; multiple replicas can disagree about room membership and
timers. Sticky routing alone does not provide shared state or safe failover.
There is no database, persistent room volume, or recoverable room backup.

Service sleep, crashes, deployments, rollbacks, and process replacement discard
rooms. Sleep saves idle running costs but adds a cold start; the home/entry UI
can retry a bounded request after startup. Do not restart during a game users
expect to finish. The app has a room cap, per-event budgets, idle cleanup, and
drawing-size limits; use Railway CPU/memory/egress observations before changing
those limits or adding capacity. See the drawing byte budgets in [DRAWNGUESS.md](DRAWNGUESS.md).

## Rollback and recovery

1. Record the failed environment, deployed commit, package version, and the
   prior successful deployment ID/commit. Capture sanitized logs and health
   responses; do not copy reconnect credentials or private game content.
2. Check whether the failure is configuration, startup, or application behavior.
   Confirm `CLIENT_ORIGIN`, source branch, Railpack, one replica, and `/api/health`
   in the deployment's applied settings. A green build alone is insufficient.
3. After approval for a production action, use Railway's **Rollback** on the
   known-good deployment for that environment. Railway restores its image and
   custom variables; recheck source mapping and other applied service settings. If that
   deployment is unavailable, revert the bad commit through the normal branch
   review flow and let GitHub source deployment build the revert.
4. Check `/api/health` for 200 and the expected version, open the home page,
   and reload open browsers so their client assets match the restored server.
   Then create and join a new room from two separate browsers. Start one game,
   reconnect a guest, and verify the next action succeeds.
5. Confirm old rooms show recovery navigation. Rollback does **not** restore
   their in-memory data. Share a fresh room code with the players.
6. Keep `dev` aligned with any reviewed production rollback/fix before the next
   promotion. Record the actual recovery outcome in the change's review record.

For a local rehearsal, stop only the task's preview process, run a known-good
commit from an isolated checkout with production mode and matching loopback
origins, verify its health/version and new-room entry, then restore the candidate
preview. Never infer production rollback success from this local rehearsal.

## Proposed repository protections

The branch workflow remains the contract until platform rules are configured.
For a sole maintainer, the proposed minimal rule for `main` is: require a pull
request, require the **verify** CI job, require the branch to be up to date,
and block force pushes and deletion. Keep required external approvals at zero
so Joe can review and merge his own candidate. Joe's explicit approval of the
exact promotion remains required for agents. Do not enable auto-merge.

For `dev`, retain direct integration pushes but block force pushes/deletion.
Keep a documented administrator emergency bypass for recovery, followed by a
recorded review. Enabling these platform rules is a separate maintainer choice;
the proposal does not claim they are already enforced.

References: [Railway rollback](https://docs.railway.com/guides/deployment-actions),
[health checks](https://docs.railway.com/guides/healthchecks), and
[GitHub protected branches](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-protected-branches/about-protected-branches).

## Optional manual Docker image

Docker is retained as an explicit portability/self-hosting option. Do not run
this command for routine Railway work, ordinary release verification, or image
publishing. Run it only when a Docker-specific change or self-hosting task is
active:

```bash
pnpm run docker:build
```

The command explicitly uses `docker/Dockerfile`. Keep optional Docker recipes
outside the repository root because Railway always auto-detects a root file
named `Dockerfile` before invoking Railpack.

The cross-platform script tags the local image as:

```text
jdcb4/jd-multiplayer-games:<package version>
jdcb4/jd-multiplayer-games:latest
```

Run the locally built image with:

```bash
docker run --rm -p 3001:3001 jdcb4/jd-multiplayer-games:latest
```

The container runs Node + `tsx`, serving the client assets and Socket.IO from
the same process. Supply `CLIENT_ORIGIN` and any optional diagnostics as
container environment variables when required.

## Verification before deploy

```bash
pnpm run verify
```

For multiplayer/socket-heavy changes, also complete the two-browser matrix in
[`docs/MULTIPLAYER_QA.md`](MULTIPLAYER_QA.md). Only run
`pnpm run docker:build` when Docker itself is explicitly in scope.
