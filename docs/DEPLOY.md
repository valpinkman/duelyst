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
| game     | `docker/game.Dockerfile`   | `wss://duelyst.valpinkman.xyz:8001` |
| sp       | `docker/sp.Dockerfile`     | `wss://duelyst.valpinkman.xyz:8000` |
| worker   | `docker/worker.Dockerfile` | not public                          |
| postgres | Coolify database           | internal                            |
| redis    | Coolify database           | internal                            |

**The ports are not a choice.** `app/networkManager.ts` builds its websocket URL
as `${protocol}://${host}:${port}` with the port hardcoded to 8001 for
multiplayer and 8000 for single-player, and `protocol` is `wss` in anything but
development. Changing that is a client change; see docs/REORG_AUDIT.md-style
reasoning in the deploy discussion. Until then, those two ports must terminate
TLS for this domain.

## One-time server setup

### 1. Traefik entrypoints for 8000/8001

Coolify's proxy only defines `http:80` and `https:443`. Entrypoints are Traefik
_static_ configuration, so this is an edit to the proxy definition
(**Server → Proxy → Configuration**), not something a dynamic file can add.

Add to `ports:`

```yaml
- '8000:8000'
- '8001:8001'
```

and to `command:`

```yaml
- '--entrypoints.sp.address=:8000'
- '--entrypoints.game.address=:8001'
```

Then redeploy the proxy. The existing `letsencrypt` resolver is reused — a
certificate is per-domain, not per-port, so no new certificate is involved.

**Also open 8000/8001 in the Hetzner firewall**, or Traefik will never see the
connections.

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
| duelyst-game     | `70frtu9cvrs7y95rdyj6qj9p` | `/docker/game.Dockerfile`, port 8001, custom labels |
| duelyst-sp       | `lfjstkk2dhdyhuv0osay9soz` | `/docker/sp.Dockerfile`, port 8000, custom labels   |
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

Routing: web gets the domain normally. game and sp need a label each so Traefik
serves them on the new entrypoints, e.g. for game:

```
traefik.http.routers.duelyst-game.rule=Host(`duelyst.valpinkman.xyz`)
traefik.http.routers.duelyst-game.entrypoints=game
traefik.http.routers.duelyst-game.tls.certresolver=letsencrypt
traefik.http.services.duelyst-game.loadbalancer.server.port=8001
```

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
