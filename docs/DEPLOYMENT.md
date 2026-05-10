# Deployment — JD Multiplayer Games

Production cuts bundle the **Vite client** into `dist/` and run the **Express + Socket.IO** server (`server/index.ts`) so browsers share rooms through WebSockets.

## Local production preview (full stack)

```bash
pnpm run build
pnpm run start
```

`pnpm run start` listens on port **3001** by default (`PORT` env var overrides this). Open http://127.0.0.1:3001/.

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

The container runs **Node + tsx** so the same process can serve static assets and Socket.IO. Set `CLIENT_ORIGIN` if you terminate TLS on another host and need an explicit browser origin allow-list.

## Railway / generic Node hosts

1. Set **start command** to `pnpm run start` (install dependencies with `pnpm install --frozen-lockfile` during build).
2. Expose the HTTP port Railway assigns; map it to `PORT` (already read by the server).
3. Optional: `CLIENT_ORIGIN=https://your-host` when you need strict CORS.

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
