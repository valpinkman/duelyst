# Deploying to Coolify (duelyst.valpinkman.xyz)

Target: the Hetzner server behind Coolify (`65.108.241.38`, the same box as the
existing `*.valpinkman.xyz` services). `duelyst.valpinkman.xyz` already resolves
there.

## The shape of the thing

Duelyst is four runtime services plus two datastores, and the browser talks to
three of them directly:

| Service  | Image                      | Reachable as                        |
| -------- | -------------------------- | ----------------------------------- |
| web      | `docker/web.Dockerfile`    | `https://duelyst.valpinkman.xyz`    |
| game     | `docker/game.Dockerfile`   | `wss://game.duelyst.valpinkman.xyz` |
| sp       | `docker/sp.Dockerfile`     | `wss://sp.duelyst.valpinkman.xyz`   |
| worker   | `docker/worker.Dockerfile` | not public                          |
| postgres | Coolify database           | internal                            |
| redis    | Coolify database           | internal                            |

All three are ordinary HTTPS services on 443, which is the only thing the shared
Traefik listens on.

That took a client change. Upstream built the websocket URL as
`<page hostname>:8001` (or `:8000`), with `wss` outside development, which would
have required both ports to terminate TLS for the site domain — and Traefik
entrypoints are _static_ configuration, so adding listeners means editing the
proxy definition that every other service on the box shares.
`GAME_SERVER_URL` / `SP_SERVER_URL` name each server outright instead. Unset,
the client still builds the old URL, so local development is unchanged.

## One-time server setup

### 1. Nothing to do to the proxy

Earlier drafts of this document had you add two Traefik entrypoints and open two
ports in the Hetzner firewall. Neither is needed: game and sp are subdomains on
443 now. If the entrypoints were already added they are harmless, just unused.

### 2. Repository access

The repo is private and Coolify currently has only the "Public GitHub" source.
Either install a Coolify GitHub App (browser OAuth), or add a read-only deploy
key: generate a keypair, register the private half under **Keys & Tokens →
Private Keys**, and add the public half to the repo under **Settings → Deploy
keys** (read access is enough).

## What exists on the instance

Created 2026-08-21 in project **Duelyst** (`pfeykyoqfl4sa7akslyocsjz`), environment
`production`, server `localhost` (`ckswsw4wokcww80c4040cc8c` — the Hetzner box at
65.108.241.38, which is what `*.valpinkman.xyz` already resolves to).

| Resource         | UUID                       | Notes                                               |
| ---------------- | -------------------------- | --------------------------------------------------- |
| duelyst-web      | `ckmwcsoqlimmtpychbbsrmla` | `/docker/web.Dockerfile`, port 3000, domain set     |
| duelyst-game     | `70frtu9cvrs7y95rdyj6qj9p` | `/docker/game.Dockerfile`, port 8001, domain on 443 |
| duelyst-sp       | `lfjstkk2dhdyhuv0osay9soz` | `/docker/sp.Dockerfile`, port 8000, domain on 443   |
| duelyst-worker   | `5k43hxj2nqrfc8uiyxtkjqvk` | `/docker/worker.Dockerfile`, no public port         |
| duelyst-postgres | `lx6bsx4eqaf0b8fhgxrcpzyb` | postgres:13, internal host = its uuid               |
| duelyst-redis    | `y7pljbwsvujegc7xvf32qkvb` | redis:6, **password set** — hence `REDIS_PASSWORD`  |

Source: the `duelyst-project` GitHub App, `valpinkman/duelyst`, branch `main`.

Those four application uuids are what `COOLIFY_APP_UUIDS` should contain.

## Per-application configuration

Four applications, all from this repository, branch `main`, each with its
Dockerfile as the build pack. Auto-deploy **off** — deployment is driven by tags
(see below).

Build arguments, **web only** — the client bakes these in at build time via
Vite `define`, so they are build args, not runtime env. Getting them wrong
produces an image that builds cleanly and then fails in the browser with
`auth/invalid-api-key`:

```
API_URL=https://duelyst.valpinkman.xyz
FIREBASE_URL=https://<project>.firebaseio.com/
FIREBASE_API_KEY=<web api key>
```

Runtime environment:

| Variable                | web | game | sp  | worker |
| ----------------------- | :-: | :--: | :-: | :----: |
| `NODE_ENV=production`   |  ✓  |  ✓   |  ✓  |   ✓    |
| `POSTGRES_CONNECTION`   |  ✓  |      |     |   ✓    |
| `REDIS_HOST`            |  ✓  |  ✓   |  ✓  |   ✓    |
| `FIREBASE_URL`          |  ✓  |      |     |   ✓    |
| `FIREBASE_PROJECT_ID`   |  ✓  |      |     |   ✓    |
| `FIREBASE_CLIENT_EMAIL` |  ✓  |      |     |   ✓    |
| `FIREBASE_PRIVATE_KEY`  |  ✓  |      |     |   ✓    |
| `FIREBASE_LEGACY_TOKEN` |  ✓  |  ✓   |  ✓  |        |

