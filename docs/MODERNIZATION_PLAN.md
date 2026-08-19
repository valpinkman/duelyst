# Modernization Plan

Working checklist for the stack modernization. Companion to
[`MODERNIZATION_AUDIT.md`](MODERNIZATION_AUDIT.md) (analysis & rationale — read it first).
**This file is the resume point between work sessions**: update it in the same commit as the
step it describes, so it can never drift from the code.

## ▶ Resume here

- **Branch:** `modernization` (stacked commits, one per step; not pushed anywhere yet)
- **Current state:** Phase 1 complete (1.4's runtime half pending a push). vitest runs all of
  `test/unit` at 1287/1287 parity beside mocha, locally and in CI config; Docker stack verified
  under pnpm (all 6 services boot, tests pass in-container).
- **Next step:** 2.2 — remove `config/config.js` requires from the 6 card factories and
  `progression_manager.js`.
- **Known dirty state:** none. Outstanding: run the GitHub workflows for real on first push
  (1.4 runtime half).

## Rules

1. Every step lands as **one commit** on `modernization` (or a branch stacked on it).
2. Every commit leaves the acceptance baseline green: `pnpm tsc:chroma-js && FIREBASE_URL=https://test-url.firebaseio.com/ pnpm build && pnpm test:unit` — plus any step-specific criterion below.
3. pnpm only. Never yarn/npm. No big-bang rewrites; codemods over hand-rewrites.
4. When a step completes: tick it here and update the status log in `AGENTS.md` in the same
   commit. Record hashes of *prior* commits only; a step's own entry says "(this commit)" —
   its final hash isn't knowable from inside the commit (amending changes it). Find it later
   with `git log --oneline -- <step files>` if needed.

## Phases

### Phase 0 — Baseline & tooling ✅

- [x] 0.1 Exploratory audit (`docs/MODERNIZATION_AUDIT.md`) — `15fd84af`
- [x] 0.2 Yarn 4 → pnpm 10: workspace over `packages/*`, lockfile, overrides, phantom deps — `67d4a5df`
- [x] 0.3 CI / Docker / docs converted to pnpm — `8802e091`
- [x] 0.4 `AGENTS.md` + `CLAUDE.md` agent guide — `7d08d9f1`

### Phase 1 — Test runner beachhead (vitest beside mocha) ✅ (1.4 runtime pending push)

- [x] 1.1 vitest configured for `test/unit/sdk` (99 files) beside mocha — `vitest.config.mjs`,
  `pnpm test:vitest`, pool `forks` + `isolate` for the GameSession singleton. No CoffeeScript
  plugin needed yet: the CJS test preludes register `coffeescript/register`+`app-module-path`
  and vite-node's native-require interop loads the SDK exactly as mocha does (plugin/aliases
  deferred to Phase 4). Fixed 4 tests that assigned undeclared globals (strict-mode error under
  vite-node, silent global leak under mocha).
  *Accepted:* vitest 1285/1285 == mocha 1285/1285 on the subtree; full gate green. — (this commit)
- [x] 1.2 Remove mocha-isms/dead weight from `test/unit`. Reality was smaller than the audit's
  repo-wide counts: within `test/unit` the only `this.timeout`/`done` usages were inside
  commented-out code. Done: deleted `test/index.js` (stale aggregator requiring non-existent
  dirs) and `test/unit/session/index.js` (0 active tests) + its `test:unit:session` script;
  codemod `scripts/codemods/remove-dead-test-imports.js` stripped the 15 never-used
  `require('sinon')` imports from integration files; dropped `sinon` + `power-assert`
  devDependencies. The real `this.timeout`/`done` debt lives in `test/integration` + `test/rest`
  → handled in 7.1/7.2.
  *Accepted:* mocha 1287 + vitest 1285 green; gate green. — (this commit)
- [x] 1.3 vitest covers all of `test/unit` (101 files); `unit_tests_vitest` CI job added beside
  the mocha job in `unit_tests.yaml`.
  *Accepted:* vitest 1287/1287 == mocha 1287/1287 on `test/unit`. — (this commit)
- [x] 1.4 Workflow verification, static half: all workflows pass `actionlint`; fixed
  `actions/checkout@v3` → `v4` (v3 no longer runs on current GitHub runners — pre-existing
  breakage). **Runtime half deferred**: needs the branch pushed to GitHub (goal forbids
  pushing); verify on first push. — (this commit)
- [x] 1.5 Docker images rebuilt under pnpm and smoke-tested with compose: `test-unit` image runs
  the full mocha suite in-container (1287 passing); db+redis up; `migrate` ran all 86
  migrations; `api` boots and serves the client (HTTP 200 on `/` and `/healthcheck`, Redis
  connected); `game` (8001), `sp` (8000) and `worker` boot (worker's rotate-bosses job fails
  only on the dummy Firebase key — expected without real creds). — (this commit)

### Phase 2 — Decouple the SDK (small, independent commits)

- [x] 2.1 `networkManager.coffee` moved out of the SDK to `app/networkManager.coffee` (client
  layer). The one sdk→network edge (`gameSession.submitExplicitAction` broadcasting a step) is
  inverted via injection: `GameSession.setStepSubmitter(fn)` static, registered at client boot
  in `application.coffee`; servers/tests run authoritative sessions and never need it. Dropped
  networkManager's unused `applyCardToBoardAction` import. `app/sdk` now has zero
  `window`/socket.io references. — (this commit)
