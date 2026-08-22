#!/bin/sh
# Run pending migrations, then start the API.
#
# Self-hosted deployments have nowhere else to put this: Coolify's API has no
# pre-deployment command field, and the schema has to exist before the API
# serves a single request. knex takes a lock in knex_migrations_lock, so a
# second container starting at the same time waits rather than racing, and
# `migrate:latest` is a no-op when there is nothing pending.
#
# Failing here is deliberate. A container that cannot migrate must not come up
# and start answering requests against a schema it does not understand.
set -e

# The BUILT tree, not the source one. apps/server/knexfile.js registers the tsx hook
# when it sees api.ts next to it, and build/apps/server has no .ts at all -- so this
# is what lets the runtime image install --prod and leave tsx behind.
echo "[entrypoint] running database migrations"
pnpm migrate:latest:built

echo "[entrypoint] starting api"
exec node build/bin/api
