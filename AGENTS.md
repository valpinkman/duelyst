# OpenDuelyst — guide for coding agents

Duelyst is a 2016 collectible-card / tactics game (Counterplay Games), open-sourced after
shutdown. This repo contains the browser client (Backbone/Marionette + Cocos2d-html5), the
shared game engine (`app/sdk`), the backend services (Express API, socket.io game servers,
Kue worker) and the tooling around them. Most of it is still CoffeeScript built with
gulp + browserify. **We are in the middle of modernizing the whole stack** — read
"Modernization program" below before making structural changes.

## Package manager: pnpm only

- Use **pnpm** for everything. Never run `yarn` or `npm install`; never commit a
  `yarn.lock` / `package-lock.json`. The pinned version is in `package.json#packageManager`
  (corepack/proto/volta pick it up).
- Workspace: `pnpm-workspace.yaml` covers `packages/*` (vendored forks). `desktop/` is
  **not** in the workspace yet and still has its own `yarn.lock` — leave it alone unless
  the task is about desktop.
- Local packages are `workspace:*` deps; `resolutions` live under `pnpm.overrides`;
  packages that need build scripts go in `pnpm.onlyBuiltDependencies` (currently `bcrypt`).
- If a dependency is required in code but missing from `package.json` (yarn used to hoist
  it), add it explicitly — do **not** enable `shamefully-hoist` / `node-linker=hoisted`.

## Everyday commands

```bash
pnpm install                                   # after clone or lockfile change
pnpm tsc:chroma-js                             # required once before build (packages/chroma-js has no committed dist)
FIREBASE_URL=https://test-url.firebaseio.com/ pnpm build   # gulp client build -> dist/src (dummy URL is fine for build)
pnpm test:unit                                 # mocha, ~1300 tests, ~6s, no external services
pnpm test:integration:misc                     # the only integration suite that runs in CI (rest need Postgres/Redis/Firebase)
pnpm lint:js:all && pnpm lint:coffee:all       # eslint (airbnb-base) + coffeelint
pnpm api | pnpm game | pnpm sp | pnpm worker   # start services (need Redis/Postgres/Firebase env, see docs/QUICKSTART.md)
docker compose up                              # full local stack (Docker images not yet re-verified after the pnpm switch)
```

Playing the game locally requires a Firebase Realtime Database (`FIREBASE_URL`, legacy
token, service account) — see `docs/QUICKSTART.md`. Building and unit-testing do not.

## Repo map (where things are)

| Path | What | Language |
|---|---|---|
| `app/sdk/` | Game engine shared by client and server: `gameSession`, actions, modifiers (718), spells (257), cards + `cards/factory/*` (card definitions), challenges, quests… | CoffeeScript (100%) |
| `app/common/` | `config.js` (mutable global CONFIG), `logger`, `eventbus`, `utils/*` | JS + Coffee |
| `app/ui/`, `app/view/`, `app/audio/` | Marionette views/managers, Cocos2d layers/nodes/fx, audio | JS (decaffeinated) |
| `app/application.coffee`, `app/index.coffee` | client boot, router, `window.*` singletons | Coffee |
| `app/data/` | `resources.js` (RSX asset manifest), `fx.js`, `packages.js` (**generated, gitignored**) | JS |
| `app/resources/`, `app/original_resources/` | 1.2 GB of art/audio — never touch, never bundle | assets |
| `app/vendor/` | cocos2d-html5 3.3, jquery-ui, aws-sdk (not npm managed) | JS |
| `server/` | `api.coffee`/`express.coffee` (API, port 3000), `game.coffee` (8001), `single_player.coffee` (8000), `lib/data_access` (knex), `redis/` (kue, matchmaking), `routes/`, `ai/` (JS), `migrations/` (JS) | mixed |
| `worker/` | Kue jobs (`worker.coffee` registers them explicitly) | Coffee |
| `bin/` | entrypoints: `app-module-path` → `coffeescript/register` → `config/config` → main | JS |
| `config/` | convict schema `config.js` + `{development,staging,production}.json` | JS |
| `test/` | mocha: `unit/` (sdk, ai, firebase, misc), `integration/`, `rest/` (broken), `perf/` (Benchmark.js) | JS |
| `gulp/`, `gulpfile.babel.js` | build: browserify+coffeeify+hbsfy+glslify+envify, sass, vendor concat, asset copy | JS |
| `scripts/generate_packages.js` | **build-critical**: scans `//pragma PKGS:` comments and RSX refs to emit `app/data/packages.js` | JS |
| `packages/` | vendored forks: `chroma-js` (TS), `warlock`, `backfire`, `Backbone.VirtualCollection` | mixed |
| `desktop/` | Electron shell wrapping `dist/src` | JS |
| `docs/` | `QUICKSTART.md`, `ARCHITECTURE.md`, `GULP.md`, **`MODERNIZATION_AUDIT.md`** (analysis), **`MODERNIZATION_PLAN.md`** (checklist / resume point) | |