`FIREBASE_PRIVATE_KEY` is a PEM with newlines — mark it multiline and
**runtime-only**, not a build arg.

Routing: all three get a domain and Coolify generates the labels. The wildcard
DNS covers arbitrary depth (`deep.nested.valpinkman.xyz` resolves), so the
two-level names work, and Let's Encrypt HTTP-01 is per-name, so no wildcard
certificate is involved.

`GAME_SERVER_URL` and `SP_SERVER_URL` are **build args on web** as well as
runtime values — they are compiled into the browser bundle, so changing where
the game servers live means rebuilding web, not just restarting it.

### Migrations

Handled by the image: `docker/web-entrypoint.sh` runs `pnpm migrate:latest` and
then execs the API, because Coolify's API has no pre-deployment command field.
knex takes a lock in `knex_migrations_lock`, so a simultaneous second container
waits rather than racing, and the command is a no-op when nothing is pending.
A container that cannot migrate deliberately fails to start.

## Deploying

`main` is the source of truth; deploys happen on tags:

```bash
git tag -a v0.1.0 -m "first deploy" && git push myrepo v0.1.0
```

`.github/workflows/deploy.yaml` calls Coolify's deploy endpoint for the uuids in
the `COOLIFY_APP_UUIDS` repository variable, using `COOLIFY_URL` and
`COOLIFY_TOKEN` secrets. Coolify then builds whatever `main` points at — so push
the tag last, once main already has the commit you want live.

It must be **POST**. Coolify 4.3.x answers `GET /api/v1/deploy` with 405 and
`{"message":"This endpoint has changed to a POST request."}`, while the API
reference still reads "Post request also accepted", which suggests GET works.

### The deploy token expires

|             |                                                                                                                                                    |
| ----------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name        | `duelyst deploy token`                                                                                                                             |
| Permissions | Deploy, Read — deliberately **not** "Read sensitive data", which would expose env values including the Firebase private key and database passwords |
| Created     | 2026-08-22                                                                                                                                         |
| **Expires** | **2027-08-22**                                                                                                                                     |

When it lapses the workflow fails with a 401 and nothing else changes, which is
a hard thing to diagnose a year later. Recreate it under **Keys & Tokens → API
tokens** with the same two permissions and `gh secret set COOLIFY_TOKEN
--repo valpinkman/duelyst`.

## Backing up the database

Postgres is internal-only (`is_public: false`), so there is no port to reach from
outside. Dump it through the container instead:

```bash
ssh root@65.108.241.38
docker exec lx6bsx4eqaf0b8fhgxrcpzyb pg_dump -U duelyst duelyst > duelyst-$(date +%F).sql
```

Firebase holds a second half of the state — decks, presence, quests, chat, live
game sessions — so a Postgres dump alone is not a complete backup. Whether that
matters depends on what you would want to restore.

The predecessor to this note lived in `docs/infrastructure/POSTGRES.md` and
described an SSH tunnel to RDS through an EC2 host, which went with the AWS
deployment.

## Things that will bite

- **The web image is ~1.7 GB** (474 MB of it the built client) and the build
  context is ~650 MB. `app/original_resources` (587 MB of source art) is
  excluded by `docker/web.Dockerfile.dockerignore`; do not remove that line.
- **The client is configured at build time.** Changing `API_URL` or the Firebase
  project means rebuilding the image, not restarting the container.
- **`/api/me/qa/*` grants gold, spirit and diamonds and sets rank.** It is
  mounted only when `config.isDevelopment()`, which is `!isProduction()` — and
  `isProduction()` covers **both** `production` and `staging`, so neither
  exposes it. Any other value for `NODE_ENV` does. Note that `qa.ts` is
  `require()`d unconditionally, so it used to log "QA routes ACTIVE" on a
  production boot without mounting anything; that banner now sits at the mount
  site instead.
- **Coolify double-escapes backslashes when it resolves an env var.** A value
  stored as `\n` reaches the container as `\\n`. `FIREBASE_PRIVATE_KEY` is the
  one place that matters, and `duelyst_firebase_module.ts` accepts both forms.
  Worth remembering for any future secret carrying escapes: compare `value` with
  `real_value` in the API response, which is how this was found.
- **A missing client is silent.** `server/lib/bundled_client.ts` decides at boot
  whether `dist/src/index.html` exists; if the image somehow lacks it, the API
  falls back to expecting a CDN and serves nothing useful.
