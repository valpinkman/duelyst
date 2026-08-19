FROM node:24-bookworm-slim

WORKDIR /duelyst
COPY package.json /duelyst/
COPY .npmrc /duelyst/
COPY pnpm-lock.yaml /duelyst/
COPY pnpm-workspace.yaml /duelyst/
COPY packages /duelyst/packages
RUN npm install -g pnpm@10.12.1
RUN pnpm install --frozen-lockfile && pnpm store prune

COPY version.json /duelyst/
COPY app/*.coffee /duelyst/app/
COPY app/common /duelyst/app/common
COPY app/data /duelyst/app/data
COPY app/localization /duelyst/app/localization
COPY app/sdk /duelyst/app/sdk
COPY bin /duelyst/bin
COPY config /duelyst/config
COPY server /duelyst/server
COPY worker /duelyst/worker

EXPOSE 8000
ENTRYPOINT ["pnpm", "sp"]
