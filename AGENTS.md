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
pnpm test:integration:data_access              # 575 tests; NOT in CI yet (~80 still fail). Bring up its
source scripts/dev/data-access-test-env.sh     #   throwaway postgres+redis+firebase emulator with this --
                                               #   deliberately separate from `docker compose`, because
                                               #   these suites create users and wipe inventories
pnpm typecheck                                 # tsc (loose config) - a METRIC, not a gate... EXCEPT TS2304
pnpm check:undefined-names                     # TS2304 only, and this IS a CI gate. Run after any codemod.
pnpm check:promise-utils                       # PromiseUtils/onType used without being bound
pnpm check:bluebird-orphans                    # bluebird-only API used without requiring bluebird
pnpm check:turbo-env                           # turbo.json globalEnv still covers every convict env binding
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

## Monorepo layout and turbo

Task orchestration is turborepo (`turbo.json`); pnpm still owns installs and linking.

- **The aggregates are what you type.** `pnpm build|lint|format|format:check|typecheck|test:unit`
  each expand to `turbo run <package-task> <root-task>`. A script cannot be named the same as
  the task it invokes or turbo would recurse into it, so the root package's own work carries a
  `:root` suffix — `lint:root`, `format:root`, `typecheck:root`, `test:root`, plus `build:client`.
  Those still run standalone when you want to skip orchestration (containers use `pnpm test:root`).
- **`dependsOn: ["^build"]` replaced a manual step.** `packages/chroma-js` ships no committed
  `dist`, so every build used to need `pnpm tsc:chroma-js` first — documented here, wired into two
  CI workflows, and easy to forget. Turbo now orders it. That script is gone.
- **Turbo 2 runs tasks in strict env mode**: a variable not declared in `globalEnv` is stripped
  before the task sees it, and since every `config/config.js` setting is resolved into the client
  bundle at build time, an undeclared one does not fail — it silently bakes the schema default in.
  `pnpm check:turbo-env` re-derives the list from the convict schema and fails CI on drift.
- **One lint owner per file.** Lint emits diagnostics, so overlap would double-report: the root
  `.oxlintrc.json` ignores every directory that is a workspace package in its own right, and each
  package lints itself against `tooling/oxlint-config/base.jsonc`. Formatting has no such problem
  (it is an idempotent rewrite), so `.oxfmtrc.json` at the root stays the single source of truth
  and package `format` scripts point back at it.
- `app/sdk` and `app/common` have no per-package `typecheck`/`test`: the root `tsconfig.json`
  includes `app/**` and the suites live in `test/`. Splitting those out means a second, drifting
  source of truth — it waits until the packages physically move out of `app/`.
- `packages/chroma-js` is a fork we maintain (we build it, we lint and format it, it has one
  documented rule exception in its own `.oxlintrc.json`). `packages/Backbone.VirtualCollection`
  is vendored verbatim and untouched since the initial dump: lint-only, never reformatted, and
  its committed UMD bundle _is_ the shipped artifact.
- Caching is on for the cheap repeatable tasks and **off for `build:client`** — `dist/` is ~1.2 GB
  once resources are copied in, which costs more disk than the ~35 s it would save.
- **The services no longer compile TypeScript at boot.** `scripts/build/build-server.mjs`
  transpiles the server-side trees into `build/`, mirroring the source layout so every
  root-absolute require (`require('server/lib/x')`) still resolves through app-module-path
  against `build/`. It is esbuild transpile-only, not `tsc`: tsx _is_ esbuild, so compiling the
  same files with the same tsconfig ahead of time reproduces what the hook produced at runtime,
  and it does not drag in the 364-error typecheck backlog. **The tsconfig is passed to esbuild
  verbatim** because `useDefineForClassFields` decides whether class fields land on the instance
  — and instance property layout IS the wire format.
