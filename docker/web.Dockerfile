# The public-facing image: the API plus the built browser client.
#
# Upstream served the client from S3/CDN and only the API from this image. A
# self-hosted deployment has no CDN, so the client is built here and shipped
# alongside; server/routes/public.ts serves dist/src whenever it is present.
#
# The client bundle bakes its configuration in at BUILD time (Vite `define`),
# so API_URL / FIREBASE_URL / FIREBASE_API_KEY are build args, not runtime env.
# Getting them wrong produces an image that builds cleanly and then fails in the
# browser with auth/invalid-api-key.

# ---------- stage 1: build the client ----------
FROM node:24-bookworm-slim AS client

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make gcc g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /duelyst
RUN npm install -g pnpm@10.12.1

# manifests first, so a source-only change does not reinstall the world
COPY package.json .npmrc pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY tooling ./tooling
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/common/package.json ./packages/common/
COPY packages/data/package.json ./packages/data/
RUN pnpm install --frozen-lockfile

COPY . .

ARG API_URL
ARG FIREBASE_URL
ARG FIREBASE_API_KEY
# Optional: pin the websocket servers to absolute URLs (typically subdomains on
# 443). Left empty the client falls back to <page hostname>:8001 / :8000, which
# needs those ports terminating TLS. See docs/DEPLOY.md.
ARG GAME_SERVER_URL
ARG SP_SERVER_URL
ENV NODE_ENV=production \
    API_URL=${API_URL} \
    FIREBASE_URL=${FIREBASE_URL} \
    FIREBASE_API_KEY=${FIREBASE_API_KEY} \
    GAME_SERVER_URL=${GAME_SERVER_URL} \
    SP_SERVER_URL=${SP_SERVER_URL}

# fail here rather than in someone's browser
RUN test -n "${FIREBASE_URL}" || (echo "FIREBASE_URL build arg is required" && exit 1) \
  && test -n "${FIREBASE_API_KEY}" || (echo "FIREBASE_API_KEY build arg is required" && exit 1) \
  && test -n "${API_URL}" || (echo "API_URL build arg is required" && exit 1)

RUN pnpm build

# the server tree too, so the runtime stage needs no toolchain and no devDeps
RUN pnpm build:server:root

# ---------- stage 2: production dependencies only ----------
#
# A separate install rather than pruning the builder's node_modules: layers are
# additive, so removing files in a later RUN leaves them in the image, and
# `pnpm prune --prod` is interactive anyway and silently does nothing in a
# non-TTY build. Installing fresh is 329 MB against 753 MB.
FROM node:24-bookworm-slim AS deps

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make gcc g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /duelyst
RUN npm install -g pnpm@10.12.1

COPY package.json .npmrc pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/common/package.json ./packages/common/
COPY packages/data/package.json ./packages/data/
RUN pnpm install --prod --frozen-lockfile && pnpm store prune

# ---------- stage 3: the API runtime ----------
#
# No compiler, no devDependencies, no TypeScript sources. The last of those
# matters beyond size: bin/_bootstrap.js decides whether to register the tsx
# require-hook by looking for server/api.ts on disk, and server/knexfile.js does
# the same for migrations. A runtime tree with no .ts in it cannot get that
# wrong.
FROM node:24-bookworm-slim

WORKDIR /duelyst
RUN npm install -g pnpm@10.12.1

# manifests: pnpm needs them to run the migrate script, and node_modules holds
# workspace links that point at these package.json files
COPY package.json pnpm-workspace.yaml ./
COPY packages/sdk/package.json ./packages/sdk/
COPY packages/common/package.json ./packages/common/
COPY packages/data/package.json ./packages/data/

COPY --from=deps /duelyst/node_modules ./node_modules
COPY --from=client /duelyst/build ./build
COPY --from=client /duelyst/dist/src ./dist/src

COPY docker/web-entrypoint.sh /duelyst/docker/web-entrypoint.sh
RUN chmod +x /duelyst/docker/web-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/duelyst/docker/web-entrypoint.sh"]
