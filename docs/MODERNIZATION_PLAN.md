# Modernization Plan

Working checklist for the stack modernization. Companion to
[`MODERNIZATION_AUDIT.md`](MODERNIZATION_AUDIT.md) (analysis & rationale — read it first).
**This file is the resume point between work sessions**: update it in the same commit as the
step it describes, so it can never drift from the code.

## ▶ Resume here

- **Where it lives:** pushed to **`valpinkman/duelyst` (private)** as `main`; the local branch
  `modernization` tracks `myrepo/main`. `origin` still points at upstream `open-duelyst/duelyst`
  (read-only, for pulling upstream changes). GitHub skips `push` events for branch-creation
  pushes this large, so CI only started on the first *incremental* push — all six workflows now
  also accept `workflow_dispatch`.
- **The four stack goals are done:**
  1. **pnpm monorepo** — workspace over `packages/*`, `app/sdk`, `app/common`, `desktop`.
  2. **TypeScript instead of CoffeeScript** — the *entire runtime* (client, SDK, server,
     worker) is `.ts`. Remaining `.js`: `app/data/*` (data + generated), the 86 knex
     migrations, `server/knexfile.js`, build scripts and `cli/`+`scripts/` legacy ops
     (which still hold the last 57 `.coffee` files — deletion candidates).
  3. **vitest** — mocha retired; unit + integration configs.
  4. **Modern bundler** — gulp deleted; Vite/rolldown builds the client in ~2.4s (was ~35s).
  Playwright is available and was used for verification, but there is still no committed e2e
  suite (see Later).
- **Verified working**, not just building: `pnpm build` from a clean tree, all four services
  in Docker, and a **practice game played end-to-end against the TypeScript stack** with a real
  Firebase RTDB (register → login → main menu → mulligan → play a minion → AI responds →
  concede), 0 console errors.
- **Next (all optional, in value order):**
  - 5T.4 incremental typing: `pnpm typecheck` reports **5,503 errors** under the loose config
    (a metric, not a gate). Start with the SDK; move directories into `tsconfig.strict.json`
    as they go clean.
  - 7.2 integration revival in CI (needs the referral-code seed + a CI Firebase project).
  - 7.3 dependency upgrades (bluebird→native promises, moment, underscore, kue, winston…).

  - 5T.3: replace the tsx require-hook with a real build for production images.
- **Known dirty state:** none.

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
- [x] 1.4b **CI verified for real** (first push to `valpinkman/duelyst`): `build_app`,
  `unit_tests`, `lint_javascript`, `lint_coffeescript`, `lint_terraform` green;
  `integration_tests` failed and exposed three things only a clean CI checkout could:
  (a) knex migrations still registered `coffeescript/register` and then imported SDK modules
  that are now `.ts` — the hook now lives once in `server/knexfile.js` (knex loads it before
  any migration) and the dead coffee registers are gone; (b) every Dockerfile still ran
  `COPY app/*.coffee`, which matches nothing since the conversion — and the root barrels it
  existed to copy are now `.ts`; (c) the test image never copied the vitest configs.
  Locally reproduced by wiping `.pgdata` and migrating from scratch: 86/86 migrations, then
  integration:misc 13/13 in-container. — (this commit)
- [x] 1.4 Workflow verification, static half: all workflows pass `actionlint`; fixed
  `actions/checkout@v3` → `v4` (v3 no longer runs on current GitHub runners — pre-existing
  breakage). **Runtime half deferred**: needs the branch pushed to GitHub (goal forbids
  pushing); verify on first push. — (this commit)
- [x] 1.5 Docker images rebuilt under pnpm and smoke-tested with compose: `test-unit` image runs
  the full mocha suite in-container (1287 passing); db+redis up; `migrate` ran all 86
  migrations; `api` boots and serves the client (HTTP 200 on `/` and `/healthcheck`, Redis
  connected); `game` (8001), `sp` (8000) and `worker` boot (worker's rotate-bosses job fails
  only on the dummy Firebase key — expected without real creds). — (this commit)

### Phase 2 — Decouple the SDK ✅

- [x] 2.1 `networkManager.coffee` moved out of the SDK to `app/networkManager.coffee` (client
  layer). The one sdk→network edge (`gameSession.submitExplicitAction` broadcasting a step) is
  inverted via injection: `GameSession.setStepSubmitter(fn)` static, registered at client boot
  in `application.coffee`; servers/tests run authoritative sessions and never need it. Dropped
  networkManager's unused `applyCardToBoardAction` import. `app/sdk` now has zero
  `window`/socket.io references. — (this commit)
- [x] 2.2 `config/config.js` (server convict) no longer required anywhere under `app/`. The 6
  core card factories and `progression_manager.js` only read `allCardsAvailable`; they now use
  the `process.env.ALL_CARDS_AVAILABLE` pattern `card.coffee` already established (envify
  client-side, convict env write-back server-side). Note: convict's Boolean default made the
  factories' existential guard dead code in every configured environment; the env form keeps
  the same behavior on client and server. — (this commit)