- **`bin/*` picks its mode by looking, not by being told.** `bin/_bootstrap.js` registers the
  tsx hook only when `server/api.ts` exists on disk, so the same entrypoints work from source in
  dev and from `build/` in production. An env var would be one more thing to forget on a deploy,
  and forgetting it would quietly put the require hook back in production.
- **`__dirname` paths that escape the compiled tree need `server/lib/project_root`.** build/ adds
  a directory level, so `server/routes/../../dist` and `build/server/routes/../../dist` are not
  the same place. Paths _inside_ the mirror (e.g. `server/templates`) are unaffected; the ones
  reaching `dist/` and `public/` broke, and now resolve from `PROJECT_ROOT`.
- **`catalog:` in `pnpm-workspace.yaml` owns versions used by more than one package.** It is a
  short list on purpose — only `backbone`, `underscore` and `isomorphic-fetch` were genuinely
  shared, plus `typescript`/`vite` so the packages whose own build scripts invoke them declare
  them instead of relying on the root's `node_modules/.bin` being on PATH. It is not
  bookkeeping: `Backbone.VirtualCollection` declared `backbone@1.2.1` and `underscore: "*"`
  (which resolved to 1.6.0, from 2014) and shipped both of its own copies inside `duelyst.js`,
  beside the app's. Collapsing them cut ~203 KB and removed the version skew. Transitive pins
  (`backbone.babysitter`, `backbone.wreqr`) are out of a catalog's reach — those need
  `pnpm.overrides`.

## Repo map (where things are)

| Path                                                       | What                                                                                                                                                                                                  | Language            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------- |
| `app/sdk/`                                                 | Game engine shared by client and server: `gameSession`, actions, modifiers (718), spells (257), cards + `cards/factory/*` (card definitions), challenges, quests…                                     | CoffeeScript (100%) |
| `app/common/`                                              | `config.js` (mutable global CONFIG), `logger`, `eventbus`, `utils/*`                                                                                                                                  | JS + Coffee         |
| `app/ui/`, `app/view/`, `app/audio/`                       | Marionette views/managers, Cocos2d layers/nodes/fx, audio                                                                                                                                             | JS (decaffeinated)  |
| `app/application.coffee`, `app/index.coffee`               | client boot, router, `window.*` singletons                                                                                                                                                            | Coffee              |
| `app/data/`                                                | `resources.js` (RSX asset manifest), `fx.js`, `packages.js` (**generated, gitignored**)                                                                                                               | JS                  |
| `app/resources/`, `app/original_resources/`                | 1.2 GB of art/audio — never touch, never bundle                                                                                                                                                       | assets              |
| `app/vendor/`                                              | cocos2d-html5 3.3, jquery-ui, aws-sdk (not npm managed)                                                                                                                                               | JS                  |
| `server/`                                                  | `api.coffee`/`express.coffee` (API, port 3000), `game.coffee` (8001), `single_player.coffee` (8000), `lib/data_access` (knex), `redis/` (kue, matchmaking), `routes/`, `ai/` (JS), `migrations/` (JS) | mixed               |
| `worker/`                                                  | Kue jobs (`worker.coffee` registers them explicitly)                                                                                                                                                  | Coffee              |
| `bin/`                                                     | entrypoints: `app-module-path` → `coffeescript/register` → `config/config` → main                                                                                                                     | JS                  |
| `config/`                                                  | convict schema `config.js` + `{development,staging,production}.json`                                                                                                                                  | JS                  |
| `test/`                                                    | mocha: `unit/` (sdk, ai, firebase, misc), `integration/`, `rest/` (broken), `perf/` (Benchmark.js)                                                                                                    | JS                  |
| `vite.config.client.mjs`, `scripts/build/build-client.mjs` | client build: Vite/rolldown bundle (coffee/hbs/glslify plugins, envify defines) + vendor concat, sass, index.html, locales, resource copy                                                             | JS                  |
| `scripts/generate_packages.js`                             | **build-critical**: scans `//pragma PKGS:` comments and RSX refs to emit `app/data/packages.js`                                                                                                       | JS                  |
| `packages/`                                                | vendored forks: `chroma-js` (TS), `warlock`, `backfire`, `Backbone.VirtualCollection`                                                                                                                 | mixed               |
| `desktop/`                                                 | Electron 43 shell: main+preload bundled by Vite, packaged with electron-builder, game client shipped as an unpacked resource                                                                          | JS                  |
| `docs/`                                                    | `QUICKSTART.md`, `ARCHITECTURE.md`, `GULP.md`, **`MODERNIZATION_AUDIT.md`** (analysis), **`MODERNIZATION_PLAN.md`** (checklist / resume point)                                                        |                     |

