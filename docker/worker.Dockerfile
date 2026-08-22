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
RUN npm install -g pnpm@10.12.1
RUN pnpm install --frozen-lockfile && pnpm store prune

COPY version.json /duelyst/
COPY app/*.ts /duelyst/app/
COPY packages/common /duelyst/packages/common
COPY app/data /duelyst/app/data
COPY app/localization /duelyst/app/localization
COPY packages/sdk /duelyst/packages/sdk
COPY bin /duelyst/bin
COPY config /duelyst/config
COPY server /duelyst/server
COPY worker /duelyst/worker

COPY tsconfig.json /duelyst/
COPY scripts/build /duelyst/scripts/build

# Compile TypeScript once here instead of on every boot. The tsx require-hook
# cost a cold container ~3.7s and a 13 MB /tmp cache each time it started.
RUN pnpm build:server:root

ENTRYPOINT ["node", "build/bin/worker"]
