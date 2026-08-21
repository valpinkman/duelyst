# OpenDuelyst — guide for coding agents

Duelyst is a 2016 collectible-card / tactics game (Counterplay Games), open-sourced after
shutdown. This repo holds the browser client (Backbone/Marionette + Cocos2d-html5), the game
engine shared by client and server (`app/sdk`), the backend services (Express API, socket.io
game servers, BullMQ worker) and the tooling around them.

It is **entirely TypeScript** now — CoffeeScript, gulp and browserify are gone — but it carries
a decade of accumulated behaviour, and a modernization program is still running. Read
"Modernization program" below before making structural changes.

## Package manager: pnpm only

- Use **pnpm** for everything. Never run `yarn` or `npm install`; never commit a
  `yarn.lock` / `package-lock.json`. The pinned version is in `package.json#packageManager`
  (corepack/proto/volta pick it up).
- Workspace: `pnpm-workspace.yaml` covers `packages/*` (vendored forks), the in-place members
  `app/sdk` + `app/common`, and `desktop/` (Electron shell; `electron` is allowlisted in
  `pnpm.onlyBuiltDependencies`).
- Local packages are `workspace:*` deps; `resolutions` live under `pnpm.overrides`;
  packages that need build scripts go in `pnpm.onlyBuiltDependencies` (currently `bcrypt`).
- If a dependency is required in code but missing from `package.json` (yarn used to hoist
  it), add it explicitly — do **not** enable `shamefully-hoist` / `node-linker=hoisted`.

## Everyday commands

```bash
pnpm install                                   # after clone or lockfile change
FIREBASE_URL=https://test-url.firebaseio.com/ pnpm build   # client build -> dist/src (dummy URL fine unless you want to play)
                                               # turbo builds packages/chroma-js first; no manual prebuild any more
pnpm build:vite                                # JS bundle only (~2.4s); build:client:watch for the dev loop
pnpm build:server                              # ahead-of-time TS -> build/ for the services (~0.5s);
                                               #   images run `node build/bin/<svc>`, dev still runs from source
pnpm test:unit                                 # vitest, 1366 tests, no external services
pnpm test:integration:misc                     # needs nothing external; runs in CI
pnpm test:integration:jobs                     # BullMQ job seam; needs ONLY redis, so it runs in CI too
pnpm test:integration:data_access              # 562 tests; 0 known failures, 3 unstable. Gated on drift in CI.
source scripts/dev/data-access-test-env.sh     #   throwaway postgres+redis+firebase emulator with this --
                                               #   deliberately separate from `docker compose`, because
                                               #   these suites create users and wipe inventories
pnpm typecheck                                 # tsc (loose config) - 0 errors, and a CI gate since 2026-08-21
pnpm check:undefined-names                     # TS2304 only, and this IS a CI gate. Run after any codemod.
pnpm check:promise-utils                       # PromiseUtils/onType used without being bound
pnpm check:bluebird-orphans                    # bluebird-only API used without requiring bluebird
pnpm check:turbo-env                           # turbo.json globalEnv still covers every convict env binding
pnpm check:data-access                         # data_access failures vs test/integration/data_access/known-failures.txt
                                               #   (--update to re-record; the list may shrink, not grow)
pnpm test:e2e                                  # Playwright: boots the client and plays a practice game
set -a; . ./.env; set +a                       # a PLAYABLE build needs the whole env, not just FIREBASE_URL:
                                               #   nothing in the build path reads .env, and a missing
                                               #   FIREBASE_API_KEY builds fine and then fails at runtime with
                                               #   `auth/invalid-api-key`. Then: pnpm build, docker compose up.
pnpm lint                                      # oxlint (shared config in tooling/oxlint-config)
pnpm lint:fix                                  # oxlint --fix
pnpm format                                    # oxfmt -- owns JS/TS/JSON/MD/YAML style
pnpm format:check                              # CI gate; run `pnpm format` if it drifts
pnpm api | pnpm game | pnpm sp | pnpm worker   # start services (need Redis/Postgres/Firebase env, see docs/QUICKSTART.md)
docker compose up                              # full local stack (rebuild images after source changes: they are NOT live-mounted)
```

Playing the game locally requires a Firebase Realtime Database (`FIREBASE_URL`, legacy
token, service account) — see `docs/QUICKSTART.md`. Building and unit-testing do not.

## Monorepo, build and tooling

Reasoning in [`docs/TOOLING.md`](docs/TOOLING.md). The rules:

- **Type the aggregates.** `pnpm build|lint|format|format:check|typecheck|test:unit` expand to
  `turbo run …`. The root package's own work carries a `:root` suffix (`lint:root`, `test:root`,
  `build:client`), because a script cannot be named the same as the task it invokes. Containers
  call those directly — `turbo.json` is not shipped into runtime images.
- **Touching `config/config.js`? Run `pnpm check:turbo-env`.** Turbo runs tasks in strict env
  mode: an undeclared variable is stripped, and since every setting is resolved into the client
  bundle at build time, it silently bakes the schema default in instead of failing.