## Conventions and gotchas that bite

- **TS2304 is a CI gate; the rest of typecheck is not.** No JS linter resolves TypeScript
  identifiers — `no-undef` was off for `.ts` under eslint and oxlint does not cover it either —
  so TypeScript is the _only_ thing that can see an undefined identifier. Sweeping TS2304 to zero found 26 real bugs — missing requires, undeclared
  variables, a `clone()` constructing the wrong class. It is kept at zero by
  `pnpm check:undefined-names`, because a codemod regression shipped once while typecheck sat
  unread. **Run it after any codemod.**

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
  layout _is_ the wire format (game state, replays). Moving CoffeeScript prototype defaults into
  instance fields, or renaming properties, silently breaks replays. Add round-trip tests first.
- **`@type` (static) vs `type:` (prototype) on the same class** — `ModifierFactory`/`CardFactory`
  dispatch on the static, instances carry the prototype value. Keep both when converting.
- **Card factories** (`app/sdk/cards/factory/**`) are _text-parsed_ by `generate_packages.js`;
  keep the `Cards.X` / `RSX.Y` literal shape or the asset packages break.
- **CommonJS "export before require" idiom** (`module.exports = X` at the top of managers, class
  defined before requires in `gameSession.coffee`) exists to survive circular requires. It does not
  survive ESM — restructure, don't just rename.
- **Build-time env → client** via Vite `define`: `API_URL`, `FIREBASE_URL`, `VERSION`, `NODE_ENV`,
  `AI_TOOLS_ENABLED`, `ALL_CARDS_AVAILABLE`, … The build refuses to run without a `FIREBASE_URL`
  ending in `firebaseio.com/`. **Trap:** `vite build` forces `NODE_ENV=production`, which would
  flip convict onto `production.json`; the orchestrator therefore resolves config itself and
  passes it in via `DUELYST_BUILD_CONFIG`.
- **Asset packages are text-parsed** (`scripts/generate_packages.js`) — the build verifies the
  generated key set against `scripts/build/packages-manifest.json` and fails on drift.
  Regenerate deliberately with `--update-packages-manifest`.
- Style: 2-space indent, LF, single quotes, semicolons, 100 columns — all of it enforced by
  **oxfmt** (`.oxfmtrc.json`), which owns JS/TS/JSON/MD/YAML. `.editorconfig` deliberately covers
  only what oxfmt does not (templates, styles, shaders), so the two cannot disagree.
- Lint is **oxlint**, config in `tooling/oxlint-config/base.jsonc`. It gates on `correctness`
  only; every rule that is off or downgraded says why in the config. Don't re-enable the noisy
  ones wholesale — `no-unused-vars` alone is 6,530 legacy hits.

## Modernization program

Target stack: **pnpm monorepo · TypeScript · vitest (+ Playwright later for e2e) · a modern
bundler (Vite-class) instead of gulp/browserify.** The full analysis, dependency graph and
rationale are in `docs/MODERNIZATION_AUDIT.md` — read it before structural work.

**The step-by-step checklist, current status and decisions log live in
`docs/MODERNIZATION_PLAN.md` — start every modernization session from its "Resume here"
section, and update it (checkbox + commit hash + decisions) in the same commit as the step
it describes.**