## Conventions and gotchas that bite

- **Root-absolute requires.** `require 'app/sdk/…'`, `require 'server/lib/…'`, `require 'config/config'`
  resolve from the repo root via `app-module-path` (registered in `bin/*`, `gulpfile.babel.js`,
  every test file) and via browserify `paths`. Any new bundler/test runner needs the same alias.
- **CoffeeScript is compiled at runtime** on the server (`coffeescript/register`) — there is no
  server build step today. `.coffee` and `.js` are both resolvable extension-less; ~190 requires
  carry an explicit `.coffee` extension and break on rename.
- **Singletons everywhere.** `GameSession.getInstance()/current()/reset()`, 20 UI managers, `CONFIG`,
  `EventBus`. Unit tests share the `GameSession` singleton within a file: files may run in
  parallel, tests inside a file may not.
- **Serialization is structural.** `SDKObject` + `fastExtend(this, data)` — instance property
  layout *is* the wire format (game state, replays). Moving CoffeeScript prototype defaults into
  instance fields, or renaming properties, silently breaks replays. Add round-trip tests first.
- **`@type` (static) vs `type:` (prototype) on the same class** — `ModifierFactory`/`CardFactory`
  dispatch on the static, instances carry the prototype value. Keep both when converting.
- **Card factories** (`app/sdk/cards/factory/**`) are *text-parsed* by `generate_packages.js`;
  keep the `Cards.X` / `RSX.Y` literal shape or the asset packages break.
- **CommonJS "export before require" idiom** (`module.exports = X` at the top of managers, class
  defined before requires in `gameSession.coffee`) exists to survive circular requires. It does not
  survive ESM — restructure, don't just rename.
- **Build-time env → client** via envify: `API_URL`, `FIREBASE_URL`, `VERSION`, `NODE_ENV`,
  `AI_TOOLS_ENABLED`, `ALL_CARDS_AVAILABLE`, … (`gulp/bundler.js`). Gulp refuses to build without
  a `FIREBASE_URL` ending in `firebaseio.com/`.
- Style: 2-space indent, LF, single quotes, semicolons in JS (`.editorconfig`, `.eslintrc.json`,
  `coffeelint.json`). ESLint has many per-directory rule downgrades — don't "fix" them wholesale.

## Modernization program

Target stack: **pnpm monorepo · TypeScript · vitest (+ Playwright later for e2e) · a modern
bundler (Vite-class) instead of gulp/browserify.** The full analysis, dependency graph and
rationale are in `docs/MODERNIZATION_AUDIT.md` — read it before structural work.

**The step-by-step checklist, current status and decisions log live in
`docs/MODERNIZATION_PLAN.md` — start every modernization session from its "Resume here"
section, and update it (checkbox + commit hash + decisions) in the same commit as the step
it describes.**

How we work on it:
- All work happens on the **`modernization`** branch (or branches stacked on it), **one commit
  per step**, each step leaving `pnpm build` and `pnpm test:unit` green so any step can be
  reverted in isolation. No big-bang rewrites.
- Order of operations (see audit §4.5): ✅ pnpm switch → vitest alongside mocha for
  `test/unit/sdk` → extract the few cross-layer couplings (`app/sdk/networkManager`, card
  factories → `config/config.js`, `utils_ui` → `audio_engine`, `app/common/chroma.js` relative
  require, `app/sdk.coffee` barrel) → lift `app/sdk` + `app/common` into `packages/sdk` →
  Vite for the client → decaffeinate → TypeScript (leaf enums/lookups → declarative
  modifiers/spells → actions → entities/card → gameSession; server: redis → routes →
  data_access → socket servers, last).
- Coffee → TS: go through decaffeinate → JS first (that's how `app/ui`, `app/view`, `server/ai`
  were done), then rename to `.ts` under a *loose* tsconfig; the strict root `tsconfig.json` is
  the destination, not the starting point. Do not hand-rewrite files that a codemod can convert.
