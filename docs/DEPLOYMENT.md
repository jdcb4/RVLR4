# Deployment — RVLRY

Production cuts bundle the **Vite client** into `dist/` and run the **Express + Socket.IO** server (`server/index.ts`) so browsers share rooms through WebSockets.

## Local production preview (full stack)

```bash
pnpm run build
pnpm run start
```

`pnpm run start` listens on port **3001** by default (`PORT` env var overrides this). Open http://127.0.0.1:3001/.

Optional diagnostics on the same shell: `MULTIPLAYER_DEBUG=1 pnpm run start` (Windows PowerShell: `$env:MULTIPLAYER_DEBUG='1'; pnpm run start`).

**Note:** `pnpm run preview` only exercises the static bundle without multiplayer APIs.

## Docker

Build the image with the project script (it tags both versioned and `latest`):

```bash
pnpm run docker:build
```

Tags produced:

```text
jdcb4/jd-multiplayer-games:<package version>
jdcb4/jd-multiplayer-games:latest
```

Run locally:

```bash
docker run --rm -p 3001:3001 jdcb4/jd-multiplayer-games:latest
```

Open http://127.0.0.1:3001/.

The container runs **Node + tsx** so the same process can serve static assets and Socket.IO. **`CLIENT_ORIGIN` is recommended in production** for a strict CORS allow-list — see [Production env vars](#production-env-vars) below. The server boots without it (falling back to allow-any CORS with a loud warning at startup) so platforms like Railway that don't expose the public origin to the container can deploy out of the box.

Optional: set **`MULTIPLAYER_DEBUG=1`** in the container environment to print `[multiplayer]` diagnostics (room created/joined, session bind, match started). Use only while troubleshooting — logs may include player IDs and room codes (never secrets).

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

## Railway / generic Node hosts

1. Set **start command** to `pnpm run start` (install dependencies with `pnpm install --frozen-lockfile` during build).
2. Expose the HTTP port Railway assigns; map it to `PORT` (already read by the server).
3. **Recommended:** `CLIENT_ORIGIN=https://your-host.up.railway.app` — comma-separate multiple origins. Without it the server still boots (allow-any CORS) and prints a warning; setting it locks the allow-list down.
4. Optional: `MULTIPLAYER_DEBUG=1` for `[multiplayer]` server logs while diagnosing issues (room codes and player IDs may appear; never secrets).

Because state is **in-memory**, expect rooms to reset when the dyno restarts.

## Production env vars

- **`CLIENT_ORIGIN`** — comma-separated allow-list of browser origins
  (e.g. `https://app.example.com,https://www.example.com`). **Recommended**
  but not required. When unset in production, the server prints
  `[server] CLIENT_ORIGIN is not set — accepting all browser origins...`
  at boot and runs with allow-any CORS so platforms like Railway can deploy
  without knowing their public origin ahead of time. Set this explicitly to
  tighten CORS.
- **`PORT`** — defaults to `3001`.
- **`MULTIPLAYER_DEBUG`** — set to `1` or `true` to enable `[multiplayer]`
  lifecycle logging.

## Verification before deploy

```bash
pnpm run verify
```

For Docker-specific changes also run:

```bash
pnpm run docker:build
```