Remotes: `myrepo` = `valpinkman/duelyst` (private, **our** repo; local `modernization`
tracks its `main`). `origin` = upstream `open-duelyst/duelyst`, read-only — never push there.

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
  were done), then rename to `.ts` under a _loose_ tsconfig; the strict root `tsconfig.json` is
  the destination, not the starting point. Do not hand-rewrite files that a codemod can convert.
- Tests: vitest only (mocha retired). chai `expect` stays. `test/perf` is a Benchmark.js
  harness, not a suite.
- Don't move or rename `app/resources`, `app/vendor`, or the card factories without a plan for
  `generate_packages.js` and RSX paths.

Status log (newest first):

- 2026-08-21 — **triaged the data_access failures; the suite is flaky, which is the real
  blocker.** Three consecutive runs of an unchanged tree gave 70 / 70 / 71 failures, four tests
  swapping verdict between them — two chest simulations over unseeded `Math.random()`, plus
  `rift upgradeCard` and `users updateGameCounters`. **69 are stable**; the rest is noise, and a
  gate that fails randomly is worse than no gate, so seeding those comes before the tail.
  On the question of tests for features that no longer exist: **almost none**. Premium currency
  (diamonds), Stripe, PayPal, Steam, Amazon, Twitch and Kongregate have **zero** tests between
  them. The one real case was cosmetic chest prismatic drops — `_generateChestOpeningRewards`
  has no live prismatic drop at all, and it was already commented out in the 2016 CoffeeScript,
  so 10 tests had been asserting rates for something no published version ever did. Those 12
  tests (10 failing, 2 passing by asserting absence) are now one test that pins the behaviour.
  Seasonal quest tests looked deletable and are **not**: the SDK classes still exist and the
  tests drive them with an injected clock. Separately, `user_premium_currency` is referenced 5×
  in `shop.ts` but **no migration creates it** — the only table live code uses that the schema
  lacks, with both its functions' only callers commented out. Dead code to delete, not tests.
- 2026-08-21 — **5T.3 done: the services stopped compiling TypeScript at boot.** A cold
  container went **4,578 ms → ~900 ms** to reach `/health`, and the 13 MB tsx cache it wrote into
  `/tmp` on every start is gone. `pnpm build:server` transpiles 1,647 files in ~0.5 s with
  esbuild, mirroring the source tree into `build/` so root-absolute requires keep resolving; the
  five Dockerfiles build at image-build time and run `node build/bin/<svc>`. The five bin
  entrypoints collapsed onto `bin/_bootstrap.js`, which registers the tsx hook only when it can
  see `.ts` on disk. **One real breakage, caught by the e2e suite and not by any unit test:**
  the api served a 404 for `index.html` because `__dirname/../../dist/src` is `build/dist` once
  the tree moves down a level. Eight such paths (all reaching `dist/` or `public/`, both outside
  the mirror) now resolve from `server/lib/project_root`, which walks up to the directory owning
  `package.json` and so gives the same answer in both layouts. Migrations deliberately stay on
  the source path — they run once per deploy, not per boot.
- 2026-08-20 — **TS2304 is now a CI gate** (`pnpm check:undefined-names`). I shipped a
  regression to prove why: the state-bag merge codemod removed a `this_obj` declaration in
  `gift_crate.ts` and left one write behind, so the function threw `this_obj is not defined`.
  `pnpm typecheck` reported it as TS2304 the whole time — I had swept that count to zero
  precisely so a new one would stand out, then didn't run typecheck after the codemod. The guard
  existed and went unused, so it is now enforced in CI. Only TS2304 is gated; the rest of the
  typecheck backlog is not.
