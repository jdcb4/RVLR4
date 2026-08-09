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
pnpm run start
```

`pnpm run start` listens on port **3001** by default (`PORT` overrides this).
Open http://127.0.0.1:3001/.

Optional diagnostics in the same shell:

```powershell
$env:MULTIPLAYER_DEBUG='1'; pnpm run start
```

`pnpm run preview` only exercises the static bundle without multiplayer APIs.

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

- builder: **Railpack**, explicitly selected so Railway does not auto-detect the
  retained root `Dockerfile`;
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
3. Leave the build path on Railpack; do not select the Dockerfile builder.
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

- **`CLIENT_ORIGIN`** — comma-separated allow-list of browser origins
  (for example, `https://app.example.com,https://www.example.com`). This is
  required in production. Values must be exact HTTP(S) origins without paths,
  queries, or credentials. Requests without an `Origin` header remain valid
  for navigation, health checks, and non-browser clients.
- **`PORT`** — defaults to `3001`; Railway supplies this for the service.
- **`MULTIPLAYER_DEBUG`** — set to `1` or `true` only while diagnosing room
  lifecycle issues. Logs may contain room codes and player IDs, never secrets.

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

## Optional manual Docker image

Docker is retained as an explicit portability/self-hosting option. Do not run
this command for routine Railway work, ordinary release verification, or image
publishing. Run it only when a Docker-specific change or self-hosting task is
active:

```bash
pnpm run docker:build
```

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
