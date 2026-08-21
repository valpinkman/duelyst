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
COPY app/sdk/package.json ./app/sdk/
COPY app/common/package.json ./app/common/
RUN pnpm install --frozen-lockfile

COPY . .

ARG API_URL
ARG FIREBASE_URL
ARG FIREBASE_API_KEY
ENV NODE_ENV=production \
    API_URL=${API_URL} \
    FIREBASE_URL=${FIREBASE_URL} \
    FIREBASE_API_KEY=${FIREBASE_API_KEY}

# fail here rather than in someone's browser
RUN test -n "${FIREBASE_URL}" || (echo "FIREBASE_URL build arg is required" && exit 1) \
  && test -n "${FIREBASE_API_KEY}" || (echo "FIREBASE_API_KEY build arg is required" && exit 1) \
  && test -n "${API_URL}" || (echo "API_URL build arg is required" && exit 1)

RUN pnpm build

# ---------- stage 2: the API runtime ----------
FROM node:24-bookworm-slim

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make gcc g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /duelyst
RUN npm install -g pnpm@10.12.1

COPY package.json .npmrc pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY app/sdk/package.json ./app/sdk/
COPY app/common/package.json ./app/common/
RUN pnpm install --frozen-lockfile && pnpm store prune

COPY version.json ./
COPY app/*.ts ./app/
COPY app/common ./app/common
COPY app/data ./app/data
COPY app/localization ./app/localization
COPY app/sdk ./app/sdk
COPY bin ./bin
COPY config ./config
COPY server ./server
COPY worker ./worker
COPY tsconfig.json ./
COPY scripts/build ./scripts/build

# transpile once here, not on every boot (the tsx hook cost ~3.7s per start)
RUN pnpm build:server:root

# the built client, from stage 1
COPY --from=client /duelyst/dist/src ./dist/src

EXPOSE 3000
ENTRYPOINT ["node", "build/bin/api"]