- 2026-08-20 — **chased the undefined-value cluster: 5 more production bugs, data_access
  455 → 493 passing.** A second `.bind(this)` artifact: code reading `_chainState.X` where X is
  **never assigned** — sometimes the function's own PARAMETER. Detector had to ignore
  `_.extend(_chainState, data)` (bulk population), which caught two false positives before I
  "fixed" working code. Real: `rank.updateUsersRatingsWithGameOutcome` read `_chainState.gameId`
  /`player1Id`/`player2Id` (parameters) so every Firebase write became `.child(undefined)` and
  threw — ratings after a game were dead; `inventory.buyBoosterPacksWithGold` read
  `_chainState.cardSetData` (put in a separate bag) so `.orbGoldCost` threw — buying boosters
  with gold was dead; `cosmetic_chests` read a progression row it never loaded;
  `shop.debitUserPremiumCurrency` returned a `purchaseId` whose assignment upstream had
  commented out; `sync` read an `authUser` that never existed upstream either (dead function).
  Both live paths verified against the real stack.
- 2026-08-20 — **the revived suites found a real cluster: 15 data_access functions used TWO
  state bags.** The bluebird `.bind(this)` migration left both a `_chainState` and a `this_obj`
  in the same function, with a value written to one and read from the other — so the read was
  always `undefined`, silently. Detected at property level (write on one / read on the other),
  not by "declares both", so functions that legitimately keep two bags were left alone. Affected:
  `shop.premCurrencyPrice` (real-money purchases), `rank.seasonStartingAt`/`timeout` (ranking),
  `rift` (six properties in one function), `cosmetic_chests.giveUserChest` (returned undefined to
  every caller), `inventory.orbCountKey`, `gift_crate.crateId`, `users.rewards`. Verified live:
  giveUserChest now returns a chest. data_access 444 → 453 passing.
- 2026-08-20 — **data_access integration suites revived: 0 → 402 of 506 passing.** Run them with
  `source scripts/dev/data-access-test-env.sh` (throwaway Postgres + Redis + the Firebase
  emulator, deliberately separate from `docker compose` so they never touch the database you play
  on). Fixed: the `createNewUser`/`userIdForEmail` API drift (49 call sites), and 9 `_chainState`
  shadowing bugs OUR bluebird migration left in the suites (production code verified clean).
  **They immediately caught a live bug**: `knex.insert()` with no values in
  `gauntlet.buyArenaTicketWithGold` and `rift` — knex 0.19 silently no-op'd it, knex 3 rejects it,
  so ticket purchases were broken by my own knex upgrade and verification had missed it. Also
  `crypto.createCipher` (removed in node 22) in dead deck-hash code. 81 failures remain, triaged
  in the plan; NOT wired into CI until green.
- 2026-08-20 — **winston needed no work — it was already on 3.19.0 with 0 advisories** (the
  tier-2 table listed it as a target; the completed entry below it says otherwise). What it did
  need was coverage: the seam is opt-in, so nothing in CI or e2e ever runs it. Re-verified against
  the current tree and added `test/unit/misc/winston_console.js` (6 tests) pinning the arity fix,
  where winston 3's `(message, meta)` signature would otherwise silently swallow every argument
  after the first. `setup()` now returns its logger so the test can attach a readable transport.
  Also brought the stale tier-2 section up to date: redis/kue/bluebird are all resolved.
- 2026-08-20 — **correctness pass: the catalogued-bugs list is closed.** Two entries were
  already stale (the 8 `server/lib` latent bugs were TS2304s cleared in the typing pass; the 6
  SDK requires were fixed when found). Removed the `GET /api/me/rank/` handler — it queried a
  `user_rank` table no migration creates, passed a variable to its own initializer, discarded the
  result, and no client calls it (404 now, not 500). Removed a `referral_events` cleanup that was
  dead twice over. **Two corrections to my own earlier claims:** there are no orphaned
  `referral_events` rows (no such table), and `sourceId` is vestigial across the _whole_ currency
  API rather than recorded-by-one — `user_currency_log` has no source column and `giveUserSpirit`
  never declared the parameter.