- [ ] 2.2 Remove `config/config.js` requires from the 6 core card factories and `app/ui/managers/progression_manager.js` (they only need a couple of flags — pass via `app/common/config` or env).
- [ ] 2.3 Break `app/common/utils/utils_ui.js` → `app/audio/audio_engine` (the one common→client edge).
- [ ] 2.4 Fix `app/common/chroma.js` to require `@counterplay/chromajs` by name instead of a relative path into `packages/`.
- [ ] 2.5 Move the `app/sdk.coffee` barrel inside `app/sdk/` (leave a re-export shim; ~29 server requires + 154 client requires keep working).
  *Accept for all:* dependency scan shows sdk+common have zero edges to client/server/config; baseline green.

### Phase 3 — `packages/sdk`

- [ ] 3.1 Golden-file guard rails **before any moves**: GameSession serialize→deserialize→serialize round-trip tests + a recorded-replay fixture; factory `@type` dispatch test.
- [ ] 3.2 Lift `app/sdk` + the shared core of `app/common` into `packages/sdk` (workspace package, still CoffeeScript, alias/shims so `require 'app/sdk/...'` keeps resolving everywhere).
  *Accept:* baseline green; server boots (`pnpm api` starts against dev config).

### Phase 4 — Client build: gulp/browserify → Vite

- [ ] 4.1 Vite config: `app/*` alias, CoffeeScript plugin, `.hbs` precompile, glslify-call handling (plugin or codemod to glsl imports), `define` for the envify vars, SCSS includePaths, `vendor.js` kept as a plain script tag.
- [ ] 4.2 `generate_packages.js` wrapped as a build plugin (or pre-build step) producing `app/data/packages.js`; asset copy & locale merge preserved; `app/resources` stays out of the module graph.
- [ ] 4.3 Runtime CDN base URL replaces the regex URL rewriting (`rsx:*_urls`, rework-url).
- [ ] 4.4 Dev server + `server/routes/public.coffee` alignment (serve Vite output / proxy).
- [ ] 4.5 Delete gulp pipeline + dead tasks (cdn, revision, git, docker, bump, shop) once Vite output is byte-for-byte-equivalent in behavior.
  *Accept:* game client boots and plays a practice game from the Vite build.

### Phase 5 — CoffeeScript → TypeScript (client + sdk)

Order (mechanical first, god-objects last). Each bullet is many small commits:
- [ ] 5.1 Leaf enums/lookups: `cardType`, `factionsLookup`, `racesLookup`, `rarityLookup`, `cardsLookup` → TS `as const`.
- [ ] 5.2 Declarative modifiers & spells (~600 files) via scripted decaffeinate → `.ts` under a loose tsconfig.
- [ ] 5.3 `actions/` (65), `validators/`, `helpers/`.
- [ ] 5.4 `entities/`, `cards/card.coffee`, factories (watch `@type` vs `type:` and prototype defaults — see audit §3.1 risks).
- [ ] 5.5 `gameSession.coffee` last; then `application.coffee` / boot files.
  *Accept per batch:* baseline green + golden-file serialization tests green.

### Phase 6 — Server: build step + TS

- [ ] 6.1 Introduce a real server build/run (tsx or tsc) coexisting with `coffeescript/register`; Dockerfiles updated.
- [ ] 6.2 Convert in order: `server/redis/` → `server/routes/` (kill `require-dir` for explicit imports) → `server/lib/data_access/` → `worker/` → `game.coffee` / `single_player.coffee` last.
- [ ] 6.3 Retire `coffeescript/register` from `bin/*` when no `.coffee` remains server-side.

### Phase 7 — Test & dependency endgame

- [ ] 7.1 Full mocha removal; vitest only; drop `app-module-path`/register preludes from all test files.
- [ ] 7.2 Integration tests: revive against dockerized Postgres/Redis (+ Firebase decision below); get more than `misc` running in CI.
- [ ] 7.3 Legacy dependency upgrades (bluebird→native promises, moment, underscore, kue, winston, express-jwt/jsonwebtoken, knex) — each its own step, after TS conversion of the code that uses them.
- [ ] 7.4 Fold `desktop/` into the pnpm workspace; unpin Electron 2.

### Later / optional

- [ ] E2E with Playwright (greenfield — DOM flows first, canvas via game-state hooks).
- [ ] Firebase RTDB: keep vs replace (shapes client/server boundary; decide before 7.2).

## Decisions log

| Date | Decision | Why |
|---|---|---|
| 2026-08-19 | pnpm only; never yarn/npm anywhere in the repo | user directive |
| 2026-08-19 | All work on `modernization` branch, one commit per step, baseline green each commit | user directive; cheap reverts |
| 2026-08-19 | `desktop/` stays out of the workspace (own `yarn.lock`) until Phase 7.4 | its build shells out to yarn + Electron 2 pin; not worth blocking the main line |
| 2026-08-19 | Dummy `FIREBASE_URL` for builds/CI; real Firebase only needed to play | matches upstream CI behavior |
| 2026-08-19 | vitest lands *beside* mocha (Phase 1) instead of a one-shot swap | 1287 passing tests are the safety net for the TS conversion; never lose them |
| 2026-08-19 | Phantom deps added explicitly rather than enabling hoisting shims | keeps pnpm strictness as a lint for the monorepo split |
| 2026-08-19 | Gate's coffee-lint criterion = CI scope (`pnpm lint:coffee app server worker`), not `lint:coffee:all` | `lint:coffee:all` was red before this work: 59 pre-existing errors, all in dead ops dirs (`cli/`, `scripts/*`) that CI deliberately excludes; several are indentation errors that can't be auto-fixed safely in untested CoffeeScript. Those dirs are deletion candidates, not fix targets. |
| 2026-08-19 | Vitest runs the CJS tests via native-require passthrough (no coffee plugin/aliases yet) | zero-risk parity with mocha's module loading; the Vite-pipeline transform belongs to Phase 4 where it's exercised by the client build. Cost: vitest wall-clock ~38s vs mocha 6s (each forked file re-imports the SDK); acceptable until the SDK is TS. |
