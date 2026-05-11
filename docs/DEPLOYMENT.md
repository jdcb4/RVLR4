# Deployment — JD Multiplayer Games

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

The container runs **Node + tsx** so the same process can serve static assets and Socket.IO. **`CLIENT_ORIGIN` is required in production** — see [Required production env vars](#required-production-env-vars) below.

Optional: set **`MULTIPLAYER_DEBUG=1`** in the container environment to print `[multiplayer]` diagnostics (room created/joined, session bind, match started). Use only while troubleshooting — logs may include player IDs and room codes (never secrets).

## Railway / generic Node hosts

1. Set **start command** to `pnpm run start` (install dependencies with `pnpm install --frozen-lockfile` during build).
2. Expose the HTTP port Railway assigns; map it to `PORT` (already read by the server).
3. **Required:** `CLIENT_ORIGIN=https://your-host` — the server refuses to start in production without it. Comma-separate multiple origins.
4. Optional: `MULTIPLAYER_DEBUG=1` for `[multiplayer]` server logs while diagnosing issues (room codes and player IDs may appear; never secrets).

Because state is **in-memory**, expect rooms to reset when the dyno restarts.

## GitHub Pages

The workflow is `.github/workflows/pages.yml`.

Repository setup (one-time):

1. Push the project to GitHub.
2. Open `Settings → Pages`.
3. Set `Build and deployment` source to `GitHub Actions`.
4. Push to `main` (or run the workflow manually).

The Pages base path is set in `vite.config.ts` and must match the **repository name** in the site URL (case-sensitive), e.g. `/JDPassNPlay/` for `github.com/jdcb4/JDPassNPlay`. If you rename the repo, update `base` and run `pnpm run build:pages` to verify.

Direct visits to client routes (e.g. `/JDPassNPlay/games/hat`) need GitHub to serve `index.html`; the workflow copies `dist/index.html` to `dist/404.html` after build for that fallback.

## Required production env vars

- **`CLIENT_ORIGIN`** — comma-separated allow-list of browser origins
  (e.g. `https://app.example.com,https://www.example.com`). The server refuses
  to start (`loadServerEnv` throws a `ZodError`) when `NODE_ENV=production` and
  this variable is missing or empty. There is no implicit "allow any origin"
  fallback — set it explicitly even for single-host deployments.

Optional:

- **`PORT`** — defaults to `3001`.
- **`MULTIPLAYER_DEBUG`** — set to `1` or `true` to enable `[multiplayer]`
  lifecycle logging.

## Verification before deploy

```bash
pnpm run verify
```

For Pages-specific changes also run:

```bash
pnpm run build:pages
```

For Docker-specific changes also run:

```bash
pnpm run docker:build
```