- 2026-08-20 — **TS2554 read individually, 145 → 75; typecheck now 366.** This was the slice
  worth reading rather than silencing, since a missing argument is a real bug — and the verdict
  is that **almost none were**: they are signatures lying about optionality (decaffeinated default
  parameters, pass-throughs whose default lives one level down, and `systemTime || moment()`).
  Two codemod rules were narrowed after inspecting their output — accepting any `param || X`
  marked 128 params to fix 5 errors and produced `setIsDeveloperMode(val?)`, so the rule now
  requires a `moment()` fallback: 28 signatures, all provably right. Catalogued for a correctness
  pass: `giveUserGold` records its `sourceId` but `debitGoldFromUser`/`giveUserSpirit`/
  `debitSpiritFromUser` accept, document and silently drop it, so currency debits have no
  source in the ledger.
- 2026-08-20 — **typecheck 2,960 → 436** (85%). TS2339 2,467 → 175, TS2794 128 → 0, via three
  diagnostics-driven codemods that are strictly type-only: `Record<string, any>` on scratch
  objects (159), `declare` on initClass-era statics/prototype defaults (45), `new Promise<void>`
  (116). Unlike the TS2304 pass these were **not** bugs — TypeScript could not see shapes that
  are correct at runtime. Every codemod reads the compiler's output rather than sweeping the
  repo, so it cannot silence a place where TS infers a real shape; each reports what it could not
  resolve. `declare`/annotations rather than class fields is load-bearing: a class field would
  create own properties and change the wire format.
- 2026-08-20 — **TS2304 cleared: 73 → 0**, and it was a bug list, not typing noise: **26 real
  defects** across SDK, client, server, worker and AI. eslint's `no-undef` is off for `.ts`, so
  TypeScript is the only thing that sees an undefined identifier, and its output sat unread in a
  ~2,900-error backlog. Found: `moment` unrequired (every login-achievement job threw), `Errors`
  unrequired (404s surfaced as ReferenceErrors), three SDK gameplay bugs, `GameLayer` assigning an
  undeclared variable on a common inspect path, both shop dialogs whose catch handlers themselves
  threw, and `GradientColorMap.clone()` constructing a ToneCurve. The genuine browser globals
  (`TelemetryManager`, `kongregate`, `grecaptcha`, …) are declared in `app/types/globals.d.ts`
  rather than "fixed", so the next real one is visible instead of lost in noise.
- 2026-08-20 — **integration tests for the job seam** (`pnpm test:integration:jobs`, 12 tests).
  Needs only redis, so it **gates every push in CI**. It immediately found a race hand-probing had
  missed: `waitFor` hung for one waiter in five, every run, with a different one hanging each time
  — BullMQ's event wait can miss a job that finishes between the waiter attaching and the
  subscription going live. `waitFor` now awaits `QueueEvents.waitUntilReady()` and races the event
  against a 250ms state poll. The game server blocks its ratings update on that call, so this
  would have stalled ratings intermittently in production.
