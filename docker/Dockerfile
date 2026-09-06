# syntax=docker/dockerfile:1.7

FROM node:22-alpine AS runtime
WORKDIR /app

ENV PORT=3001

RUN corepack enable

COPY package.json pnpm-lock.yaml ./
# Install must run without NODE_ENV=production so devDependencies (TypeScript, Vite) exist for `pnpm run build`.
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

ENV NODE_ENV=production

EXPOSE 3001

# tsx must load server/tsconfig.json so `@/*` → `src/*` resolves (same as dev:server).
CMD ["pnpm", "exec", "tsx", "--tsconfig", "server/tsconfig.json", "server/index.ts"]