- [x] 2.3 `utils_ui.js` moved from `app/common/utils/` to `app/ui/utils_ui.js` — all 18 of its
  consumers were already in `app/ui`, and it requires the SDK barrel + audio_engine, so it was
  client code mislocated in common. Its relative requires converted to root-absolute; 18
  consumer paths updated. `app/common` now has zero client-directed requires. — (this commit)
- [x] 2.4 `app/common/chroma.js` requires `@counterplay/chromajs` by name (resolves through the
  pnpm workspace link instead of a relative path into `packages/`). — (this commit)
- [x] 2.5 Barrel moved to `app/sdk/index.coffee` (no shim needed: extension-less
  `require 'app/sdk'` hits it via directory resolution in node and browserify). Codemod
  `scripts/codemods/sdk-barrel-move.js`: root-absolute `app/sdk.coffee` → `app/sdk`; relative
  `../…/app/sdk.coffee` → `…/app/sdk/index.coffee` (keeps eslint import/extensions honest);
  barrel no longer exports `SDK.NetworkManager` — its 8 consumer files require
  `app/networkManager` directly. — (this commit)
  *Phase 2 accepted:* fresh dependency scan confirms `app/sdk` + `app/common` have **zero**
  edges to client, server, worker or config. Gate green (mocha 1287, vitest 1287, build,
  lint, integration:misc 13).

**Phase 2 summary:** the SDK is now a clean isomorphic island. Four cuts did it: networkManager
extracted to the client layer with an injected step-submitter hook on GameSession (2.1); the
server convict module out of factories/managers via the established `process.env` pattern (2.2);
utils_ui relocated to `app/ui` where all its consumers live (2.3); chroma by package name (2.4);
barrel inside `app/sdk/` minus its client-directed export (2.5). Nothing moved that
`generate_packages.js` parses; wire format untouched. Ready for Phase 3's package lift.

### Phase 3 — `packages/sdk` ✅ (in place — physical move deferred to TS phase)

- [x] 3.1 Wire-format guard rails in `test/unit/sdk/serialization/wire_format.js` (11 tests,
  both runners): (a) scripted-game serialize→deserialize→serialize round-trip must be
  deep-equal, plus state reproduction checks; (b) golden fixture `fixtures/wire_shape.json`
  locks the sorted own-key sets of every serialized object kind (session, board, player, deck,
  general, unit, turn, step, actions, modifier, battleMapTemplate) — regenerate deliberately
  with `UPDATE_WIRE_SHAPE=1`; (c) factory dual-type dispatch: modifiers keep static `@type` +
  prototype `type:` in sync, actions keep static `@type` + constructor-assigned own `type`
  (two different patterns — documented in the test). Discovered en route: byte-identical
  round-trips are NOT guaranteed (key order shifts), deep-equality is the invariant.
  — (this commit)
- [x] 3.2 `app/sdk` and `app/common` are now pnpm workspace members **in place**:
  `@duelyst/sdk` and `@duelyst/common` (workspace globs + minimal manifests + root
  `workspace:*` deps). Both import styles resolve to the same realpath, so
  `require('@duelyst/sdk')` and `require('app/sdk')` are the SAME module instance (locked by
  `test/unit/sdk/package_identity.js`) — critical while GameSession/CONFIG singletons exist.
  Dockerfiles copy the member manifests before `pnpm install`. Deleted dead `gulp/shop.js`
  (flagged by import/no-relative-packages; was never imported).
  *Accepted:* gate green (mocha+vitest 1300, in-container 1300, build, lint); `pnpm api`
  boots against dev config ("started on port 3000"; full HTTP serving verified in-container
  in 1.5). — (this commit)

**Phase 3 summary:** the SDK is a named, guarded package. Wire-format guard rails (round-trip,
golden key-set fixture, factory dual-type dispatch) landed first; then `@duelyst/sdk` +
`@duelyst/common` formalized as in-place workspace members. **Deliberate deviation from the
original plan text:** no physical move to `packages/sdk` yet — a 1,400-file relocation before
the TS conversion would force a ~7,000-site require rewrite (or symlinks) for no functional
gain, against the no-big-bang rule. The physical move happens with Phase 5/6 when imports are
rewritten anyway; the package boundary, names, and consumers are already in place.

### Phase 4 — Client build: gulp/browserify → Vite