- 2026-08-20 — **kue → BullMQ 6**, and with it the last of `redis@2`. kue was unmaintained
  since 2017 and pulled express 4, pug 2-beta, stylus, nib and yargs 4; advisories 87 → **80**.
  42 producers converted to `Jobs.enqueue()`, 13 kue-shaped `(job, done)` handlers adapted in the
  seam rather than rewritten, the 6 `.ttl()` sites collapsed onto 2 worker registrations using
  `PromiseUtils.withTimeout`, and the game server's cross-process "wait for both post-game jobs"
  moved to BullMQ QueueEvents. kue's web UI → bull-board on the same port. **Three bugs found:**
  two of ours (a stage-6 codemod had rewritten kue's builder `.delay()` into a promise `.then()`,
  killing all matchmaking retries; and decaffeination had misplaced a comma so `afterGameOver`
  waited on only one player's job), plus `removeOnComplete: true` being incompatible with
  BullMQ's `waitUntilFinished` — which would have broken ratings on every game.
- 2026-08-20 — **bluebird is GONE** — from the repo and from the dependency tree. redis 2.8 →
  **ioredis 6** (target changed by measurement: node-redis v4 needs an explicit `connect()`,
  and `r-client.ts` exports a client 11 modules use synchronously; ioredis connects on
  construction so no consumer moved). 39 `*Async` calls de-suffixed, 2 Buffer reads on
  `getBuffer()` (replacing `detect_buffers`), and `server/redis/r-lock.ts` + 10 unit tests
  replaces the vendored `@counterplay/warlock` (deleted, along with its `node-redis-scripty`).
  Three bluebird uses no grep had found, all caught by running the code: `bin/api` did
  `global.Promise = require('bluebird')` for the whole api process, `r-timeseries.countHits`
  used mid-line `.call('size')`, and a test script promisified an already-promise. kue keeps
  its own pinned redis@2.6.5 — it manages its own connections.
- 2026-08-20 — **bluebird is down to 2 files.** Stage 7 landed in three steps: map/each/props
  helpers with contract tests (7a), all 100 bluebird statics converted (7b), promisify off
  bluebird for zlib/bcrypt/s3 (7c), and the require dropped from **213 of 215 files** (7d).
  Only `server/redis/r-client.ts` + `r-tokenmanager.ts` still need it, so **redis v4 is the only
  thing left before the dependency can go**. Four real bugs found: a `gzipAsync` ReferenceError
  we introduced in stage 6b, `Promise.longStackTraces` crash-looping the worker, `.isFulfilled()`
  (bluebird's inspection API, which native promises lack) hanging the login→registration
  transition, and a genuine **race in `scripts/helpers.js` file traversal** that made asset
  package generation non-deterministic — caught by the packages-manifest guard. New CI guard:
  `pnpm check:bluebird-orphans`. Lesson repeated: lint can't see this class (no-undef is off for
  TS), unit tests can't either — the e2e suite and booting the services found all four.
- 2026-08-20 — **knex 0.19 → 3.3.0**, and with it the last of bluebird's `.timeout` (20/20
  converted, 0 left in server+worker). `/health` pool stats now read tarn _or_ generic-pool and
  degrade to nulls rather than throwing. Advisories 90 → 88, and **bluebird is now a direct
  dependency only** — knex was the last package pulling it in, so dropping it is unblocked once
  redis v4 lands. Verified against a real database: migrations, all 6 services, register/login,
  8 authenticated data_access routes, and the e2e practice game. Two pre-existing bugs
  catalogued (not caused by the upgrade): `GET /api/me/rank/` queries a `user_rank` table no
  migration creates, and `pnpm migrate:latest` has always needed `NODE_ENV` set.
- 2026-08-19 — **Phase 9 done: the client is off firebase@2.0.3 and on firebase@12.** Auth moved
  from v2 legacy tokens to real custom tokens (`createCustomToken` server-side,
  `signInWithCustomToken` client-side), and the RTDB rules moved from `auth.id` to `auth.uid`
  (86 refs), deployed to production after a live backup. Practice game verified end-to-end
  against `duelyst-universe`. Two Firebase projects now: `duelyst-universe` (play) and
  `duelyst-ci` (CI). `FIREBASE_API_KEY` is a new required build var (public, not a secret).
  Rules are tested against the emulator with `pnpm test:rules` — the integration suite CANNOT
  check rules, because it connects as a service account and admin bypasses them.
- 2026-08-19 — the firebase integration suite runs in CI against its own project
  (`duelyst-ci`, RTDB `duelyst-ci-default-rtdb`), so CI never writes to the database you play
  on; four repo secrets set from a service-account key, step gated so fork PRs skip it.
  Also: `duelyst_firebase_module` now un-escapes `\n` in the private key, so the same value
  works from Compose, a plain shell and an Actions secret alike.