- Tests: chai `expect` stays; convert `this.timeout()` → per-test options and `done` → async;
  keep mocha and vitest both green until the switch is complete. `test/perf` is not a test suite.
- Don't move or rename `app/resources`, `app/vendor`, or the card factories without a plan for
  `generate_packages.js` and RSX paths.

Status log (newest first):
- 2026-08-19 — server/lib decaffeinated (6.2c); custom_errors hand-generated; 8 latent bugs
  catalogued in plan for a future correctness pass.
- 2026-08-19 — server routes+middleware decaffeinated (6.2b); api boot-verified in container.
- 2026-08-19 — server/redis decaffeinated (6.2a); let-exports ESM-fallback landmine defused;
  all service images rebuilt fresh and boot-verified.
- 2026-08-19 — app/ is 100% CoffeeScript-free (client boot files + common converted in 5.5b).
  Only server/worker/cli/scripts coffee remains (Phase 6).
- 2026-08-19 — app/sdk is 100% JavaScript (1,375 files converted across 5.1–5.5); wire-format
  and packages-manifest guards green throughout; browser boot verified.
- 2026-08-19 — CRITICAL catch: 5.2c had silently dropped 325 asset packages (text-parsers
  assumed coffee syntax). Fixed; packages-manifest.json now locks the key set in build:client.
- 2026-08-19 — actions layer decaffeinated (65 files, 5.3); dual-type idiom translated via
  @constructor.type at the root; hierarchies must convert children-first (documented in plan).
- 2026-08-19 — 180 meta-game sdk files decaffeinated (5.2c); app/sdk down to 169 .coffee
  (core classes, actions, entities, cards, factories).
- 2026-08-19 — 304 spells/playerModifiers/gameSessionModifiers decaffeinated (5.2b); clean run.
- 2026-08-19 — 716 modifiers decaffeinated to JS (5.2a); suite, both builds, wire-format
  fixture all green.
- 2026-08-19 — 4.3/4.4 closed: compose api serves build:client dist (200s); build:client:watch
  dev loop added; CDN rewriting will die with gulp (decision).
- 2026-08-19 — pnpm build:client is a complete gulp-free client build (browser-verified
  from clean dist; login screen renders). Gulp still intact until 4.5.
- 2026-08-19 — Vite builds the client bundle (pnpm build:vite, 2.4s vs ~35s browserify);
  browser-verified boot parity with the gulp bundle (login screen, same console profile).
- 2026-08-19 — Phase 3 done: @duelyst/sdk + @duelyst/common are in-place workspace packages
  (identity-locked by test); wire-format guard rails active. Physical move deferred to TS phase.
- 2026-08-19 — wire-format guard rails added (round-trip + golden key-set fixture + factory
  dual-type tests); UPDATE_WIRE_SHAPE=1 regenerates the fixture deliberately.
- 2026-08-19 — Phase 2 complete: barrel is app/sdk/index.coffee; dependency scan confirms
  sdk+common have zero edges to client/server/config.
- 2026-08-19 — utils_ui moved app/common → app/ui; app/common has no client-directed requires.
- 2026-08-19 — app/ no longer requires config/config.js anywhere (factories + progression_manager
  use the process.env.ALL_CARDS_AVAILABLE pattern).
- 2026-08-19 — networkManager extracted from app/sdk (now app/networkManager.coffee);
  GameSession gets an injected step submitter. SDK has zero browser refs.
- 2026-08-19 — Phase 1 done: Docker stack verified under pnpm (all services boot, 1287 tests
  pass in-container); workflows actionlint-clean (checkout@v3→v4); runtime CI check awaits
  first push.
- 2026-08-19 — vitest covers all of test/unit (1287/1287 parity, `unit_tests_vitest` CI job added).
- 2026-08-19 — test/unit cleaned of dead weight (stale aggregators, unused sinon/power-assert);
  codemods live in `scripts/codemods/`.
- 2026-08-19 — vitest runs beside mocha for `test/unit/sdk` (`pnpm test:vitest`, 1285/1285
  parity). CJS native-require passthrough, no coffee plugin yet; gate's coffee-lint = CI scope
  (`lint:coffee app server worker`) — `lint:coffee:all` has pre-existing errors in dead dirs.
- 2026-08-19 — repo switched from Yarn 4 to pnpm 10 (workspace over `packages/*`; CI/Docker
  converted, Docker images not yet rebuilt). Baseline: `pnpm build` and `pnpm test:unit`
  (1287 passing) green. Audit written.