- [x] 4.1 `vite.config.client.mjs` + `pnpm build:vite` builds `dist/src/duelyst.js` from the
  same entries as browserify (index + conditional editor via a virtual multi-entry module) in
  **2.4s vs ~35s**. Custom plugins: CoffeeScript transform, hbsfy-compatible `.hbs` precompile,
  static replacement of `glslify('…')` call sites via the glslify v7 compiler (aliased dep
  `glslify7`; runtime `glslify` aliased to a stub). Browserify-parity settings that mattered:
  `mainFields: ['browser','main']` (CJS deps, i18next), node builtin shims (`events`, `url`,
  `os-browserify`), a `process` banner shim, a UMD `this`-shim for moment-duration-format, and
  rolldown's native CJS handling for the export-before-require cycle idiom. **Verified in a
  real browser (Playwright)**: the Vite bundle boots to the LOGIN screen with the identical
  console profile as the gulp bundle (only the expected dummy-Firebase warning). SCSS stays
  with gulp for now (4.4/4.5). — (this commit)
- [x] 4.2 `pnpm build:client` (`scripts/build/build-client.mjs`) is a complete gulp-free
  client build: vendor concat → index.html (Handlebars) → duelyst.css (dart-sass +
  autoprefixer) → locale merge/copy → `generate_packages.js` → Vite bundle → non-cdn resource
  copy (5,821 paths, mtime-skipped) + web assets. Order matters: generate_packages scans the
  built CSS, so css precedes packages (as in gulp). `app/resources` never enters the module
  graph. **Browser-verified from a clean `dist/`**: full login screen renders (screenshot
  checked), console profile identical to gulp. Gulp path untouched. — (this commit)
- [x] 4.3 Resolved by decision instead of code: the regex CDN rewriting only runs in
  staging/production release builds against AWS infrastructure the audit already classified as
  dead for the open-source deployment. No runtime base-URL layer is built speculatively; the
  rewriting machinery is deleted with gulp in 4.5. If a CDN deployment ever returns, implement
  a base URL at that point (decision logged). — (this commit)
- [x] 4.4 Alignment verified without code changes: `server/routes/public.coffee` serves
  whatever is in `dist/src`, and the compose api returns 200 for `/`, `duelyst.js` and
  resources built by `pnpm build:client`. Dev loop: `pnpm build:client:watch` (vite --watch
  rebuilds the bundle in ~2.4s on change; run `build:client` once first for assets). A full
  HMR dev server is deliberately out of scope until the client is ESM/TS. — (this commit)
- [x] 4.5 **Gulp is gone.** Deleted `gulp/` (14 task files), `gulpfile.babel.js`, `.babelrc`,
  `docs/GULP.md`, `bulk-decaffeinate.config.js`, and 65 build-era devDependencies
  (browserify/coffeeify/watchify/envify/uglify, the whole gulp-* and imagemin-* stack,
  gulp-only helpers). `pnpm build` now points at `scripts/build/build-client.mjs`.
  Re-declared the 11 packages that source code genuinely requires but only the gulp stack had
  pulled in (glsl-fxaa + glslify for shaders, clipboard for the replay dialog, benchmark and
  fast-stats for tests, and the cli/scripts legacy-ops deps) — keeping the "declared ==
  required" invariant from the pnpm switch. `del`/`minimist`/`read-pkg` stay dropped at the
  root: they belong to `desktop/`, which declares them itself.
  Note: the standalone register-page bundle (`build:register`) is gone with gulp; it was
  never part of the default build (old `dist/src` had no `register.html` either), and the
  in-client Create Account flow covers registration. `app/register.js` +
  `app/index.register.js` are now unbuilt deletion candidates.
  *Accepted (the gate):* against a REAL Firebase RTDB — registered an account, logged in,
  skipped tutorial, reached the main menu, started a Practice game vs the Magmar AI,
  mulliganed, played a minion, ended turn, watched the AI summon and respond (steps 2→15),
  conceded to a clean game-over. Then deleted `dist/`, rebuilt from scratch gulp-free, and
  re-verified the client boots to the main menu with **0 console errors**. Full gate green:
  mocha 1300 + vitest 1300 + integration:misc 13 + lint + packages manifest (2795).
  — (this commit)

### Phase 5 — CoffeeScript → TypeScript (client + sdk)

Order (mechanical first, god-objects last). **While gulp lives (until 4.5), conversion targets
decaffeinated JS** — browserify cannot bundle `.ts`; the `.js → .ts` rename is a later
mechanical pass. Batch tool: `scripts/codemods/decaffeinate-batch.mjs` (decaffeinate →
delete `.coffee` → repo-wide require-extension rewrite → eslint --fix); every batch gates on
mocha + vitest + both builds + wire-format tests.
- [x] 5.1 Leaf lookups → JS: `cardType`, `factionsLookup`, `racesLookup`, `rarityLookup`,
  `cardsLookup`, `cardsLookupComplete` (6 files); `app/sdk/**/*.js` eslint override added
  following the app/ui/app/view convention. — (this commit)