- 2026-08-19 — firebase-admin 11 → 14 (advisories 148 → 128; its subtree 21 vulnerable paths
  → 1). v14 is fully modular, so the namespaced calls moved to `firebase-admin/app` +
  `firebase-admin/database` in the one seam (`server/lib/duelyst_firebase_module.ts`); the
  class API is unchanged so all 352 `connect()` callers are untouched. Verified against the
  real RTDB. NOTE: the client still uses `firebase@2.0.3` — that one is the RTDB
  keep-vs-replace decision, not a bump.
- 2026-08-19 — deleted `scripts/add_index.js` (GitGuardian). Its two hardcoded Firebase
  tokens came from upstream's 2022 source dump and are public in `open-duelyst/duelyst`;
  decaffeinating the file gave them a new path, which re-flagged them as new incidents.
  Audited alongside: `.env` and `serviceAccountKey.json` have NEVER been committed.
- 2026-08-19 — dependency tier 1 done (advisories 212 → 148): moment 2.30, underscore 1.13,
  handlebars off its 4.5.3 pin (prototype access restored explicitly in the Vite hbs plugin),
  jsonwebtoken 5.4 → 9 + express-jwt 6 → 8 (`requestProperty: 'user'` keeps the 149
  `req.user` reads; a `pnpm.overrides` entry drags `@thream/socketio-jwt`'s pinned 8.5.1 up
  too, so the socket auth path is patched as well).
- 2026-08-19 — CoffeeScript is gone from the repo entirely: dead ops deleted, useful tools
  converted, toolchain and lint_coffeescript workflow removed.
- 2026-08-19 — Playwright e2e added: boots the client and plays a practice game vs the AI,
  asserting zero console errors. Caught the upstream questParticipationWithFaction bug.
- 2026-08-19 — mocha retired; vitest is the only test runner (unit + integration configs).
- 2026-08-19 — server + worker are TypeScript. The whole runtime is now TS; a practice game
  plays end-to-end against it. Remaining work is typing, not converting.
- 2026-08-19 — the entire client (app/) is TypeScript; only app/data data/generated files stay .js.
  Browser-verified: main menu, shaders, 0 console errors.
- 2026-08-19 — app/sdk is 100% TypeScript (1,375 files). Typecheck baseline 423 errors
  (metric, not a gate). Wire format + packages manifest verified unchanged.
- 2026-08-19 — .ts runs everywhere (tsx hook in bin/mocha/vitest/generator); first 10 SDK
  lookups renamed to TypeScript; TS pinned to 5.9 for eslint compatibility.
- 2026-08-19 — TS toolchain in (loose tsconfig working, strict one is the destination);
  decaffeinate initClass dissolved in 1,183 files with prototype props kept off instances.
- 2026-08-19 — GULP DELETED (4.5). Gate met against a real Firebase RTDB: registered, logged in,
  played a practice game vs the AI, conceded; then rebuilt from scratch gulp-free (0 console
  errors). pnpm build = scripts/build/build-client.mjs.
- 2026-08-19 — desktop/ folded into the pnpm workspace (yarn.lock removed, electron allowlisted);
  Electron-2 packaging unpin deferred to a packaging QA run.
- 2026-08-19 — Phase 6 conversion done: entire runtime (app+server+worker) CoffeeScript-free;
  coffeescript/register removed from bin; all services boot from rebuilt images.
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
- 2026-08-19 — vitest ran beside mocha for `test/unit/sdk` (1285/1285 parity) before mocha
  was retired.
- 2026-08-19 — repo switched from Yarn 4 to pnpm 10 (workspace over `packages/*`; CI/Docker
  converted, Docker images not yet rebuilt). Baseline: `pnpm build` and `pnpm test:unit`
  (1287 passing) green. Audit written.
