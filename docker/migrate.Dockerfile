FROM node:24-bookworm-slim

WORKDIR /duelyst
COPY package.json /duelyst/
COPY .npmrc /duelyst/
COPY pnpm-lock.yaml /duelyst/
COPY pnpm-workspace.yaml /duelyst/
COPY packages /duelyst/packages
# workspace members live under packages/ - their manifests must exist at install time
COPY packages/sdk/package.json /duelyst/packages/sdk/
COPY packages/common/package.json /duelyst/packages/common/
COPY packages/data/package.json /duelyst/packages/data/
COPY apps/client/package.json /duelyst/apps/client/
COPY apps/server/package.json /duelyst/apps/server/
COPY apps/worker/package.json /duelyst/apps/worker/
RUN npm install -g pnpm@10.12.1
RUN pnpm install --frozen-lockfile && pnpm store prune

COPY version.json /duelyst/
COPY apps/client/*.ts /duelyst/apps/client/
COPY packages/common /duelyst/packages/common
COPY packages/data /duelyst/packages/data
COPY apps/client/localization /duelyst/apps/client/localization
COPY packages/sdk /duelyst/packages/sdk
COPY bin /duelyst/bin
COPY config /duelyst/config
COPY apps/server /duelyst/apps/server
COPY apps/worker /duelyst/apps/worker

ENTRYPOINT ["pnpm", "migrate:latest"]