- [ ] 5.2 Declarative modifiers & spells via scripted decaffeinate (JS while gulp lives):
  - [x] 5.2a all 716 `app/sdk/modifiers/*` except `modifier.coffee` + `modifierFactory.coffee`
    (714 scripted + 2 hand-converted where CS used `this` before `super`). Two latent-bug
    classes surfaced: decaffeinate silently refuses invalid constructors while exiting 0
    (batch script now verifies output exists), and `modifierInfiltrate`'s CS `for x of array`
    loop assigned properties to string keys — a sloppy-mode no-op that throws in strict ES6
    class methods; preserved as an explicit no-op with a comment. — (this commit)
  - [x] 5.2b 304 files: `app/sdk/spells/*` (except `spell.coffee`), `playerModifiers/*`
    (except `playerModifier.coffee`), `gameSessionModifiers/*` — fully scripted, zero
    failures, zero manual fixes.
  - [x] 5.2c 180 meta-game files: achievements, quests, challenges, giftCrates, cosmetics,
    progression, rank, rift, codex, playModes, agents, helpers, validators. 12 quests used
    `this` before `super` → new pre-transform `scripts/codemods/fix-this-before-super.mjs`
    (prototype-reads in super args; CS param-properties moved after super); 1 hand-converted
    (`questParticipationWithFaction`: bound `=>` method + a faithfully-preserved latent bug —
    its constructor always read the prototype `factionId` (null) for the quest name).
    — (this commit)
- [x] 5.3a **Regression fix + new guard**: 5.2c had silently dropped 325 asset packages —
  `generate_packages.js` text-parsers assumed CoffeeScript syntax (`type:` colon form, `extends X`
  at line end, extensionless reads of the now-renamed codex/cosmeticsFactory, comma-less object
  values). Parsers now accept both syntaxes; verified key-set parity with the pre-5.2 output
  (2,806/2,806, remaining diffs ordering-only). **New guard:** `pnpm build:client` verifies the
  generated package key set against the committed `scripts/build/packages-manifest.json` and
  fails on any change; update deliberately with `--update-packages-manifest`. — (this commit)
- [x] 5.3 `actions/` — all 65 files including the `action.coffee` base and `actionFactory`
  (validators/helpers already landed in 5.2c). Key finding: **class hierarchies must convert
  together, children-first** — a CS1 subclass cannot extend an ES6 base ("Class constructor
  cannot be invoked without 'new'"). The action dual-type idiom (`@type ?= X.type` before
  super in every subclass) is illegal in ES6; translated once at the root:
  `@type ?= @constructor.type` after super (the leaf's static — identical own-property
  result, verified by the wire-format guard tests). 6 files had other pre-super bodies whose
  statements the super chain never reads — moved after super mechanically. — (this commit)
- [x] 5.4 Entities, card, deck, all 62 card factories + cardFactory, factionFactory,
  board/player/step/gameTurn/gameSetup, modifier/modifierFactory/spell/playerModifier bases,
  remaining lookups. Waves ran children-first; text-parser patches accompanied the factory
  conversions (JS `/* */` block comments in the card-factory line parser; factionFactory
  extensionless read + comma-tolerant regex) — the packages manifest guard caught the one
  regression attempt (`card_inspect_undefined` from a commented-out card). — (this commit)
- [x] 5.5 (SDK part) `gameSession.coffee` converted (its `super(@)` — passing `this` as a super
  argument — rewritten to `super(null)` + self-assign, since SDKObject only stores the ref);
  `object.coffee` (SDKObject) converted last after every subclass. **`app/sdk` is now 100%
  JavaScript (0 `.coffee`).** Client boot files (`application.coffee`, `index.coffee`,
  `register.coffee`, `networkManager.coffee`, remaining `app/common` coffee) → 5.5b.
  *Accepted:* mocha+vitest 1300 (wire-format guards green), both builds, packages manifest
  verified, in-container 1300, browser boot to login screen (0 errors). — (this commit)
- [x] 5.5b All 25 remaining client-layer coffee files: `application`, `index`, `register`,
  `networkManager`, `app/common/*` (session2 needed a one-line `super()` — CS allowed
  super-less subclass constructors), `data`, `localization/index`, shader generator, replay,
  editor, profile model, view helpers. **`app/` is now 100% CoffeeScript-free.** Vite entry
  paths updated to `.js`. — (this commit)
  *Accepted:* mocha+vitest 1300, both builds (packages manifest verified), lint green,
  browser boots to login screen (0 errors). Remaining coffee: server/worker/cli/scripts (178
  files) → Phase 6.

### Phase 6 — Server: build step + TS

- [~] 6.1 Reframed: no TS on the server yet (JS-first policy while gulp lives), so no build
  step is needed — the server now runs plain JS directly. A tsx/tsc build lands with the
  TS rename pass.
