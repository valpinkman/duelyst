FROM node:24-bookworm-slim

WORKDIR /duelyst
COPY package.json /duelyst/
COPY .npmrc /duelyst/
COPY pnpm-lock.yaml /duelyst/
COPY pnpm-workspace.yaml /duelyst/
COPY packages /duelyst/packages
# workspace members live in-place under app/ - their manifests must exist at install time
COPY packages/sdk/package.json /duelyst/packages/sdk/
COPY packages/common/package.json /duelyst/packages/common/
COPY packages/data/package.json /duelyst/packages/data/
RUN npm install -g pnpm@10.12.1
RUN pnpm install --frozen-lockfile && pnpm store prune

COPY version.json /duelyst/
COPY app/*.ts /duelyst/app/
COPY packages/common /duelyst/packages/common
COPY packages/data /duelyst/packages/data
COPY app/localization /duelyst/app/localization
COPY packages/sdk /duelyst/packages/sdk
COPY bin /duelyst/bin
COPY config /duelyst/config
COPY server /duelyst/server
COPY worker /duelyst/worker
COPY test /duelyst/test
# vitest needs its configs (and tsconfig for tsx's path resolution)
COPY vitest.config.mjs /duelyst/
COPY vitest.integration.config.mjs /duelyst/
COPY tsconfig.json /duelyst/

COPY scripts/build /duelyst/scripts/build

# worker-ui runs the built tree (see docker-compose.yaml); the test containers
# in this same image still run from source, which is why both are present.
RUN pnpm build:server:root