- **One lint owner per file.** The root `.oxlintrc.json` ignores directories that are workspace
  packages in their own right; each package lints itself against
  `tooling/oxlint-config/base.jsonc`. Formatting is the opposite — one root `.oxfmtrc.json`
  owns everything, because a rewrite is idempotent and a diagnostic is not.
- **Services run `build/`, never source.** `pnpm build:server` (esbuild, transpile-only) mirrors
  the source tree so root-absolute requires still resolve. `bin/_bootstrap.js` registers the tsx
  hook only when it can see `.ts` on disk, so the same entrypoints work in dev and production.
- **`__dirname` paths that leave the compiled tree must go through `server/lib/project_root`.**
  `build/` adds a directory level, so `../../dist` is not the same place from both trees.
- **Shared dependency versions live in `catalog:`** in `pnpm-workspace.yaml`, not in each
  package.
- `packages/chroma-js` is a fork we maintain: built, linted, formatted.
  `packages/Backbone.VirtualCollection` is vendored verbatim — lint-only, never reformatted, and
  its committed UMD bundle _is_ the shipped artifact.

## Repo map (where things are)

Everything below is TypeScript unless noted.

| Path                                        | What                                                                                                                                                                                                                                                                                              |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `app/sdk/`                                  | Game engine shared by client and server: `gameSession`, actions, 718 modifiers, 257 spells, cards + `cards/factory/*`, challenges, quests. 1,375 files.                                                                                                                                           |
| `app/common/`                               | `config.js` (mutable global `CONFIG`), `logger`, `eventbus`, `utils/*`                                                                                                                                                                                                                            |
| `app/ui/`, `app/view/`, `app/audio/`        | Marionette views/managers, Cocos2d layers/nodes/fx, audio                                                                                                                                                                                                                                         |
| `app/application.ts`, `app/index.ts`        | client boot, router, `window.*` singletons                                                                                                                                                                                                                                                        |
| `app/data/`                                 | `resources.js` (RSX manifest), `fx.js`, `packages.js` (**generated, gitignored**) — JS                                                                                                                                                                                                            |
| `app/resources/`, `app/original_resources/` | 1.2 GB of art/audio — never touch, never bundle                                                                                                                                                                                                                                                   |
| `app/vendor/`                               | cocos2d-html5 3.3, jquery-ui, aws-sdk, backfire — not npm managed, JS                                                                                                                                                                                                                             |
| `server/`                                   | `api.ts` (3000), `game.ts` (8001), `single_player.ts` (8000), `lib/data_access` (knex), `redis/`, `routes/`, `ai/`, `migrations/` (JS)                                                                                                                                                            |
| `worker/`                                   | BullMQ jobs; `worker.ts` registers them explicitly                                                                                                                                                                                                                                                |
| `bin/`                                      | service entrypoints; `_bootstrap.js` sets up app-module-path and the tsx hook — JS                                                                                                                                                                                                                |
| `config/`                                   | convict schema `config.js` + `{development,staging,production}.json` — JS                                                                                                                                                                                                                         |
| `test/`                                     | vitest: `unit/`, `integration/` (`data_access`, `jobs`, `misc`, `firebase`), `e2e/` (Playwright), `rules/`, `perf/` (Benchmark.js, not a suite)                                                                                                                                                   |
| `scripts/build/`                            | `build-client.mjs` (Vite bundle + vendor concat, sass, html, locales, resources) and `build-server.mjs` (esbuild → `build/`)                                                                                                                                                                      |
| `scripts/generate_packages.js`              | **build-critical**: text-scans `//pragma PKGS:` and RSX refs to emit `app/data/packages.js`                                                                                                                                                                                                       |
| `packages/`                                 | vendored forks: `chroma-js` (ours, built), `Backbone.VirtualCollection` (verbatim)                                                                                                                                                                                                                |
| `tooling/`                                  | shared config consumed by every package (`oxlint-config`)                                                                                                                                                                                                                                         |
| `desktop/`                                  | Electron 43 shell: main+preload via Vite, packaged with electron-builder                                                                                                                                                                                                                          |
| `docs/`                                     | [QUICKSTART](docs/QUICKSTART.md) · [ARCHITECTURE](docs/ARCHITECTURE.md) · [DOCKER](docs/DOCKER.md) · [TOOLING](docs/TOOLING.md) · modernization [PLAN](docs/MODERNIZATION_PLAN.md) / [LOG](docs/MODERNIZATION_LOG.md) / [AUDIT](docs/MODERNIZATION_AUDIT.md) · [BACKBONE](docs/BACKBONE_AUDIT.md) |

## Conventions and gotchas that bite