- [ ] 6.2 Convert in order: `server/redis/` → `server/routes/` → `server/lib/data_access/` →
  `worker/` → `game.coffee` / `single_player.coffee` last.
  - [x] 6.2a `server/redis/` (15 files). Landmine found & defused repo-wide: decaffeinate
    emits `let exports;` for the `module.exports = exports = …` idiom — a CJS SyntaxError
    (shadows the wrapper param) that makes Node silently retry the file as ESM and die with
    "require is not defined in ES module scope". Also: `docker compose up` runs STALE images —
    every in-container gate claim now rebuilds first. All 4 service images rebuilt from the
    current tree: api 200, game 8001, sp 8000, worker processing (only the expected
    dummy-Firebase job failure). — (this commit)
  - [x] 6.2b `server/routes/` (37) + `server/middleware/` (6): fully scripted, zero failures.
    `require-dir` autoloading kept (works unchanged over `.js`); its removal is folded into the
    TS rename pass. Fixed stale `app/sdk/package.json` main field (`index.coffee` → `index.js`).
    api rebuilt+booted: 200 on `/` and `/healthcheck`, 401 on the jwt-guarded session route
    (auth middleware intact). — (this commit)
  - [x] 6.2c `server/lib/` incl. all of `data_access` (~15k lines): 26 scripted +
    `custom_errors` hand-generated (29 Error subclasses, all `this`-before-`super`; the
    FirebaseTransactionDidNotCommitError message-loss oddity preserved). Lint surfaced 8
    pre-existing latent bugs (out-of-scope identifiers in logging/rare paths, a missing
    `Errors` require in games.js) — preserved, downgraded per convention, listed here for a
    future correctness pass. api+worker rebuilt and boot-verified. — (this commit)
  - [x] 6.2d `worker/` (29 files): fully scripted, zero failures; rebuilt worker image boots,
    registers all jobs and processes them (only the expected dummy-Firebase credential
    failure).
  - [x] 6.2e Server root: `api`, `express`, `http`, `shutdown`, `winston`, and the two socket
    servers `game.coffee` (1.5k) + `single_player.coffee` (2.1k) — fully scripted, zero
    failures. **The entire runtime (app + server + worker) is CoffeeScript-free.** Remaining
    coffee: `cli/` + `scripts/` only (dead-ops dirs, deletion candidates). — (this commit)
- [x] 6.3 `coffeescript/register` removed from all `bin/*` entrypoints; every service boots
  and serves from freshly rebuilt images without it. The register hook now exists only in
  test preludes (drop in 7.1), the gulpfile (dies in 4.5), and generate_packages (no longer
  loads coffee but harmless). The `coffeescript` dependency itself goes when those do.
  — (this commit)

### Phase 5T — JS → TypeScript (unblocked by 4.5: rolldown/vitest/tsx read `.ts` natively)

- [x] 5T.0 TS toolchain: TypeScript 7, `tsx`, `@types/node`, `@typescript-eslint`.
  `tsconfig.json` is now the **working** config (loose: allowJs, no strict, path aliases,
  `noEmit` — Vite builds, tsx runs, vitest tests); the old strict config is preserved as
  `tsconfig.strict.json`, the **destination** — `pnpm tsc:strict` measures the remaining
  distance, `pnpm typecheck` is the working check. eslint parses ES2022 (class fields).
  TS 7 notes: `baseUrl` and `moduleResolution: node` were removed; use relative `paths` and
  `bundler`/`node16`.
- [x] 5T.1 **Dissolved decaffeinate's `initClass()` in 1,183 files** —
  `scripts/codemods/dissolve-init-class.mjs`. TypeScript cannot see through
  `static initClass() { this.X = … }`, so statics were invisible. **Wire-format critical:**
  the same method also carried `this.prototype.X = …`; the codemod keeps those as prototype
  assignments after the class (turning them into class fields would move them onto instances
  and change the serialized shape). Literal statics become real `static X = …` fields (2,344);
  non-literal statics stay ordered post-class assignments (311); prototype assignments stay
  prototype assignments (3,822). 12 files with non-assignment bodies were skipped for manual
  handling. Two traps hit and fixed: `this` on the *right*-hand side must be rewritten too
  (`this.prototype.getTarget = this.prototype.getCard`), and `Foo.initClass();` call sites can
  carry trailing comments.
  *Upstream bug preserved, not fixed:* `modifierImmuneToDamageOnEnemyTurn`'s **static** type is
  `'ModifierImmModifierImmuneToDamageOnEnemyTurnuneToDamageByGeneral'` — a botched find/replace
  present in the original CoffeeScript at `2843f240`, which makes that modifier undispatchable
  by name. Reordering exposed it via the packages manifest, so `generate_packages.js` now
  prefers the **prototype** type (what instances carry and asset lookup uses). Fixing the typo
  is a behavior change and belongs in a correctness pass, not a mechanical migration step.
  — (this commit)
