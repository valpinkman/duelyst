#!/usr/bin/env bash
#
# Bring up isolated infrastructure for the data_access integration suites and
# export the environment they need.
#
#   source tools/dev/data-access-test-env.sh
#   pnpm test:integration:data_access
#
# Everything here is throwaway and separate from `docker compose`, so running
# the suites never touches the database you develop or play against. That
# matters: these suites create users, wipe inventories and write to the RTDB.
#
# The Firebase side runs against the local emulator. firebase-admin routes to it
# whenever FIREBASE_DATABASE_EMULATOR_HOST is set, so no real project is
# involved and no real credentials are needed -- but cert() still validates the
# SHAPE of a service-account key, hence the throwaway RSA key generated below.
set -u

PG_PORT="${DA_PG_PORT:-5499}"
DA_REDIS_PORT="${DA_REDIS_PORT:-6399}"
EMULATOR_PORT="${DA_EMULATOR_PORT:-9000}"

docker rm -f duelyst-da-pg duelyst-da-redis >/dev/null 2>&1 || true
docker run -d --rm -p "${PG_PORT}:5432" \
  -e POSTGRES_USER=duelyst -e POSTGRES_PASSWORD=duelyst -e POSTGRES_DB=duelyst \
  --name duelyst-da-pg postgres:13 >/dev/null
docker run -d --rm -p "${DA_REDIS_PORT}:6379" --name duelyst-da-redis redis:6 >/dev/null

export NODE_ENV=development
export POSTGRES_CONNECTION="pg://duelyst:duelyst@127.0.0.1:${PG_PORT}/duelyst"
export REDIS_HOST=127.0.0.1
export REDIS_PORT="${DA_REDIS_PORT}"
export FIREBASE_DATABASE_EMULATOR_HOST="127.0.0.1:${EMULATOR_PORT}"
export FIREBASE_URL="https://duelyst-ci-default-rtdb.firebaseio.com/"
export FIREBASE_PROJECT_ID=duelyst-ci
export FIREBASE_CLIENT_EMAIL="emulator@duelyst-ci.iam.gserviceaccount.com"
export FIREBASE_LEGACY_SECRET=emulator

KEY_FILE="$(mktemp -t duelyst-emulator-key)"
node -e "
const { generateKeyPairSync } = require('crypto');
const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' } });
require('fs').writeFileSync('${KEY_FILE}', privateKey);
"
FIREBASE_PRIVATE_KEY="$(awk '{printf "%s\\n", $0}' "${KEY_FILE}")"
export FIREBASE_PRIVATE_KEY
rm -f "${KEY_FILE}"

echo "waiting for postgres..."
for _ in $(seq 1 30); do
  docker exec duelyst-da-pg pg_isready -U duelyst >/dev/null 2>&1 && break
  sleep 1
done

pnpm migrate:latest >/dev/null 2>&1 && echo "migrations applied"

cat <<'MSG'

Infrastructure up. Start the Firebase emulator in another shell:

    pnpm exec firebase emulators:start --only database --project duelyst-ci

then run:

    pnpm test:integration:data_access

Tear down with:

    docker rm -f duelyst-da-pg duelyst-da-redis
MSG