- **Typecheck is a CI gate and sits at zero.** Keep it there. No JS linter resolves TypeScript
  identifiers, so `tsc` is the only thing that sees an undefined one. Sweeping TS2304 to zero
  found **26 real bugs** — missing requires, undeclared variables, a `clone()` constructing the
  wrong class — and clearing the remaining 362 found more: a `Math.Infinity` that is `undefined`,
  a `CONFIG` that was the _string_ `'app/common/config'` because the `require()` was never
  written, two rank call sites dropping the caller's clock, and a decade-old `+`-before-`==`
  precedence bug in an AI log. TS2304 keeps its own faster gate (`pnpm check:undefined-names`)
  because it is the class that becomes a ReferenceError. **Run it after any codemod.**
- **Serialization is structural.** `SDKObject` + `fastExtend(this, data)` — instance property
  layout _is_ the wire format for game state and replays. Use `declare x: any` for prototype-era
  members: a real class field creates an own property and silently changes the shape. Renaming a
  property breaks replays. Add a round-trip test first.
- **Root-absolute requires.** `require('app/sdk/…')`, `require('server/lib/…')`,
  `require('config/config')` resolve from the repo root through `app-module-path`, registered in
  `bin/_bootstrap.js` and every test file, and mirrored by Vite/vitest aliases. Any new runner
  needs the same alias.
- **Beware `const` shadowing from the decaffeination.** CoffeeScript had one mutable binding per
  scope; the conversion gave each assignment its own declaration. Where a suite-level variable is
  re-declared inside a callback, every later read sees the initial `null` — this has cost real
  debugging time in `sync`, `inventory`, `rift` and `quests`, usually surfacing far away as
  `.child(null)` or a bad date. It is invisible to lint.
- **Singletons everywhere.** `GameSession.getInstance()/current()/reset()`, 20 UI managers,
  `CONFIG`, `EventBus`. Unit tests share the `GameSession` singleton within a file: files may run
  in parallel, tests inside a file may not.
- **`@type` (static) vs `type:` (prototype) on the same class** — `ModifierFactory` and
  `CardFactory` dispatch on the static while instances carry the prototype value. Both are load
  bearing; keep them.
- **Card factories** (`app/sdk/cards/factory/**`) are _text-parsed_ by `generate_packages.js`.
  Keep the `Cards.X` / `RSX.Y` literal shape or the asset packages break. The build verifies the
  generated key set against `scripts/build/packages-manifest.json` and fails on drift; regenerate
  deliberately with `--update-packages-manifest`.
- **CommonJS "export before require"** (`module.exports = X` above the requires) exists to
  survive circular requires. It does not survive ESM — restructure, don't just rename.
- **Build-time env reaches the client** through Vite `define`. The build refuses to run without a
  `FIREBASE_URL` ending in `firebaseio.com/`, and a _playable_ build needs the rest of the
  environment too. **Trap:** `vite build` forces `NODE_ENV=production`, which would flip convict
  onto `production.json`; the orchestrator resolves config itself and passes it via
  `DUELYST_BUILD_CONFIG`.
- Style is **oxfmt** (`.oxfmtrc.json`): 2-space, LF, single quotes, semicolons, 100 columns, and
  it owns JS/TS/JSON/MD/YAML. `.editorconfig` covers only what oxfmt does not (templates, styles,
  shaders) so the two cannot disagree. Lint is **oxlint**, gating on `correctness` only; every
  disabled rule says why in `tooling/oxlint-config/base.jsonc`. Don't re-enable the noisy ones —
  `no-unused-vars` alone is 6,530 legacy hits.

## Modernization program

Target stack, now reached: **pnpm monorepo · TypeScript · vitest · Vite · turborepo**. The whole
runtime is TypeScript and CoffeeScript is gone; what is left is typing, test debt and dependency
work.

- **[`docs/MODERNIZATION_PLAN.md`](docs/MODERNIZATION_PLAN.md)** — the checklist, the open work
  and the decisions log. **Start every modernization session from its "Resume here" section**,
  and update it in the same commit as the step it describes.
- [`docs/MODERNIZATION_LOG.md`](docs/MODERNIZATION_LOG.md) — what was done and what it cost to
  learn. Worth grepping before re-deciding something: several entries exist because a
  reasonable-looking decision turned out to be wrong.
- [`docs/MODERNIZATION_AUDIT.md`](docs/MODERNIZATION_AUDIT.md) — the original analysis and
  dependency graph. Read it before structural work.

How we work:

- All work on the **`modernization`** branch, **one commit per step**, each leaving `pnpm build`
  and `pnpm test:unit` green so any step can be reverted in isolation. No big-bang rewrites.
- Remotes: `myrepo` = `valpinkman/duelyst` (private, **ours** — push here; local `modernization`
  tracks its `main`). `origin` = upstream `open-duelyst/duelyst`, **read-only, never push there**.
- Prefer codemods to hand edits, and drive them from compiler diagnostics rather than sweeping
  the repo — a codemod that reads `tsc` output cannot silence a place where the types are right.
- Don't move or rename `app/resources`, `app/vendor` or the card factories without a plan for
  `generate_packages.js` and the RSX paths.
