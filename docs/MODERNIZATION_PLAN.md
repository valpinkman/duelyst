# Modernization Plan

Working checklist for the stack modernization. Companion to
[`MODERNIZATION_AUDIT.md`](MODERNIZATION_AUDIT.md) (analysis & rationale — read it first).
**This file is the resume point between work sessions**: update it in the same commit as the
step it describes, so it can never drift from the code.

## ▶ Resume here

- **Branch:** `modernization` (stacked commits, one per step; not pushed anywhere yet)
- **Current state:** Phase 0 complete. Baseline green: `pnpm build` + `pnpm test:unit` (1287 passing).
- **Next step:** 1.1 — vitest running `test/unit/sdk` alongside mocha.
- **Known dirty state:** none. Docker images and GitHub workflows were converted to pnpm
  mechanically but have not been exercised (1.4 / 1.5 below).

## Rules

1. Every step lands as **one commit** on `modernization` (or a branch stacked on it).
2. Every commit leaves the acceptance baseline green: `pnpm tsc:chroma-js && FIREBASE_URL=https://test-url.firebaseio.com/ pnpm build && pnpm test:unit` — plus any step-specific criterion below.
3. pnpm only. Never yarn/npm. No big-bang rewrites; codemods over hand-rewrites.
4. When a step completes: tick it here, record the commit hash, and update the status log in `AGENTS.md`.

## Phases

### Phase 0 — Baseline & tooling ✅

- [x] 0.1 Exploratory audit (`docs/MODERNIZATION_AUDIT.md`) — `15fd84af`
- [x] 0.2 Yarn 4 → pnpm 10: workspace over `packages/*`, lockfile, overrides, phantom deps — `67d4a5df`
- [x] 0.3 CI / Docker / docs converted to pnpm — `8802e091`
- [x] 0.4 `AGENTS.md` + `CLAUDE.md` agent guide — `7d08d9f1`

### Phase 1 — Test runner beachhead (vitest beside mocha)

- [ ] 1.1 vitest configured for `test/unit/sdk` only: CoffeeScript transform plugin, `app/`+`test/` aliases, `testTimeout: 1000`, file-level parallelism only (GameSession singleton).
  *Accept:* `pnpm test:vitest` passes the same specs as `mocha test/unit/sdk` (same count), and mocha still green.
- [ ] 1.2 Codemod the mocha-isms in `test/unit`: `this.timeout(n)` (122) → per-test options, `done` callbacks (69) → async, delete dead sinon/power-assert imports and `test/index.js`.
  *Accept:* both runners green on `test/unit`.
- [ ] 1.3 Extend vitest to all of `test/unit`; add a `unit_tests_vitest` CI job next to the mocha one.
- [ ] 1.4 Verify the converted GitHub workflows actually pass (push branch / act).
- [ ] 1.5 Rebuild Docker images under pnpm; `docker compose up` smoke test.

### Phase 2 — Decouple the SDK (small, independent commits)

- [ ] 2.1 Extract `app/sdk/networkManager.coffee` from the SDK graph (it's the only browser-coupled file; injected or moved client-side).
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