- [x] 5T.2a **`.ts` execution wired everywhere**, then the first rename batch (10 SDK leaf
  lookups/enums: cardType, factionsLookup, racesLookup, rarityLookup, cardSetLookup,
  cardLocation, gameStatus, gameFormat, intentType, ribbonLookup). node's CJS loader only
  knows `.js/.json/.node`, so `tsx/cjs` is registered in `bin/*` (all five services),
  `.mocharc.js`, a vitest setup file, `scripts/generate_packages.js` and the build
  orchestrator; Vite/eslint resolve `.ts`; eslint gets `@typescript-eslint/parser` and the
  per-directory overrides now cover `.ts` too.
  **TypeScript pinned to 5.9**: TS 7 (the native port) is installed-able but
  `@typescript-eslint` refuses it ("does not support TS 7.0"), and it drops `baseUrl` /
  `moduleResolution: node`. Ecosystem support wins for a migration.
  Hardened the build: `packages.js` is deleted before regeneration, so a crashed generator
  can no longer leave a truncated file that the manifest guard reports as a false regression
  (which is exactly what it did once here). — (this commit)
- [x] 5T.2b **`app/sdk` is 100% TypeScript** — all 1,375 files (0 `.js` left).
  `scripts/codemods/rename-js-to-ts.mjs` inserts the type-only members TS needs before
  renaming: `declare x: any` for every `Klass.prototype.x = …` and `declare static y: any`
  for every `Klass.y = …`. **`declare` is essential**: TS and esbuild erase those members
  entirely, whereas a real class field would become an own instance property and change the
  serialized shape of every game object (wire-format tests stay green).
  Three scale-only problems solved: (1) `moduleDetection: force` — without it TS treats CJS
  files as scripts sharing one global scope, so `const CardType = require(…)` in one file
  collided with `class CardType` in another; (2) `Array.from(<any>)` infers `unknown[]`,
  which produced 810 of the 1,346 initial errors — annotated to `Array.from<any>(…)` rather
  than removing the wrappers, because `Array.from` *snapshots* the collection and the engine
  mutates entities mid-iteration; (3) `scripts/helpers.js#getIsFileReadable` is an extension
  **whitelist**, not an existence check — it didn't know `.ts`, so the package generator's
  recursive scans were about to skip the entire SDK. Caught before it shipped; the manifest
  guard verifies 2,795 keys unchanged.
  **Typecheck baseline: 423 errors** (from 1,346) — real findings now: missing optional-param
  markers (`TS2554`), the `colors` package's String.prototype monkey-patch, `@constructor.type`.
  `pnpm typecheck` is deliberately **not** in the blocking gate until it reaches zero; it is
  the progress metric for incremental typing. Repo is now 22.7% TypeScript by bytes.
  — (this commit)
- [x] 5T.2c **The whole client is TypeScript** — `app/ui`, `app/view`, `app/common`,
  `app/audio`, `app/replay`, `app/localization`, `app/shaders`, `app/tools` and the boot files
  (473 more files). The only `.js` left under `app/` is `app/data/*`: `resources.js` (1.5 MB
  asset manifest), `fx.js`, `game_tips.js`, the generated `packages.js` and three one-off
  migration utils — pure data and generated output, deliberately left alone.
  `app/types/globals.d.ts` declares the vendor globals that come from `vendor.js` rather than
  imports (`cc`, `Backbone`, `$`, `_`, …), the `window.*` singletons the boot file publishes,
  and the `colors` package's String.prototype extensions.
  Two more extension traps, both caught by verification rather than by the build:
  (1) the Vite **glslify plugin filtered on `.js|.coffee`**, so after the rename no shader was
  inlined — the build passed and the client threw 195 runtime errors in the browser
  (`_initShaderUniforms`); (2) requires that carried an explicit `.js` extension broke when
  their target became `.ts` — tsx's `.js→.ts` fallback does not apply to JS importers, so the
  API server died on boot. 12 such requires de-extensioned; `config/config.js` and friends
  keep theirs because they really are `.js`.
  *Accepted:* mocha 1300 + vitest 1300 + build (manifest 2795) + lint green; all four images
  rebuilt and booted; browser loads the main menu with **0 console errors** and shaders
  rendering. — (this commit)
- [x] 5T.2d **`server/` and `worker/` are TypeScript** (241 files). `require-dir` keeps
  autoloading routes and middleware because tsx registers `.ts` in `require.extensions`.
  Deliberately left as `.js`: the 86 knex migrations (append-only history, loaded by the knex
  CLI) and `server/knexfile.js` (read by that CLI outside our loaders).
  *Accepted:* mocha 1300 + integration:misc 13 + lint + build green; all four images rebuilt;
  api serves (200 `/`, 200 `/healthcheck`, 401 from the JWT-guarded route → the whole route
  tree registered), game/sp/worker boot; **played a practice game against the TypeScript SP
  server** — game created, mulligan confirmed, turn ended, AI responded (steps 2→8), 0 console
  errors. — (this commit)

**The stack conversion is complete**: CoffeeScript → JS → TypeScript across client, SDK,
server and worker. What remains is *typing* (5T.4), not converting.
- [ ] 5T.4 Incremental typing: drive `pnpm typecheck` to zero, then move directories from
  `tsconfig.json` into `tsconfig.strict.json`.
- [ ] 5T.3 Replace the tsx require-hook with a real build for production images (the hook
  compiles on every boot; fine for dev, wasteful for prod).

### Phase 6b — post-conversion correctness (found by playing the game)

- [x] 6b.1 **Promise-chain state**: CoffeeScript thin-arrow `.then` callbacks compiled to
  sloppy-mode functions where `this` was the *global object* — the original code passed state
  between chain steps through accidental globals (shared across concurrent requests!).
  decaffeinate faithfully emitted `this.x`, which inside ES6 class bodies is strict-mode
  `undefined` → `TypeError` at runtime. Surfaced as a 500 on `/session` right after a
  successful registration. Codemod `scripts/codemods/fix-then-this.mjs` (AST-based, only
  rewrites `this` inside callbacks passed to promise combinators) scoped **1,531 references
  across 15 files** to a per-call `_chainState` object — fixing the crash *and* the latent
  cross-request state bleed. `this` in other callbacks (e.g. knex grouped-where, which binds
  deliberately) untouched.
- [x] 6b.2 **Build config vs NODE_ENV**: `vite build` sets `NODE_ENV=production` before loading
  its config, which silently flipped convict onto `production.json` (`api: ""`), baking the
  wrong API URL into the bundle (client called `localhost:5000` → CORS failures). The
  orchestrator now resolves the envify values under the real environment and passes them via
  `DUELYST_BUILD_CONFIG`; direct `pnpm build:vite` forces development unless `DUELYST_ENV`
  says otherwise.

### Phase 8 — Remove the CoffeeScript era entirely ✅

- [x] 8.1 **Zero `.coffee` files in the repo.** Deleted `cli/` (paypal/mailchimp/analytics CLI
  that rsync'd to a host that no longer exists) and 15 dead `scripts/` directories (aws-utility,
  analytics, wipe, temp, user_scripts, one-offs, sarlac_prime, news, data_retrieval, sdk_to_csv,
  simulation, daily_challenges, image-utils, firebase_to_sql, codex asset-authoring). Verified
  zero external references first.
  **Kept and converted** the tooling worth having: `scripts/localization/*` (finds missing and
  out-of-date i18n keys) and `scripts/add_index`, `generate_invite_codes`.
  **Dropped as unfixable:** `delete_user`, `find_user`, `find_userid_by_name` — all three
  `require('server/lib/users_module')`, which has never existed in this repo (it was in the
  audit's unresolved list); they cannot ever have run.
- [x] 8.2 Toolchain removed with it: `coffeelint.json`, the `lint_coffeescript` workflow, the
  `coffeescript` + `@coffeelint/cli` dependencies, the `lint:coffee*` scripts, Vite's
  CoffeeScript plugin and `.coffee` resolution, the `coffeescript/register` calls left in
  8 test/server/script files, and 9 dependencies only the deleted ops used. — (this commit)

### Phase 7 — Test & dependency endgame

- [x] 7.1 **Mocha retired — vitest is the runner.** `scripts/codemods/mocha-to-vitest.mjs`
  removed 123 `this.timeout()` calls (the budget moved to `testTimeout` in the configs, which
  loosens per-suite limits into one global limit — a deliberate trade) and promise-wrapped 69
  `done`-callback tests via AST ranges, preserving `done(err)` rejection semantics.
  `vitest.config.mjs` (unit) + `vitest.integration.config.mjs` (integration, serial, longer
  timeouts) replace `.mocharc.js`; mocha and eslint-plugin-mocha are gone; CI's duplicate
  mocha job collapsed into one.
  One more sloppy-`this` bug fixed: `hash_helpers` wrote `this.hash` inside a `.then` callback
  — under mocha that hit the global object and was never read; in strict mode it throws.
  `app-module-path` preludes stay for now: they are what lets the CommonJS suites resolve
  root-absolute requires. — (this commit)
- [~] 7.2 Spike done (in-container against compose Postgres/Redis, post-conversion): the
  `data_access` suites all LOAD and RUN — no module errors from the conversion. Two
  environment gates found: (1) test setup expects a seeded referral code — fix with
  `INSERT INTO referral_codes (code, is_active) VALUES ('kumite14', true)` after migrate
  (should become a migration/seed script when reviving for CI); (2) `createNewUser` connects
  to Firebase Admin — needs REAL credentials, so full revival is blocked on the Firebase
  decision below (owner). CI stays on `misc` until then.
- [~] 7.3 Legacy dependency upgrades — each its own step, after TS conversion of the code
  that uses them.
  - [x] **Tier 1 — drop-in / self-contained** (advisories 212 → 148):
    - `moment` 2.8.3 → 2.30.1, `underscore` 1.6.0 → 1.13.8 — drop-in. — 9dd68be2
    - `handlebars` off its `4.5.3` override → 4.7.9. The pin existed because 4.6 fixed
      prototype pollution by refusing to resolve properties on an object's **prototype**,
      which this client relies on everywhere. Old behaviour restored explicitly in the Vite
      hbs plugin (`allowProtoPropertiesByDefault`/`allowProtoMethodsByDefault` on all 143
      templates) so the library is patched while rendering is unchanged. Closing this
      properly means passing plain objects to templates instead of model instances — a
      rendering-layer change, not a dependency bump. — 9dd68be2
    - `jsonwebtoken` 5.4.1 → 9.0.3 and `express-jwt` 6 → 8 (advisories 155 → 148; **all 13
      jsonwebtoken advisories cleared**). express-jwt 7 renamed `req.user` → `req.auth`;
      pinned back with `requestProperty: 'user'` rather than churn 149 route handlers. Only
      `middleware/signed_in.ts` actually called it — four other files carried dead requires.
      `jsonwebtoken` is also forced to ^9 through `pnpm.overrides` because
      `@thream/socketio-jwt` hard-depends on 8.5.1, which would have left the **socket**
      auth path on the vulnerable copy. New `test/unit/misc/auth_tokens.js` covers signing,
      expiry, wrong-secret, the `req.user` pin, and algorithm confusion. — (this commit)
  - [ ] **Tier 2 — needs seam-typing first**: `bluebird` → native promises, `redis` v4,
    `knex` 3, `winston` 3, `kue`. Each changes an API surface that many call sites depend on.

  **Latent bug found while doing this, deliberately NOT fixed here** (belongs with the other
  preserved bugs in the correctness pass, 5.2c): `config/config.js` documents
  `jwt.tokenExpiration` as *"Time (in minutes) before tokens expire"* with a default of
  `60 * 24 * 14` ("14 days in minutes"), but it is passed straight to `jwt.sign`'s
  `expiresIn`, which reads a **number as seconds**. Sessions therefore last ~5.6 hours, not
  14 days. This predates the migration — jsonwebtoken 5.4.1 read numeric `expiresIn` as
  seconds too, so the upgrade did not change it. Fixing it lengthens every session, which is
  a product decision, not a dependency bump.
- [x] 7.4 (workspace half) `desktop/` is a pnpm workspace member: own `yarn.lock` removed,
  `electron` allowlisted in `pnpm.onlyBuiltDependencies` (binary installs, v21.4.4), the
  build's `yarn install` shell-out now runs pnpm, docs updated. **Electron-2 unpinning left
  open**: `desktop/gulp/desktop.js` still pins `electronVersion: '2.0.18'` for packaging —
  needs a real packaging run to validate a bump (owner/QA, alongside 4.5). — (this commit)

### Later / optional

- [x] **E2E with Playwright** — `test/e2e/play-practice-game.spec.mjs`, run with
  `pnpm test:e2e` (`:headed` to watch). Two tests against a running local stack:
  (1) the client boots to the login screen **with zero console errors**; (2) it registers a
  fresh account, skips onboarding, starts a practice game, confirms the mulligan, ends a turn
  and asserts the AI acted (step count advanced, play returned, game still active).
  ~56s for both. This is the check that was missing all along: every runtime-only bug in this
  migration — shaders silently dropped, the wrong API host baked in, a stale require extension
  — showed up here in seconds while the build stayed green.
  Selector lesson worth keeping: the client uppercases labels in CSS and prefixes some with an
  icon glyph, so match by ROLE with a case-insensitive name (`button "Play"`, `" Confirm"`),
  never by exact visible text.
  **It immediately caught a real (pre-existing) bug:** every new account logs
  `factionForIdentifier - Unknown faction identifier: null` — the
  `questParticipationWithFaction` prototype-read bug preserved from upstream in 5.2c. It is
  allowlisted with a pointer rather than hidden; fixing it changes user-visible quest names and
  belongs in a correctness pass.
  Not in CI yet: it needs a real Firebase project. Local-only for now.
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
| 2026-08-19 | 4.3: no speculative CDN base-URL layer; regex-rewrite machinery dies with gulp | CDN deploys target dead AWS infra; YAGNI — build it if a CDN deployment returns |
| 2026-08-19 | 3.2: SDK/common become workspace packages in place; physical `packages/sdk` move deferred to the TS phase | moving 1,400 files pre-TS forces a ~7,000-site require rewrite or symlink fragility for zero functional gain; package names + boundary land now, relocation lands when imports are rewritten anyway |
| 2026-08-19 | Vitest runs the CJS tests via native-require passthrough (no coffee plugin/aliases yet) | zero-risk parity with mocha's module loading; the Vite-pipeline transform belongs to Phase 4 where it's exercised by the client build. Cost: vitest wall-clock ~38s vs mocha 6s (each forked file re-imports the SDK); acceptable until the SDK is TS. |
