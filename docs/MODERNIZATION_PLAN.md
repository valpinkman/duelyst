# Modernization Plan

Working checklist for the stack modernization. Companion to
[`MODERNIZATION_AUDIT.md`](MODERNIZATION_AUDIT.md) (analysis & rationale — read it first).
**This file is the resume point between work sessions**: update it in the same commit as the
step it describes, so it can never drift from the code.

## ▶ Resume here

- **Where it lives:** pushed to **`valpinkman/duelyst` (private)** as `main`; the local branch
  `modernization` tracks `myrepo/main`. `origin` still points at upstream `open-duelyst/duelyst`
  (read-only, for pulling upstream changes). GitHub skips `push` events for branch-creation
  pushes this large, so CI only started on the first _incremental_ push — all six workflows now
  also accept `workflow_dispatch`.
- **The four stack goals are done:**
  1. **pnpm monorepo** — workspace over `packages/*`, `app/sdk`, `app/common`, `desktop`.
  2. **TypeScript instead of CoffeeScript** — the _entire runtime_ (client, SDK, server,
     worker) is `.ts`. Remaining `.js`: `app/data/*` (data + generated), the 86 knex
     migrations, `server/knexfile.js`, build scripts and `cli/`+`scripts/` legacy ops
     (which still hold the last 57 `.coffee` files — deletion candidates).
  3. **vitest** — mocha retired; unit + integration configs.
  4. **Modern bundler** — gulp deleted; Vite/rolldown builds the client in ~2.4s (was ~35s).
     Playwright e2e **is** committed now (`test/e2e/play-practice-game.spec.mjs`): it boots the
     client and plays a practice game vs the AI, asserting 0 console errors.
- **Verified working**, not just building: `pnpm build` from a clean tree, all six services
  in Docker (api, game, sp, worker, plus db/redis; worker-ui is profile-gated), and a **practice game played end-to-end against the TypeScript stack** with a real
  Firebase RTDB (register → login → main menu → mulligan → play a minion → AI responds →
  concede), 0 console errors.
- **Current state (2026-08-20):** typecheck **365** (TS2304 at **0**, and gated in CI),
  **1,366** unit tests, **25** advisories, data_access integration at **493 / 575**.
  CI gates: lint + `format:check` + `check:promise-utils` + `check:bluebird-orphans` +
  `check:undefined-names` + `check:turbo-env`, unit, `integration:misc`, `integration:jobs`, build.
  Tooling is oxlint + oxfmt (shared config in `tooling/oxlint-config`) orchestrated by turborepo.
- **What follows is the record of how each item was closed**, kept because most entries carry a
  lesson that cost real time to learn. The genuinely-open work is listed at the end under
  "Actually next".
  1. ~~`redis` 2 → ioredis~~ **DONE**, ~~drop bluebird~~ **DONE**, ~~replace kue~~ **DONE**
     (BullMQ). bluebird, redis@2, kue and warlock are all gone from the tree.
  2. **TS2304 is CLEARED: 73 → 0** (2026-08-20). Treating "Cannot find name" as a bug list
     rather than typing noise found **26 real defects** across SDK, client, server, worker and
     AI. They survived because eslint's `no-undef` is off for `.ts` (as typescript-eslint
     recommends, since TS covers it) — so TypeScript is the _only_ thing that sees an undefined
     identifier, and its output sat unread in a ~2,900-error backlog.

     Highlights: `moment` never required, so every login-achievement job threw; `Errors` never
     required, so "game not found" surfaced as a ReferenceError instead of a 404 (verified fixed:
     `shareReplay` now rejects with `NotFoundError`); three SDK gameplay bugs, including
     `modifier.createContextObject` writing to an undefined `cardData`; `GameLayer` assigning an
     undeclared `referencedCard` on the path taken whenever an inspected card references another;
     both shop dialogs reading `response` inside a `catch (err)`, so the error handler itself
     threw; `App.getIsShowingMain()` referencing two view classes it never required; and
     `GradientColorMap.clone()` constructing a **ToneCurve** — a copy-paste from the sibling
     action, where every other action clones its own class.

     Some were upstream bugs present since the 2016 dump (`= m` for `= map` in sync, the `target`
     scoping in `modifierDealDamageWatchKillTargetAndSelf`, `cardData` in modifier), some were
     ours from decaffeination, and two dead AI functions referencing names defined nowhere were
     deleted rather than left as permanent errors.

     **Not every TS2304 was a bug, and the distinction mattered.** `TelemetryManager`,
     `NewPlayerManager`, `kongregate`, `grecaptcha` and the `ai_*` debug hooks resolve at runtime
     because the boot files assign them to `window`. Those are declared in
     `app/types/globals.d.ts` rather than "fixed", specifically so the next genuine undefined
     identifier shows up as TS2304 instead of being lost among them.
     `app/tools/FileSaver.min.ts` (vendored, minified) is excluded from typecheck.

     Two gaps deliberately catalogued rather than guessed at: `quests._setQuestProgress` tested a
     `gameSessionData` no caller supplies (now an explicit null-guarded parameter, so it is a
     no-op instead of a crash that failed the whole quest update), and `sync.ts` read a
     `referralCodeRow` that never existed — CoffeeScript's `?.` made it silently undefined, so the
     `referral_events` cleanup has never run and those rows are orphaned.

  3. **TS2339 + TS2794 swept: typecheck 2,960 → 436** (2026-08-20), an 85% reduction.
     TS2339 2,467 → 175, TS2794 128 → 0. Unlike the TS2304 pass, these were **not** bugs —
     they are TypeScript failing to see shapes that are correct at runtime, so the fix is
     annotation, never code.

     Three diagnostics-driven codemods, all **type-only, emitting no JavaScript**:

     | codemod                          | what                                                            | count            |
     | -------------------------------- | --------------------------------------------------------------- | ---------------- |
     | `annotate-empty-object-bags.mjs` | scratch objects built up field by field → `Record<string, any>` | 159 declarations |
     | `declare-class-members.mjs`      | initClass-era statics and prototype defaults → `declare`        | 45 members       |
     | `promise-void-type-arg.mjs`      | `new Promise(...resolve()...)` → `new Promise<void>`            | 116 promises     |

     **All three read the compiler's own output rather than sweeping the repo.** A blanket sweep
     would also silence the places where TypeScript infers a real shape and would have caught a
     genuine mistake — which is the whole reason the TS2304 pass was worth doing. Each reports
     what it could not resolve and leaves it alone: 7–9 receivers that were not plain literal
     declarations, and 0 promises with mixed `resolve()`/`resolve(x)` (which `<void>` would
     mistype).

     **Why `declare` and annotations rather than class fields** is load-bearing here, not
     stylistic: a real class field creates an OWN property on every instance, and in this codebase
     an object's own enumerable properties **are** the wire format for game state and replays
     (AGENTS.md). Verified every step against the wire-format round-trip and golden key-set
     fixture, and confirmed by diff that every changed line is an annotation.

     **TS2554 read individually, 145 → 75.** This was the one worth reading rather than
     silencing, because a genuinely missing argument _is_ a bug. The verdict: **almost none were.**
     They are overwhelmingly signatures that lie about optionality, in three spellings —

     - decaffeinate's rendering of CoffeeScript default parameters
       (`if (allowUntargetable == null) { allowUntargetable = true; }`), 168 parameters;
     - pass-throughs, where the default lives one level down: the SDK attribute getters hand
       `withAuras` to `getBuffedAttribute`, which defaults it;
     - `const NOW = systemTime || moment.utc()`, the data_access house style, ~81 functions.

     **Two codemod rules were written and then deliberately narrowed after inspecting their
     output.** Accepting any `param || X` as evidence of optionality marked 128 parameters to
     fix 5 errors and produced `setIsDeveloperMode(val?)` — a bare `||` is falsy-tolerance, not
     optionality (`const limit = maxCount || 100` says nothing about `maxCount`). Requiring the
     fallback to be a `moment()` call gives 28 signatures, every one provably right. The same
     restraint applies to the pass-through rule, whose sinks are an explicit allowlist read by
     hand. A codemod broad enough to clear TS2554 entirely would be broad enough to hide the
     real arity bug this pass existed to find.

     **Catalogued, not fixed — a currency audit-trail gap.** `giveUserGold` records its
     `sourceId`; `debitGoldFromUser`, `giveUserSpirit` and `debitSpiritFromUser` all accept the
     same parameter, document it ("Which object did this spirit come from?"), and then never use
     it. So the ledger records where gold _credits_ came from but not debits, and nothing for
     spirit. Writing it through would need a schema check, so it belongs in a correctness pass
     rather than a typing one.

     The remaining 366 are heterogeneous and want per-case judgement: 175 TS2339 on function
     objects and narrowed types, 75 TS2554, 35 TS2345, 23 TS2403. Move directories into `tsconfig.strict.json` as they go clean.

  4. **data_access suites revived — now 493 of 575 passing** (2026-08-20; first pass took it
     from 0 to 402 of 506, and the total grew as blocked files started collecting). They had been
     unrunnable for so long that nobody knew what was in them. **Run them with
     `source scripts/dev/data-access-test-env.sh`**, which stands up a throwaway Postgres and
     Redis and points Firebase at the local emulator — deliberately separate from
     `docker compose`, because these suites create users and wipe inventories and must never
     touch the database you play on.

     What was stale, and what was actually broken:

     - **API drift** — `createNewUser(email, username, …)` lost its email parameter (Firebase owns
       email now) and `userIdForEmail` was replaced by `userIdForUsername`. 32 calls and 17
       renames, codemodded from the suites' own email→username pairs.
     - **`_chainState` shadowing, ours** — the bluebird `.bind()` migration gave nested callbacks
       their own `const _chainState = {}`, hiding the outer one, so the "user already exists"
       path returned `undefined` and later died in `wipeUserData` on `userId.blue`. 9 sites, 6
       files. **Production code was checked and is clean** — this only survived in the suites
       because they were not running.
     - **A LIVE BUG the suites caught: `knex.insert()` with no values**, in
       `gauntlet.buyArenaTicketWithGold` and `rift`'s equivalent. Both build a
       `userCurrencyLogItem` and never pass it. knex 0.19 treated an argument-less insert as a
       silent no-op — so the currency-log row was simply never written — but **knex 3 rejects it
       with "The query is empty", which turned a missing audit row into a broken purchase**. This
       is fallout from the knex upgrade that my verification missed because it never exercised a
       gauntlet or rift ticket purchase. Upstream had the same bug.
     - **`crypto.createCipher` in `decks.hashForDeck`** — removed in node 22, and we run node 24.
       Not a live outage: its only two call sites are commented out and no deck hash is persisted.
       Moved to `createCipheriv` with a deterministic key/IV.
     - **A stale test expectation** — the emote migration grants a _fixed historical_ set (the
       emotes that existed before the 2016-07-08 cosmetics patch), but the test derived its
       expectation from `SDK.CosmeticsLookup.Emote`, which has grown from 66 faction emotes to
       198 since. It demanded 126 while the migration correctly granted 60. The list is now
       exported as `EMOTE_IDS_PRE_COSMETICS_20160708` and asserted against directly.

     **Second and third passes: 493 of 575 passing.** The total grew from 506 because
     `cosmetic_chests.js` was dying in a malformed `beforeAll` before collecting any of its 69
     tests. Further fixes:

     - **15 data_access functions were using TWO state bags** — the `.bind(this)` migration left
       both a `_chainState` and a `this_obj` in the same function, with a value written to one and
       read from the other, so the read was always `undefined`. Found by property-level analysis
       (written on one / read from the other), _not_ by "declares both": 43 functions declare
       both and only 15 genuinely cross. Affected `shop.premCurrencyPrice` (real-money purchase
       pricing), `rank.seasonStartingAt`/`timeout`, `rift` (six properties in one function),
       `cosmetic_chests.giveUserChest` (resolved undefined to every caller), `inventory.orbCountKey`,
       `gift_crate.crateId`, `users.rewards`.
     - `collection.ts` called `Logger.module('INVENTORY')(...)` — invoking the module object
       rather than a method. It runs fire-and-forget on every user creation, so it only ever
       surfaced as an unhandled rejection.
     - `beforeAll('description', fn)` in `cosmetic_chests.js` is mocha's signature, not vitest's;
       the file died before running anything. It was a test the conversion turned into a hook.
     - `achievements.js` and `shop.js` are entirely commented out; they now carry `describe.skip`
       stubs so a deliberate decision reads as SKIPPED rather than "No test suite found".

     **Third pass — the undefined-value cluster, five more production bugs.** A second
     `.bind(this)` artifact, distinct from the two-bag one: code reading `_chainState.X` where
     **X is never assigned**, and in two cases the name is the function's own PARAMETER which the
     codemod had prefixed with the bag.

     - `rank.updateUsersRatingsWithGameOutcome` read `_chainState.gameId`/`.player1Id`/
       `.player2Id` — all parameters — so every Firebase write became `.child(undefined)` and
       threw. **Rating updates after a game could not complete.**
     - `inventory.buyBoosterPacksWithGold` read `_chainState.cardSetData`, which lived in a
       separate bag, so `.orbGoldCost` threw and **buying boosters with gold failed outright.**
     - Latent: a boss-chest guard reading a progression row it never loaded; a `purchaseId`
       whose assignment upstream had been commented out (decaffeination resurrected only the
       `return`); and `sync` reading an `authUser` that never existed upstream either.

     **The detector nearly caused a bug of its own.** Its first version flagged both `disenchant`
     functions, whose chain state _is_ populated wholesale by `_.extend(_chainState, data)` — a
     blanket "never assigned" rule would have had me "fix" working code. Accounting for bulk
     population dropped those two false positives.

     **And one regression shipped, which is why TS2304 is now a CI gate.** The two-bag merge
     codemod removed a `this_obj` declaration in `gift_crate.ts` and left one _write_ behind, so
     `unlockGiftCrate` threw `this_obj is not defined`. `pnpm typecheck` reported it the whole
     time as TS2304 — the count swept to zero earlier _precisely so a new one would stand out_ —
     but lint and the unit suite ran after the codemod and typecheck did not. It is now enforced
     by `pnpm check:undefined-names`; only TS2304 is gated, not the rest of the backlog.

     **The remaining 80 are two kinds, and worth separating:**

     1. **Stale game-balance expectations (the majority).** Hardcoded 2016 numbers the data has
        moved past — emote counts (126 vs 60), disabled card sets (Bloodborn), spirit costs
        (a common cost 40 to craft, now 20). Production is correct in every case examined; the
        fix is deriving expectations from the SDK, which has to be done per test.
     2. **A smaller set that is NOT stale data** and deserves a look: Firebase writes with
        `path = "undefined"` in `rank`, knex 3 rejecting undefined bindings, and a `rift`
        upgrade path that reaches Postgres with `NaN` where the test expects a `BadRequestError`.
        These smell like the same undefined-value family as the two-state-bag cluster.

     Still not wired into CI — that needs the suites green, or CI starts red.
  - **Correctness pass done (2026-08-20).** That list is now closed, and two of its entries were
    already stale: the "8 latent `server/lib` bugs" from 6.2c were TS2304s, cleared in the typing
    pass, and the 6 SDK `require`s were fixed when they were found. What remained:

    - **`GET /api/me/rank/` — REMOVED, not repaired.** It queried `user_rank`, a table no
      migration creates, so it always 500'd. It also did
      `var challengeRows = DataAccessHelpers.restifyData(challengeRows)` — passing the variable
      to its own initializer — then discarded the result and returned the raw rows. The
      quest/challenge variable names show it was copy-pasted from another route, and no client
      calls it (the client POSTs to `/api/me/rank` and GETs the sub-routes). Now 404 instead of
      500; POST and the sub-routes verified unaffected.
    - **The `referral_events` cleanup in `wipeUserData` — REMOVED.** Dead twice over: it read a
      `referralCodeRow` that was never defined, _and_ targeted a `referral_events` table that
      **does not exist** (the schema has `referral_codes`, `user_referrals`,
      `user_referral_events`, and the latter two are already deleted a few lines above).
      **Correction:** an earlier note in this file said the cleanup "has never run and those rows
      are orphaned". There are no orphaned rows, because there is no such table. Noted for a
      future product decision, not a bug: `wipeUserData` does not clear the user's own row in
      `referral_codes`, and since this is a QA-only reset path, a stable referral code across
      resets may well be intended.
    - **`sourceId` on the currency API — documented, not wired up. CORRECTION.** The previous
      commit claimed `giveUserGold` records its `sourceId` while its siblings drop it. That is
      wrong: the "use" I counted was the JSDoc of the _next_ function. **None of them record it**,
      `user_currency_log` has **no source column at all** (only `user_card_log` and `user_rewards`
      do), and `giveUserSpirit` does not even declare the parameter. So it is vestigial across the
      whole currency API rather than an audit-trail inconsistency. With 59 call sites and zero
      behavioural difference, removing it is churn; instead the JSDoc now says it is unused and
      why, and the parameter is optional so callers are not forced to pass a value that goes
      nowhere. Verified afterwards that gold and spirit still credit correctly end to end.

- **Tooling program (2026-08-20), user-directed, running ahead of the list below:**
  1. ~~eslint → oxlint on a shared workspace config~~ **DONE** (`2e52efad`)
  2. ~~oxfmt owns formatting; every earlier style config removed~~ **DONE** (`4d5763b4`,
     blame-ignored in `b23f259c`; the last holdout, `packages/chroma-js/tslint.json`, went
     with step 3)
  3. ~~per-package scripts + turborepo orchestration~~ **DONE** — this step
  4. ~~pnpm catalog for dependencies shared across packages~~ **DONE** — a short list on
     purpose (only 3 deps were genuinely shared), but it caught a real one: the vendored
     `Backbone.VirtualCollection` declared `backbone@1.2.1` and `underscore: "*"` (→ 1.6.0, 2014) and shipped both of its own copies inside `duelyst.js` beside the app's.
     Collapsing them cut ~203 KB. `typescript`/`vite` are catalogued too so chroma-js and
     desktop declare what their own build scripts run. Verified with the e2e practice game.
  5. **folder reorg**, last and only where safe: `app/sdk` + `app/common` out of `app/`,
     which is also what unblocks per-package `typecheck`/`test`. Blocked on a plan for
     `generate_packages.js` (it text-parses the card factories) and the RSX paths.

- **ACTUALLY NEXT — the genuinely open work, in rough value order:**

  1. ~~Fix the rift `NaN`~~ **DONE (2026-08-21).** It was not a bad input: rift's upgrade-choice
     generator was offering card sets that hold no cards. `Bloodborn` has 0 cards and is flagged
     disabled in this build, `Unity` has 0 as well, yet both were sampled — roughly a third of
     the weight went to pools that could only come back empty. Indexing an empty array gives
     `undefined`, `getBaseCardId(undefined)` is `NaN`, and the dedupe loop let it straight
     through because `NaN !== null` and `_.contains(list, NaN)` is always false. The `NaN` then
     reached Postgres inside `card_choices` (`int4[]`). With six slots drawn per upgrade, the
     overwhelming majority of attempts hit at least one — **rift card upgrades were effectively
     dead in production**, not merely failing a test. Fixed at both levels: only sets that
     actually hold cards are offered, and the picker returns `null` rather than `NaN` so an
     empty pool resamples instead of poisoning the row. The rift suite went 11–12 failures → 0.

  2. ~~The data_access suite is flaky~~ **DONE (2026-08-21).** Three consecutive fresh-database
     runs now give an identical **59 / 59 / 59**, down from 70 / 70 / 71. Four causes, all
     different: unseeded `Math.random` in the chest and inventory suites (now
     `test/helpers/seeded_random.js`); `users updateGameCounters` firing ~25 concurrent
     read-modify-writes at the same rows through an unbounded `PromiseUtils.map` (now
     `{ concurrency: 1 }`); a `SELECT` with no `ORDER BY` whose result was indexed positionally;
     and the rift cascade above. **The suite is now reproducible, which is the precondition for
     making it a CI gate.**

  3. **Finish the data_access tail (51 stable failures, plus 2 quarantined as unstable).** ~~and wire the suites into CI~~ —
     **wired 2026-08-21** as a `data_access_tests` job that gates on drift rather than on green:
     `scripts/check-data-access-baseline.mjs` compares the failing set against
     `known-failures.txt` and fails if a passing test starts failing, or if a known-failing test
     starts passing without the list being shrunk. The list can only go down.
     The remaining work is the tail itself, overwhelmingly stale 2016 game-balance expectations
     — inventory asserts a booster pack costs 100 gold while the SDK says
     `defaultOrbGoldCost = 50`; a catch-up quest asserts 100 where the code gives 50. There are
     ~670 hardcoded numeric assertions across these suites, and deriving them from SDK data is
     the fix that stops this recurring. Each one removed is a line deleted from the baseline.
     **Correction to the determinism claim made the same day:** the suites are deterministic
     given a fresh Postgres _and a fresh Firebase emulator_ — five consecutive runs under
     exactly the CI condition gave an identical 59. The earlier "59 / 59 / 59" was measured
     against a long-lived emulator, which masked two rare flakes (each seen once in roughly
     eight runs). Both are in `known-unstable.txt`, excluded from the gate in both directions,
     and recorded as debt rather than as fixed.
     The suites are also **not idempotent**: re-running against a database they have already
     written to flips three inventory tests, because `wipeUserData` does not reset everything
     they assume. CI gets a new service container per run, which is the condition they need —
     never diagnose a failure here by re-running against a persistent database.

  4. **Decide on `pnpm.overrides` for the transitive backbone pin.** `backbone.babysitter` and
     `backbone.wreqr` (deps of marionette 2.2.2) still pin `backbone@1.2.1`, which a catalog
     cannot reach. Small, but it is the last version skew left in the tree.
  5. **Optional, deliberately not started:** Backbone/Marionette/jQuery. That is a UI rewrite,
     not an upgrade, and was declined once already.

- **Known dirty state:** none.

## Rules

1. Every step lands as **one commit** on `modernization` (or a branch stacked on it).
2. Every commit leaves the acceptance baseline green: `FIREBASE_URL=https://test-url.firebaseio.com/ pnpm build && pnpm test:unit` — plus any step-specific criterion below.
3. pnpm only. Never yarn/npm. No big-bang rewrites; codemods over hand-rewrites.
4. When a step completes: tick it here and update the status log in `AGENTS.md` in the same
   commit. Record hashes of _prior_ commits only; a step's own entry says "(this commit)" —
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
      _Accepted:_ vitest 1285/1285 == mocha 1285/1285 on the subtree; full gate green. — (this commit)
- [x] 1.2 Remove mocha-isms/dead weight from `test/unit`. Reality was smaller than the audit's
      repo-wide counts: within `test/unit` the only `this.timeout`/`done` usages were inside
      commented-out code. Done: deleted `test/index.js` (stale aggregator requiring non-existent
      dirs) and `test/unit/session/index.js` (0 active tests) + its `test:unit:session` script;
      codemod `scripts/codemods/remove-dead-test-imports.js` stripped the 15 never-used
      `require('sinon')` imports from integration files; dropped `sinon` + `power-assert`
      devDependencies. The real `this.timeout`/`done` debt lives in `test/integration` (`test/rest` deleted in 7.3)
      → handled in 7.1/7.2.
      _Accepted:_ mocha 1287 + vitest 1285 green; gate green. — (this commit)
- [x] 1.3 vitest covers all of `test/unit` (101 files); `unit_tests_vitest` CI job added beside
      the mocha job in `unit_tests.yaml`.
      _Accepted:_ vitest 1287/1287 == mocha 1287/1287 on `test/unit`. — (this commit)
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
      _Phase 2 accepted:_ fresh dependency scan confirms `app/sdk` + `app/common` have **zero**
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
      _Accepted:_ gate green (mocha+vitest 1300, in-container 1300, build, lint); `pnpm api`
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
      _Accepted (the gate):_ against a REAL Firebase RTDB — registered an account, logged in,
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
- [x] 5.2 Declarative modifiers & spells via scripted decaffeinate (superseded by 5.2a-c; **0 `.coffee` remain**):
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
      _Accepted:_ mocha+vitest 1300 (wire-format guards green), both builds, packages manifest
      verified, in-container 1300, browser boot to login screen (0 errors). — (this commit)
- [x] 5.5b All 25 remaining client-layer coffee files: `application`, `index`, `register`,
      `networkManager`, `app/common/*` (session2 needed a one-line `super()` — CS allowed
      super-less subclass constructors), `data`, `localization/index`, shader generator, replay,
      editor, profile model, view helpers. **`app/` is now 100% CoffeeScript-free.** Vite entry
      paths updated to `.js`. — (this commit)
      _Accepted:_ mocha+vitest 1300, both builds (packages manifest verified), lint green,
      browser boots to login screen (0 errors). Remaining coffee: server/worker/cli/scripts (178
      files) → Phase 6.

### Phase 6 — Server: build step + TS

- [~] 6.1 Reframed: no TS on the server yet (JS-first policy while gulp lives), so no build
  step is needed — the server now runs plain JS directly. A tsx/tsc build lands with the
  TS rename pass.
- [x] 6.2 (done via 6.2a-d; **0 `.coffee` remain**) Convert in order: `server/redis/` → `server/routes/` → `server/lib/data_access/` →
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
      handling. Two traps hit and fixed: `this` on the _right_-hand side must be rewritten too
      (`this.prototype.getTarget = this.prototype.getCard`), and `Foo.initClass();` call sites can
      carry trailing comments.
      _Upstream bug preserved, not fixed:_ `modifierImmuneToDamageOnEnemyTurn`'s **static** type is
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
      than removing the wrappers, because `Array.from` _snapshots_ the collection and the engine
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
      _Accepted:_ mocha 1300 + vitest 1300 + build (manifest 2795) + lint green; all four images
      rebuilt and booted; browser loads the main menu with **0 console errors** and shaders
      rendering. — (this commit)
- [x] 5T.2d **`server/` and `worker/` are TypeScript** (241 files). `require-dir` keeps
      autoloading routes and middleware because tsx registers `.ts` in `require.extensions`.
      Deliberately left as `.js`: the 86 knex migrations (append-only history, loaded by the knex
      CLI) and `server/knexfile.js` (read by that CLI outside our loaders).
      _Accepted:_ mocha 1300 + integration:misc 13 + lint + build green; all four images rebuilt;
      api serves (200 `/`, 200 `/healthcheck`, 401 from the JWT-guarded route → the whole route
      tree registered), game/sp/worker boot; **played a practice game against the TypeScript SP
      server** — game created, mulligan confirmed, turn ended, AI responded (steps 2→8), 0 console
      errors. — (this commit)

**The stack conversion is complete**: CoffeeScript → JS → TypeScript across client, SDK,
server and worker. What remains is _typing_ (5T.4), not converting.

- [~] 5T.4 Incremental typing: drive `pnpm typecheck` to zero, then move directories from
  `tsconfig.json` into `tsconfig.strict.json`.

  **Progress: 5,503 → 3,081 errors (−44%).** Measured first rather than grinding file by file:
  **93% of all errors were TS2339** ("property does not exist"), and most of those came from two
  systemic patterns rather than from real type problems:
  - `const CONFIG = {}` in `app/common/config.ts`, followed by ~600 property assignments —
    **605 errors from one declaration**. Annotated `Record<string, any>`: it is a mutable global
    bag by design, and inventing 600 field declarations would be noise rather than safety.
  - `const _chainState = {}` — **83 declarations across 15 files, 1,817 errors**. These are the
    scratch objects the promise-chain codemod introduced when it replaced bluebird's
    `.bind(this)` state passing, so they are per-chain bags by construction.
    `scripts/codemods/annotate-chainstate.mjs`.

  Both are type annotations only — erased at runtime, no behaviour change, suite unaffected.
  **Then the class-field pass: 3,081 → 2,684.** 12 files still used decaffeinate's
  `static initClass()`, assigning ~68 defaults onto `this.prototype`, which TypeScript cannot see
  on instances. Declared with `declare X: any;` via
  `scripts/codemods/declare-prototype-props.mjs`.

  **`declare` and not a class field, deliberately.** These are PROTOTYPE defaults and that is
  load-bearing: the SDK's serialization is structural, so an object's own enumerable properties
  _are_ the wire format for game state and replays. A class field would create an own property on
  every instance and silently change what gets serialized. `declare` is type-only and emits no
  JavaScript. Verified with the wire-format fixtures (11 tests) rather than assumed, and the whole
  diff is nothing but added `declare` lines.

  **Then the two categories that could hide real bugs were triaged — and they split cleanly:**

  - **TS2304 "cannot find name" — REAL. Six missing `require`s in SDK card logic**, each of which
    would throw `ReferenceError` if its branch executed:
    `PlayCardAction` in `modifierMyAttackWatchSpawnMinionNearby`,
    `modifierMyAttackOrAttackedWatchSpawnMinionNearby` and `modifierTakeDamageWatchSpawnEntity`;
    `ModifierDyingWishSpawnEntity` in `modifierOnDyingSpawnEntity`; `CardType` + `DamageAction`
    in `playerModifierManaModifierNextCard`; `UtilsJavascript` in `spellEssenceSculpt`.
    **All are upstream bugs**, absent from the original CoffeeScript too — and the sibling
    `modifierDyingWishSpawnEntity` requires `PlayCardAction` correctly, which is what makes these
    omissions rather than design. Unreachable with today's card definitions (`spawnSilently`
    defaults to `true`, so the broken branch never runs), which is how the game shipped — but a
    single new card passing `spawnSilently: false` would hit it. Fixed; adding a `require` cannot
    change behaviour, and the affected cards were confirmed to still construct.
  - **TS2554 "wrong argument count" — NOT bugs, on inspection.** Overwhelmingly optional
    parameters that were never marked optional: `pushEvent(event, options)` explicitly does
    `if ((options == null))`, so 1-argument calls are correct by design. The rest are harmless
    redundant arguments, e.g. `popCardFromStack(card)` where the method pops the stack and ignores
    its parameter. Marking these `?` is annotation tidying, not bug fixing.

  **`unknown` errors: 190 → 0 (2,676 → 2,484).** Triaged expecting real bugs at data boundaries;
  **found none.** Every one traced to a bare `Array.from(x)`, which infers `unknown[]`, making the
  loop variable `unknown` so each property access in the body errors — which is why they reported
  on body lines, not on the `Array.from` line. decaffeinate emitted this inconsistently: 834 sites
  already carried `<any>`, 194 did not. Codemod: `scripts/codemods/array-from-any.mjs`. Plus one
  `Object.values(Cards.Boss)` in `worker/jobs/rotate-bosses.ts`.

  **Be clear about what that bought: consistency, not safety.** `<any>` silences rather than
  describes. Real typing at these boundaries means defining interfaces for the data crossing them
  — game session data, knex row shapes — which is where actual bug-catching would come from, and
  is a much larger separate exercise.

  What remains (2,484) is the same shape: ~1,392 bare `{}` locals, `RedisPlayerQueue` 53, and
  ~143 optional-parameter annotations. None of it looks bug-bearing — **the two categories that
  could hide bugs (TS2304, TS2554) are triaged, and the one real haul was the six missing
  requires.**

- [x] 5T.3 Replace the tsx require-hook with a real build for production images (the hook
      compiles on every boot; fine for dev, wasteful for prod). **Measured first:** a cold
      container took **4,578 ms** to reach `/health` and wrote a **13 MB** tsx cache into `/tmp`;
      a warm restart took ~880 ms, so the hook was the difference. Now **~900 ms cold, no cache**.
      `scripts/build/build-server.mjs` transpiles 1,647 files in ~0.5 s (esbuild, transpile-only,
      handed the real tsconfig so `useDefineForClassFields` cannot drift — instance layout is the
      wire format) and mirrors the source tree into `build/` so root-absolute requires resolve
      unchanged. `bin/_bootstrap.js` replaces five near-identical entrypoints and registers the
      hook only when `.ts` is on disk, so dev is untouched.
      **The e2e suite earned its keep again:** the api served a 404 for `index.html`, because
      `__dirname + '/../../dist/src'` is `build/dist/src` once the tree gains a level. Paths
      _inside_ the mirror were fine; the eight reaching `dist/` and `public/` were not, and now
      resolve from `server/lib/project_root`. No unit test could have seen this.
      Migrations stay on the source path deliberately: once per deploy, not once per boot.

### Phase 6b — post-conversion correctness (found by playing the game)

- [x] **The quest system was entirely dead, and it was OUR regression — not upstream.**
      `QuestParticipationWithFaction`'s constructor resolved its faction from
      `QuestParticipationWithFaction.prototype.factionId`, which is always `null`.
      `factionForIdentifier(null)` returns `console.error(...)` — i.e. **undefined** — so
      `faction.short_name` threw a `TypeError`. Building those quests is the **first** thing
      `QuestFactory._generateQuestCache` does, in an unguarded loop, so the throw took the whole
      cache with it: **no participation quests, no win quests, no daily quests, for every player.**

  The plan previously described this as a "faithfully preserved latent bug" from the
  CoffeeScript that merely produced a wrong quest _name_. **Both halves of that were wrong.**
  The original was `constructor:(id,typesIn,reward,@factionId)->`, where `@factionId` in the
  parameter list assigns `this.factionId` at the top of the constructor; CoffeeScript 1.x
  compiled `super` to a plain `__super__.constructor.call(this)`, so `this` was usable before
  it and the read saw the real faction id. ES6 forbids `this` before `super()`, and the
  hand-conversion reached for the prototype default instead. Upstream shipped with working
  quests.

  Fixed by using the constructor argument, which is what the CoffeeScript did. Evidence:
  `_questCache` goes from **0 quests (threw) to 49**; the `factionForIdentifier - Unknown
faction identifier: null` line the e2e suite had allowlisted **is gone, and the allowlist
  entry with it**; and `test/integration/data_access/challenges.js` goes from 2 failures with
  `ERROR PROCESSING QUEST DATA` to **9/9 passing**.

  There was **no quest coverage in the suite at all**, which is why 1,316 passing tests never
  saw it. `test/unit/sdk/progression/quest_factory.js` now covers it — verified to fail 5/5
  with the bug reintroduced.

- [x] 6b.1 **Promise-chain state**: CoffeeScript thin-arrow `.then` callbacks compiled to
      sloppy-mode functions where `this` was the _global object_ — the original code passed state
      between chain steps through accidental globals (shared across concurrent requests!).
      decaffeinate faithfully emitted `this.x`, which inside ES6 class bodies is strict-mode
      `undefined` → `TypeError` at runtime. Surfaced as a 500 on `/session` right after a
      successful registration. Codemod `scripts/codemods/fix-then-this.mjs` (AST-based, only
      rewrites `this` inside callbacks passed to promise combinators) scoped **1,531 references
      across 15 files** to a per-call `_chainState` object — fixing the crash _and_ the latent
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
      out-of-date i18n keys) and `generate_invite_codes`.
      **`scripts/add_index` was later deleted** (see 8.3), and in 9.5 the rest of these went too —
      measured rather than assumed, they were all dead. `generate_invite_codes` was kept here as
      "worth having"; it never ran.
      **Dropped as unfixable:** `delete_user`, `find_user`, `find_userid_by_name` — all three
      `require('server/lib/users_module')`, which has never existed in this repo (it was in the
      audit's unresolved list); they cannot ever have run.
- [x] 8.2 Toolchain removed with it: `coffeelint.json`, the `lint_coffeescript` workflow, the
      `coffeescript` + `@coffeelint/cli` dependencies, the `lint:coffee*` scripts, Vite's
      CoffeeScript plugin and `.coffee` resolution, the `coffeescript/register` calls left in
      8 test/server/script files, and 9 dependencies only the deleted ops used. — (this commit)
- [x] 8.3 Deleted `scripts/add_index.js` — the only legacy script with Firebase tokens
      inlined. (I described its three siblings as safely reading `config.get('firebaseToken')`;
      **that config key does not exist**, so they crashed too — see 9.5, where they were deleted.) The tokens date to
      upstream commit `12b49376` (2022-03-29, "init repo with initial source dump") and are
      public in `open-duelyst/duelyst`, so nothing was newly exposed — but 8.1's decaffeinate
      pass rewrote `add_index.coffee` to `.js`, and GitGuardian counts a known secret at a new
      path as a new incident. **Audited at the same time: `.env` and `serviceAccountKey.json`
      have never been committed** (0 commits touch either across all refs, and no
      credential-shaped path exists in any object in history). — (this commit)

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
- [~] 7.2 **Measured properly (2026-08-19). The earlier note below was wrong about the
  blocker: it is NOT the Firebase decision.** Full `pnpm test:integration` run in the
  `test-integration` container against compose Postgres/Redis + the real RTDB, peeling one
  layer at a time. Four distinct causes, only one of which is about credentials:

  1. **mocha hooks (FIXED, 77697ea2).** 14 of 23 files died at import with
     `ReferenceError: before is not defined` — vitest has no bare `before`/`after`. A
     regression from 7.1's mocha retirement, invisible because CI only runs `misc` and
     `misc` happens to have no such hooks. Registered tests went **19 → 525**.
  2. **referral-code seed (mechanical).** `INSERT INTO referral_codes (code, is_active)
VALUES ('kumite14', true)` after migrate clears it, as previously documented. Needs to
     become a real seed script for CI.
  3. **~4 years of test rot (the actual blocker).** The `data_access` + `achievements`
     suites are written against an auth API upstream deleted: they call
     `UsersModule.userIdForEmail()` (removed by upstream `4dfebc3b`, 2022-10-12) in 18 files,
     and pass an EMAIL as the first argument to `createNewUser`, whose signature has long
     been `(username, password, inviteCode, referralCode, campaignData, registrationSource)`.
     The email lands in the `username` slot and Firebase rejects it —
     `child failed: path argument was an invalid path = "unit-test@duelyst.local"` — because
     RTDB keys cannot contain `.`. **This is a test rewrite, not a config fix.**
     _Verified salvageable_: modernizing just those two calls in `challenges.js`
     (`createNewUser('unittest','hash','kumite14')`, `userIdForUsername`) took it from
     0 running to **7 passing / 2 failing**, the 2 being a real `ERROR PROCESSING QUEST DATA`
     worth investigating on its own (possibly the same quest bug the e2e allowlists).
  4. **5 files disabled upstream** (`achievements/*`, `data_access/{achievements,shop}`) are
     commented out at the top and fail as `No test suite found`. They need excluding from the
     vitest `include`, not fixing.

  **`firebase` runs in CI, against its own database.** ✅ A dedicated Firebase project
  **`duelyst-ci`** (project number 265598851007) with RTDB
  `https://duelyst-ci-default-rtdb.firebaseio.com/` was created for this, so CI never touches
  `duelyst-universe` — which matters because the suite writes to a fixed `/test-ref-server`
  path that concurrent runs would race on. The four repo secrets (`FIREBASE_URL`,
  `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`) are set from a
  service-account key for `firebase-adminsdk-fbsvc@duelyst-ci.iam.gserviceaccount.com`.
  Verified by dispatching the workflow: the step went from `skipped` to green, and the row it
  wrote was read back out of the CI database independently.
  The step stays gated on `env.FIREBASE_PROJECT_ID != ''` so PRs from forks — where GitHub
  never exposes secrets — skip it rather than failing on a contributor's PR.
  RTDB rules are left at the default `auth != null`; the suite authenticates as a service
  account, and admin credentials bypass rules, so there is no reason to open the database.

  _Provisioning notes, if this ever needs redoing:_ `firebase database:instances:create`
  refuses to create a project's FIRST instance ("run firebase init database"), and
  `firebase init database` cannot run non-interactively because the location prompt has no
  default. Both were sidestepped by calling the management API directly —
  `POST firebasedatabase.googleapis.com/v1beta/projects/<id>/locations/<loc>/instances`
  with `{"type":"DEFAULT_DATABASE"}`. The service-account key likewise came from
  `POST iam.googleapis.com/v1/projects/<id>/serviceAccounts/<acct>/keys`. Note the Firebase
  MCP's `firebase_init` writes local config ONLY — it enables the API but creates no instance.
  The `\n` footgun is gone: `duelyst_firebase_module` now un-escapes `\n` in the private key,
  so the same value works from Compose, a plain shell and an Actions secret alike (it was
  only Compose's `.env` interpolation that made this work before).

  _(Superseded note kept for history: the original spike claimed revival was "blocked on the
  Firebase decision below (owner)". Measurement shows credentials are not what blocks it.)_

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
  - [x] **`firebase-admin` 11.11.1 → 14.2.0** (advisories 148 → 128; its subtree went from
        **21 vulnerable paths to 1**). v14 is fully modular: the root export is now just
        `firebase-admin/app`, so `firebaseAdmin.credential.cert`, `firebaseAdmin.database.*`,
        `app.database()` and `app.delete()` are all gone. Rewritten against the subpath entries
        (`cert`/`initializeApp`/`deleteApp` from `firebase-admin/app`, `getDatabase`/`enableLogging`
        from `firebase-admin/database`) in the single seam `server/lib/duelyst_firebase_module.ts` —
        the only consumer in the repo. The CLASS API is unchanged, so all 352 `DuelystFirebase.connect()`
        call sites are untouched. Verified against the REAL RTDB, not just a build. — (this commit)
  - [x] **Tier 2 — COMPLETE.** Measured breadth first: `winston` 1 file, `knex` 1, `redis` 3,
        `kue` 9, **`bluebird` 215**. Every one is now done — winston 3, knex 3, ioredis, BullMQ, and
        bluebird deleted outright. The note that "`kue` … replacing it is a project, not an upgrade"
        was right, and that project was done (see the kue entry below).
    - [x] **`winston` 2.1.1 → 3.19.0**, and **`winston-papertrail` deleted**. `createLogger`
          replaces `new winston.Logger`, and per-transport `colorize`/`prettyPrint` became composable
          formats. The console overrides now format through `util.format`, which is what console.*
          actually does — winston 3 takes `(message, meta)` and would otherwise have swallowed every
          argument after the first into metadata.
          The Papertrail transport shipped every line to `logs.papertrailapp.com` (Counterplay's
          aggregator, gone with the shutdown) with **no credentials**, so it could only ever have
          failed; its package is unmaintained and winston-2 only, so it blocked the upgrade anyway.
          **This is opt-in** (`config.get('winston')` defaults false, no env file enables it), so it
          was verified by actually turning it on: multi-arg and printf formatting both behave like
          console.*, and the API boots to "started on port 3000" with every line routed at the right
          level. — (this commit)

      **Re-verified and given tests (2026-08-20).** Being opt-in means _nothing_ — not CI, not
      e2e, not normal development — ever executes this path, which is how it would rot unnoticed.
      Re-checked against the current tree (after bluebird, ioredis, BullMQ and the typing passes):
      all levels route correctly and the API still boots fully with `WINSTON_ENABLE=true`.
      `test/unit/misc/winston_console.js` (6 tests) now pins the behaviour, above all the arity
      fix — winston 3 takes `(message, meta)` and would fold every argument after the first into
      metadata, so `console.log('multi', 'arg', 42)` would silently lose two of them.

      `setup()` now returns its logger, so the test can swap the Console transport for a Stream
      it can read. Capturing `process.stdout.write` instead does not work: the test runner
      intercepts stdout itself and the two fight over it.

    - [x] `redis` 2.8 → **ioredis** — DONE, and the reasoning below is preserved because it is
          what led to choosing ioredis over node-redis v4. The objections were all real: v4 needs an
          async `connect()` where the seam exports a client synchronously, ~30 call sites lose their
          `*Async` wrappers, and `@counterplay/warlock` is handed our client and speaks redis-2
          callbacks. ioredis answered the first (it connects on construction), warlock was replaced
          by a ~40-line `r-lock.ts`, and the last objection — "redis@2 stays in the tree regardless
          because kue pins it" — stopped being true once kue was replaced by BullMQ. See the ioredis
          and kue entries above for what actually landed.
    - [x] `knex` 0.19 → **3.3.0** — DONE. Break surface measured first, and it was small.
          The gate was that knex <1.0 returned _bluebird_ promises, so query sites could chain
          `.bind`/`.spread`/`.error` directly. **The bluebird work removed all of those**, which is
          what actually unblocks this.

      | checked                                                                             | result                                         |
      | ----------------------------------------------------------------------------------- | ---------------------------------------------- |
      | migrations using the removed `Promise` 2nd arg                                      | **0** — all 83 use `function (knex)`           |
      | `.returning()` (postgres shape changed)                                             | **0 sites**                                    |
      | client name `postgres` / `postgresql`                                               | still aliased in knex 3 ✅                     |
      | Node engine                                                                         | knex 3 needs ≥16; we run 24 ✅                 |
      | bluebird methods on knex chains                                                     | **0** — the 9 `.error` / 13 `.bind` "hits" are |
      | `Logger.error` and `Function.prototype.bind`, the same pollution as everywhere else |
      | explicit `tx.commit`/`tx.rollback` (68/67)                                          | **NOT a break** — see below                    |
      | `.timeout` after a `.then()`                                                        | **18** — real work                             |
      | `knex.client.pool`                                                                  | **1 site, 5 calls** — real work                |

      **Correction to an earlier note in this file.** Stage 6 recorded that converting `.timeout`
      broke transactions _"because knex 0.19 is itself bluebird-based"_. Reading both sources,
      **knex 0.19 and knex 3 have byte-identical transaction auto-commit logic** — if the callback
      returns a thenable, knex commits it. So the explicit `.then(tx.commit).catch(tx.rollback)` is
      redundant in _both_ versions and is not a knex 3 break. The `Transaction query already
complete` failure was caused by the `withTimeout` wrapper changing what the callback
      returned; the precise mechanism was never isolated.

      **The real relationship is that `.timeout` must be converted _with_ knex, not before it**:
      knex 0.19 hands back bluebird promises, which _have_ `.timeout`; knex 3 hands back native
      ones, which do not. Of the 20 sites, **18 sit after a `.then()`** (a promise — must convert)
      and **2 chain directly off a query builder**, where knex 3 keeps its own `.timeout(ms)`.

      Remaining work is therefore: 18 promise-`.timeout` conversions, the `/health` pool stats
      (generic-pool `getPoolSize()`/`availableObjectsCount()` → tarn `numUsed()`/`numFree()`),
      and the upgrade itself.

      **What actually landed.**

      - **`.timeout` is gone from the runtime — 20/20 converted, 0 remain in `server/`+`worker/`.**
        The measurement's "2 chain directly off a query builder" was **wrong**: re-reading every
        removed line in the diff, all 20 sat after a `.then()`, a `.catch()`, a `Promise.all([...])`
        or a `Promise.resolve(fetch(...))` — i.e. all promise-position. Nothing needed knex's own
        builder `.timeout(ms)`, so nothing was restored. Same lesson as every other estimate in
        this file: the count was only right once read _in chain position_.
      - `Promise.TimeoutError` → `PromiseUtils.TimeoutError` (19 sites, 11 files), then those typed
        catches through the `onType()` codemod.
      - **The binding guard earned its keep again.** 9 files had `PromiseUtils` bound but used bare
        `onType()` — `scripts/check-promise-utils-bindings.mjs` caught all 9 before they could
        become the `ReferenceError`-at-runtime class of bug that motivated it. Fixed by adding the
        `const { onType } = require(...)` destructure, which is the convention in all 18 files that
        already bound it (0 files use `PromiseUtils.onType(`).
      - `poolStats` in `server/routes/public.ts` now **handles both pool implementations** (tarn
        `numUsed()`/`numFree()`/`numPendingAcquires()`, generic-pool `getPoolSize()`/…), and
        degrades to nulls instead of throwing on an unknown shape — `/health` is what a load
        balancer polls, so it must not 500 on a pool refactor. Verified returning real numbers on
        0.19 _before_ the upgrade and on tarn after it.

      **Verification** (the risk here was behavioural, not API-shaped — 714 query sites and 99
      transactions against a real database, which unit tests do not touch):
      1,325/1,325 unit · 13/13 `integration:misc` · lint clean (real exit code) · `pnpm build` ·
      86/86 migrations "Already up to date" against the compose Postgres · all 6 services boot ·
      `/health` correct on tarn · **`POST /session/register` → 200** (transactions + Firebase +
      converted timeout code) and login → token · 8 authenticated `data_access` routes 200 ·
      **e2e green: registers an account, plays a practice game vs the AI, 0 console errors.**

      **Two findings, neither caused by the upgrade:**

      - **`GET /api/me/rank/` 500s and always has.** `server/routes/api/me/rank.ts:28` queries
        `knex('user_rank')`, but **no migration creates a bare `user_rank` table** — the schema has
        `user_rank_history`, `user_rank_events`, `user_rank_ratings`. knex 3 built and executed the
        SQL correctly; Postgres rejected it. Untouched file, non-existent table ⇒ pre-existing
        upstream bug. Catalogued, not fixed here (out of scope for this step).
      - **`pnpm migrate:latest` requires `NODE_ENV` to be set** (`server/knexfile.js` throws
        without it). Also pre-existing: knex 0.19's CLI never set `process.env.NODE_ENV` either
        (its only mention is a help string), and CI already passes `NODE_ENV: development`
        explicitly. Not a regression, left as-is — the throw is deliberate.

      **Payoff:** advisories 90 → **88**, and **bluebird is now a direct dependency only** — knex
      0.19 was the last package in the tree pulling it in. Nothing but our own code depends on it,
      which is exactly the position stage 7 needs.

    - [~] `redis` 2.8 → **ioredis** — break surface measured 2026-08-20, and the measurement
      **changed the target** from node-redis v4 to ioredis.

      | checked                                                                        | result                                                                           |
      | ------------------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
      | redis command call sites                                                       | **~39** across 11 files (all `*Async`, from `promisifyAll`)                      |
      | `multi()` batches                                                              | **6** — and their results are **passed through, never destructured**             |
      | pub/sub                                                                        | **0** — none at all, which removes v4's biggest migration hazard                 |
      | Buffer reads relying on `detect_buffers: true`                                 | **2** (`r-gamemanager`, gzipped game state)                                      |
      | warlock lock sites                                                             | **2** (`lockAsync`, `isLockedAsync`)                                             |
      | `kue`                                                                          | **independent** — `kue.createQueue` takes host/port/auth from config and manages |
      | its own connections, so it keeps its pinned `redis@2.6.5` no matter what we do |

      **Why ioredis rather than node-redis v4/v5.** `server/redis/r-client.ts` exports a _connected
      client singleton_ that 11 modules `require` and use synchronously. node-redis v4 requires an
      explicit `await client.connect()` and throws `ClientClosedError` for anything sent before it,
      so that export would have to be restructured across every consumer — the riskiest possible
      shape of change for a subsystem with no test coverage. ioredis connects on construction and
      queues commands until ready, so **the export keeps its current shape and the 11 consumers do
      not move**. It is also promise-native (so `promisifyAll` goes), and `getBuffer()` is a
      cleaner replacement for `detect_buffers` than v4's `commandOptions({returnBuffers: true})`.

      The `multi().exec()` result-shape difference (ioredis resolves to `[[err, res], ...]`,
      node-redis to `[res, ...]`) is a non-issue **because the measurement showed none of the 6
      sites read the value** — the one place that looked like a consumer, `r-playerqueue.ts:205`
      reading `ts.query()`, turns out to go through a plain `zrangebyscore`, not the multi.

      **DONE.** ioredis 6.0.0 is in, `redis`/`bluebird`/`@counterplay/warlock` are out of
      `package.json`, and `packages/warlock` is deleted. 39 `*Async` calls de-suffixed across 11
      files (exactly the measured count), 2 Buffer reads on `getBuffer()`, 6 `multi()` batches
      untouched, and `server/redis/r-lock.ts` (~40 lines + 10 unit tests) replaces warlock.

      **`bluebird` is now GONE from the repo and from the dependency tree.**

      Three things the measurement had not seen, all found by running the code rather than
      grepping it:

      - **`bin/api` did `global.Promise = require('bluebird')`** — replacing the global Promise
        for the _entire api process_, so everything that looked native in the API had actually
        been bluebird all along. The other three bins never did this. The api container failed
        to boot once the dependency was removed. My scans had covered `app server worker test
scripts` and simply never looked at `bin/`.
      - **`r-timeseries.countHits` used `.then(_).call('size')`** — bluebird's `.call()`, invoking
        a method on the resolved value. It survived every earlier sweep because it sits
        _mid-line_, and the chain pattern was anchored to the start of a line.
      - `server/redis/test/lock.ts` promisified the unlock function, which is now already a
        promise (and its own output had a copy-paste bug printing `result1` twice).

      The orphan checker grew to cover all three gaps: `bin/`, `cli/` and `config/` are now
      scanned, and `.call('x')`/`.get('x')` are matched **only when followed by a string literal**,
      because `Function.prototype.call` and Backbone/config `.get` are everywhere and matching
      them broadly is precisely the false-positive trap every earlier estimate in this file fell
      into.

      One cosmetic consequence, deliberately not "fixed": `server/game.ts` logs
      `results[1]` of a `multi().exec()`, so that debug line now reads `,OK,,1` instead of `OK,1`
      (ioredis returns `[[err, res], ...]`). It is a log string; the message was already wrong in
      saying "Archived to S3" for something that writes to redis.

      **Verified against real infrastructure**, not just unit tests: every command shape exercised
      directly against the container's redis (get/set/exists, `getBuffer` with a real gzip
      roundtrip, `multi/exec`, `zrange`), the lock (acquire, double-acquire refused, parity
      unlock, `isLocked`), the token manager end-to-end (add → get with JSON deck → exists → lock
      → remove), and the timeseries (`hit`/`query`/`countHits`). Plus: all 6 services boot,
      register/login, 7 authenticated routes including `/matchmaking` and `/stats`, 1360 unit,
      13 integration, and e2e green with `saveGameSession`/`saveGameMouseUIData` visible in the
      logs going through the gzip+multi path.

      **warlock was replaced, not ported** (owner decision). `@counterplay/warlock@0.3.1` is a
      vendored fork that pulls `node-redis-scripty@0.0.5`; both are unmaintained, and we use
      exactly three of its functions. The whole contract is `SET <key>:lock <id> PX <ttl> NX` to
      acquire, `EXISTS <key>:lock` to test, and a Lua parity-delete to release. Reimplementing it
      keeps the key format (`<key>:lock`) so nothing about the stored data changes, drops two
      dependencies, and makes the lock independent of which client library we are on.

    - [x] `kue` 0.11.6 → **BullMQ 6. DONE.** kue was unmaintained since 2017 and dragged
          express 4, pug 2-beta, stylus, nib, yargs 4 and its own pinned `redis@2.6` into the tree;
          it was the last holder of `redis@2`, which is now gone entirely. Advisories 87 → **80**.

      | measured                       | result                                       |
      | ------------------------------ | -------------------------------------------- |
      | job types                      | 13 (+ `rotate-bosses`)                       |
      | producer call sites            | 42, in only **5 chain shapes**               |
      | processors                     | 13, concurrency 1–2                          |
      | `.ttl(15000)`                  | 6 sites, but only **2 distinct job types**   |
      | cross-process completion await | 2 (the game server's post-game ratings path) |

      **Shape of the port.** kue used ONE queue with many job "types"; BullMQ uses a queue per
      name, so queue name == job type, which preserves the per-type concurrency. The seam
      (`server/redis/r-jobs.ts`) exposes `enqueue()`, `waitFor()` and `process()`. `process()`
      adapts the 13 existing kue-shaped `(job, done)` handlers rather than rewriting them, which
      kept this change to the queue itself. The 6 `.ttl()` sites collapse onto **two worker
      registrations** carrying `{ ttl: 15000 }`, implemented with the `PromiseUtils.withTimeout`
      we already had — BullMQ's stalled-job detection only covers a worker that _dies_, not a
      handler that hangs, which is what a ttl actually guards (owner decision).

      **Two bugs found while measuring, both ours, both fixed first and separately:**

      - **kue's builder `.delay(ms)` had been rewritten into a promise `.then(...)`** by a stage 6
        codemod, in all four matchmaking jobs. A kue Job is not a thenable, so every matchmaking
        **re-queue threw** — retry and backoff had been dead since that commit. Nothing caught it:
        server-side, so e2e never reaches it; no unit coverage for worker jobs; and the mangled
        form is valid JavaScript. The orphan checker now only reports `.delay()` when the file
        does not also use the job API.
      - **`Promise.all` in `afterGameOver` waited on player 1 only.** Decaffeination moved the
        comma separating two array elements _inside_ the first `new Promise(...)` argument list,
        making the second a stray constructor argument, so ratings could be computed before
        player 2's post-game job had finished. The CoffeeScript original was correct.

      **And one found only by running it:** `removeOnComplete: true` is incompatible with
      `waitUntilFinished`. BullMQ reads the job's key to get its result, so deleting the job the
      instant it completes fails the waiter with _"Missing key for job … isFinished"_ — which
      would have broken the ratings path on **every game**. kue did not have this problem because
      it pushed completion events rather than reading job state. Completed jobs now keep a
      bounded tail (`{ age: 300, count: 1000 }`) instead of vanishing.

      Also: the kue web UI (`kue.app.listen(4000)`, itself the reason kue pulled express+pug) is
      replaced by bull-board on the same port, so the compose service is unchanged. Queue keys are
      NOT kue-compatible; in-flight jobs are dropped at cutover, which is fine because every
      producer sets removeOnComplete.

      **Integration tests now cover the seam** (`test/integration/jobs/job_seam.js`, 12 tests,
      `pnpm test:integration:jobs`). It needs redis and nothing else, so unlike the other
      integration suites it **gates every push in CI** — the workflow already ran a `redis:6`
      service for the other steps.

      They paid for themselves before they were even committed, by finding a race that hand
      probing had missed: **`waitFor` hung for one waiter in five, every run.** Enqueue five jobs
      at once and one waiter never resolves, while the queue reports all five completed — and
      _which_ one hung varied between runs, which is why a single hand probe looked fine. BullMQ's
      event-based wait can miss a job that finishes in the window between the waiter attaching and
      the subscription going live, and its own `isFinished` check runs before completion is
      recorded. `waitFor` now awaits `QueueEvents.waitUntilReady()` and races the event wait
      against a 250ms state poll. Since the game server blocks its ratings update on exactly this
      call, the pre-fix behaviour would have intermittently stalled ratings in production.

      A note on how the test was written, because the first version was worthless: asserting that
      the _handler_ ran passes even while every waiter hangs. The assertion has to be on what the
      waiters returned. Each `waitFor` is also raced against a timeout so a hang fails naming the
      job rather than stalling to vitest's 60s cap.

      **Verified against real infrastructure:** worker boots and processes `rotate-bosses` on
      startup; a job enqueued in the **api** process is executed by the **worker** process and
      awaited back across the boundary (success in 40ms, and the failure path propagates too);
      e2e green with `update-user-achievements` (a ttl job) and `update-user-seen-on` visibly
      completing in the worker log; bull-board serves 200 and enumerates every queue.

    - [x] `bluebird` 2.11 → **native. DONE — the dependency is deleted.** It was **the gate**
          for knex, not the endgame after it.

      **Scope corrected by measurement: ~1,400 chain-position sites, not the ~660 first quoted**
      (that figure was `server/` only). Counting only calls in chain position — line-initial `.m(`
      or following `)` — so `Function.prototype.bind`, `Array.map` and `Logger.error` are excluded:

      | idiom                                     | sites | becomes                                                               |
      | ----------------------------------------- | ----- | --------------------------------------------------------------------- |
      | `.bind(obj)`                              | 442   | closure variable (as the `_chainState` work already did for 15 files) |
      | `.spread(fn)`                             | 402   | `.then(([a, b]) => …)`                                                |
      | `.error(fn)`                              | 174   | `.catch(fn)`                                                          |
      | `.map`/`.each`/`.filter`                  | 129   | `Promise.all` + array methods                                         |
      | `.get(prop)`/`.call(m)`                   | 115   | `.then(x => x.prop)`                                                  |
      | typed `.catch(Class, fn)`                 | 72    | `onType` helper / `ts-pattern`                                        |
      | `.timeout`/`.delay`/`.nodeify`/`.finally` | 83    | helpers, or dropped                                                   |
      | statics (`promisifyAll`, `join`, `defer`) | ~28   | native equivalents                                                    |

      **Why it stages cleanly:** bluebird promises are thenable-compatible, so each idiom can be
      converted while bluebird is still installed. Every stage stands alone and stays green;
      bluebird is removed last.

      **Error handling (owner decision):** `ts-pattern` (CJS build, zero deps) for the **10**
      stacked typed-catch sites, where a multi-branch `match` reads better and `.otherwise()` is
      _mandatory_ — which structurally prevents the main hazard of this migration, converting
      `.catch(SomeError, fn)` into a `.catch` that forgets to rethrow and silently swallows
      unrelated errors. A three-line local `onType` helper for the **61** single-catch sites,
      where it preserves the exact call shape for a one-token diff.

      - [x] **Stage 1 — `.spread` → destructured `.then` (407 sites, 56 files).**
            `scripts/codemods/spread-to-then.mjs`. The `function` form is deliberately **preserved
            rather than arrowed**: these chains rely on `.bind()` to set `this`, and an arrow would
            capture the enclosing `this` instead — verified that `this` still flows through `.bind()`
            into the converted form. — (this commit)
      - [x] **Stage 2 — nothing to do.** The "115 `.get`/`.call` shorthands" were **entirely
            pollution**: chain-position `.get(` is Backbone `model.get('id')`, and `.call(` is
            `Function.prototype.call`. Exactly **one** line-initial `.get(` exists and it is an HTTP
            client call in `consul.ts`. Zero bluebird shorthands in the codebase.
      - [x] **Stage 3 — typed `.catch` → `onType` (78 sites, 35 files).**
            `app/common/utils/utils_promise.ts` + `scripts/codemods/typed-catch-to-ontype.mjs`.
            The helper's `throw err` for non-matches is the whole point: without it a catch written
            for one error class silently swallows every other error, turning crashes into
            successful-looking responses. That is the single biggest hazard in this migration, which
            is why it is one helper rather than 78 hand-written `instanceof` blocks.
            The codemod rewrites only the call OPENING and finds the matching close paren by brace
            counting, so multi-line handlers, `function` forms and nested parens are untouched.
            **Verified through the live API**, not just tests: re-registering an existing username
            still surfaces `AlreadyExistsError` as a 401.
            27 `.catch(Promise.TimeoutError|CancellationError, …)` are deliberately left — they are
            bluebird's OWN error classes and belong with the `.timeout()`/`.cancellable()`
            conversion in stage 6. — (this commit)

        _`ts-pattern` was not needed after all._ It was intended for the stacked sites, but
        chained `onType` calls preserve bluebird's exact structure and read fine:
        `.catch(onType(A, f))` `.catch(onType(B, g))` `.catch(next)`. Rewriting those into
        `match(…).with(…).otherwise(…)` blocks would be a much larger diff for the same
        rethrow guarantee, so the dependency was skipped.

      - [x] **Stage 4 — `.error` → `.catch`: ONE site, not 174.** The other 173 were
            `Logger.module('X').error(...)`, which my `\)\s*\.error\(` pattern matched.
            The semantic difference is real and worth recording, because a naive bulk conversion
            would have been a genuine bug: bluebird's `.error` catches only OPERATIONAL errors —
            explicit rejections — and deliberately **skips programmer errors thrown from a callback**.
            Verified empirically: `Promise.reject(new Error(...))` is caught, while a `TypeError` or
            `ReferenceError` thrown inside a `.then` is not. Converting 174 sites to `.catch` would
            have made them all start swallowing bugs. There was only one real site, and there the
            promise rejects explicitly so `.catch` sees the same error. — (this commit)

      **Remaining scope, re-measured line-initial (the earlier per-idiom numbers were polluted
      by `Logger.error`, `Backbone.get`, `Function.prototype.bind` and `Array.map`):**
      `.bind` 367 · `.timeout` 29 · `.finally` 11 · `.delay` 4 · `.nodeify` 3 · `.map` 1 ·
      `.filter` 1 · `.each` 0, plus statics (`promisifyAll` 13, `join` 9, `cancellable` 7,
      `promisify` 3, `defer` 3) and the 27 deferred `.catch(Promise.TimeoutError|CancellationError)`.

      **Stage 7 measured (2026-08-20, after knex).** Of the **215 files that
      `require('bluebird')`, 163 use no bluebird-only feature at all** — they require it and then
      use `.then`/`.catch`/`Promise.all`, so they are a mechanical swap to native. Only **52**
      files touch bluebird-specific API:

      | feature                                                                              | occurrences    | notes                                                                                                                                                                       |
      | ------------------------------------------------------------------------------------ | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
      | `Promise.map(...)`                                                                   | **63**         | ⚠️ see concurrency below                                                                                                                                                    |
      | `Promise.delay(ms)`                                                                  | **22**         | trivial — `PromiseUtils.delay` already exists                                                                                                                               |
      | `Promise.each(...)`                                                                  | **14**         | sequential by definition — needs a real loop                                                                                                                                |
      | `promisifyAll`                                                                       | 8 files        | **only 2 are redis** (`r-client`, `warlock` in `r-tokenmanager`); the rest are **zlib / bcrypt / s3 and can be done now, without redis** (22 `*Async` sites across 8 files) |
      | `cancellable` / `promisify` / `Promise.props` / `.spread` / `.bind` / typed `.catch` | 1–3 files each | rounding error                                                                                                                                                              |

      This corrects an earlier claim in this file that every bluebird idiom was gone except
      `.timeout` and `promisifyAll` — **the statics were never counted.** Same failure mode as
      every other estimate here.

      ⚠️ **`Promise.map` is NOT `Promise.all(arr.map(fn))`.** Four call sites pass a concurrency
      option. Resolved precisely when converting (7b), because the first count was misleading:

      - **`server/lib/data_access/achievements.ts` is the only real one** — `Promise.map(..., {
concurrency: 1 })`, i.e. _serial_, and it says why in a comment: _"process the achievements
        map serially with 1 concurrency so that there's no chance of card log getting overwritten"_.
        `Promise.all` would parallelise those writes and reintroduce that bug **silently**.
      - `app/ui/managers/package_manager.ts` passes `{ concurrency: 10000 }` — effectively
        unbounded, so plain concurrent execution is correct.
      - The other two `{ concurrency: 1 }` (`cosmetic_chests.ts:327`,
        `LadderProgressLayer.ts:218`) are on **`Promise.each`, which takes no options at all** and
        is always serial — so those options were _always_ no-ops, in bluebird too. `PromiseUtils.each`
        is likewise unconditionally serial, so behaviour is preserved exactly.

      So: a `PromiseUtils.map(items, fn, {concurrency})` helper, not a blind codemod.

      **Revised order:** the redis-independent work (163 mechanical files + zlib/bcrypt/s3
      `promisifyAll` + `Promise.delay`) can land _before_ redis v4, leaving redis to gate only the
      ~40 redis `*Async` sites and `warlock`.

      **7d landed: 213 of 215 files dropped the bluebird require.** Only `server/redis/r-client.ts`
      and `server/redis/r-tokenmanager.ts` still need it, so redis v4 is now the _only_ thing
      between us and deleting the dependency.

      Two of those 213 were not in the original scan at all: `server/game.ts` and
      `server/single_player.ts` did `Promise = require('bluebird')` with **no declaration** —
      an implicit global that replaced the process-wide `Promise` for both socket servers.
      CoffeeScript would have scoped that to the file with an implicit `var`; decaffeination
      dropped the declaration and silently promoted it to a global. Removing the line removes
      the landmine too. (`Logger` on the neighbouring line is still an implicit global — catalogued,
      not fixed here.)

      **Three real bugs surfaced, none of which unit tests or lint could see.**

      1. **`Promise.longStackTraces()` in `server/api.ts` and `worker/worker.ts`.** My
         comment-stripped rescan checked `Promise.config(` but had dropped `longStackTraces`
         from its pattern list, so both files were cleared as "clean". The worker crash-looped
         on boot: `TypeError: Promise.longStackTraces is not a function`. Caught by booting the
         services, not by 1,350 unit tests.
      2. **`scripts/create_bot_users.js` used `.bind(this)` without ever requiring bluebird** —
         it depended on `createNewUser` _handing back_ a bluebird promise. Converted to a closure.
      3. **bluebird's synchronous inspection API — the expensive one.** Eight files call
         `promise.isFulfilled()`, which native promises simply do not have. These look nothing
         like promise combinators (no chain position, no `Promise.` prefix), so every pattern-based
         scan missed them. The first one to run threw
         `this._contentOnlyPromise.isFulfilled is not a function` from `Scene.ts` and **hung the
         login → registration transition** — with the app otherwise looking healthy: zero console
         errors, boot fine, login screen fine. Fixed with `PromiseUtils.inspectable()`, applied at
         the promise's origin (and centrally in `package_manager.whenRequiredResourcesReady`,
         which covers `CardNode`/`UnitNode`).

      **Guard added:** `scripts/check-no-bluebird-orphans.mjs` (`pnpm check:bluebird-orphans`, wired
      into the lint workflow) fails on any bluebird-only API used in a file that does not require
      bluebird — statics, chain methods **and** the inspection API. It is the mirror image of
      `check-promise-utils-bindings.mjs`.

      **How bug 3 was actually found is worth recording**, because two of my instincts were wrong
      first: I hand-rolled a Playwright probe that showed the client rendering _nothing_, and
      "bisected" by reverting `app/` — both misleading. The probe lacked the config's browser flags
      (the game needs WebGL) so it never rendered at all, and the first bisect looked invalid
      because I wrongly assumed the api container baked in `dist` (it volume-mounts `./dist/src`,
      so the bisect had been valid all along). What worked was an **automated bisect using the real
      Playwright harness** over the 98 changed files — 7 rounds, straight to
      `app/view/layers/TransitionLayer.ts` — followed by a **temporary diagnostic spec** that
      instrumented `showModalView` and printed the actual thrown message. Guessing cost far more
      than instrumenting.

      Also fixed on the way: **`scripts/helpers.js:recursivelyGetFilesStartingFrom` was racy**.
      It accumulated paths in `fs.stat` _completion_ order and resolved when the last-_indexed_
      callback fired rather than the last to _finish_ — so it could return files in a different
      order each run, or resolve before earlier entries were added and silently drop some.
      `generate_packages.js` text-parses whatever it returns, so dropped files meant dropped asset
      packages: counts flapped 2789/2788/2785 across runs, with `challenge_*` packages appearing
      and disappearing. **The packages-manifest guard caught it** (its second catch, after the 325
      packages in 5.2c). Now sorted, fully awaited, assembled in list order — three consecutive
      runs give 2795 keys, matching the committed manifest exactly, with byte-identical contents.
      bluebird's scheduler had been hiding this race; native scheduling exposed it.

      - [x] Stage 5 — `.bind` chains → closures (367), the delicate one (5b–5d; the state-bag
            artifacts it left behind became their own bug hunt, logged in AGENTS.md)
      - [x] Stage 6 — helpers in `app/common/utils/utils_promise.ts`: `withTimeout` +
            `TimeoutError`, `delay`, `defer`. Converted: `Promise.defer()` (3), `.delay(ms)` (4),
            and the **client-side** `.timeout` in `application.ts`.

        ✅ **UNBLOCKED AND DONE** — knex 3 landed and all 20 remaining `.timeout` sites converted
        with it; 0 remain in `server/`+`worker/`. The original blocker note is kept below because
        its _diagnosis_ was wrong in an instructive way, see the knex entry in tier 2: knex 0.19
        and knex 3 have identical transaction auto-commit logic, so "knex 0.19 is itself built on
        bluebird" did not explain the failure. What was true is that the conversion had to happen
        _with_ the upgrade, not before it.

        🚧 (historical) **`.timeout` inside knex transactions is BLOCKED on the knex upgrade.** Converting the 29 `.timeout(ms)` sites broke registration with
        `Unhandled rejection Error: Transaction query already complete`. bluebird's `.timeout`
        **cancels** the operation it wraps; a `Promise.race` does not, and knex 0.19 is itself
        built on bluebird, so a native promise returned from a transaction callback is not
        handled the same way. Reverted for the server; those sites keep bluebird's `.timeout`
        until knex 3 lands. Caught by e2e, not by 1,325 unit tests.

        `.map`/`.filter` turned out to be Array methods, not bluebird — 0 real sites.

      - [x] **Stage 6b — `Promise.join`, `.nodeify`, `.cancellable`, zlib `promisifyAll`.**
            `Promise.join(a, b, fn)` → `Promise.all([a, b]).then(([a, b]) => …)` (9);
            `.nodeify` (31, far more than the 3 line-initial ones counted);
            `.cancellable()`/`CancellationError` (7) via a helper that attaches `.cancel()` to the
            returned promise so call sites are unchanged; `Promise.promisifyAll(require('zlib'))` (6
            files) → node's own `util.promisify`.

        **Two runtime bugs, both mine, both caught only by e2e:**
        - `.nodeify(cb)` is a **no-op when `cb` is undefined**, and these functions take an
          optional callback so they work either as promise or callback APIs. Inlining
          `.then(v => cb(null, v))` made every promise-style caller throw
          `TypeError: callback is not a function` — a 500 on registration. Replaced with a helper
          that also preserves the other two behaviours: the resolved value is unchanged, and a
          rejection goes to the callback rather than becoming an unhandled rejection.
        - The codemods decided "already imported" by matching the **module path** rather than the
          **binding**, so a file with `const { onType } = require('…/utils_promise')` never got
          `PromiseUtils` — `ReferenceError: PromiseUtils is not defined`, 500s server-side, and
          the mirror image client-side with `onType`.

        `scripts/check-promise-utils-bindings.mjs` now guards that whole class and runs in CI;
        verified to fail when the binding is removed.

        _Note: bluebird's `.cancel()` also tried to stop the underlying operation; the
        replacement only settles the promise. That is enough for why this code cancels — a
        promise wrapped around a one-shot event listener would otherwise never settle and leak
        the chain waiting on it._

      🚧 **Stage 7 is BLOCKED, and the dependency runs the opposite way to the plan.** bluebird
      cannot be dropped until:
      - **knex 3** — `.timeout` (28) + `Promise.TimeoutError` (20) cannot move while knex 0.19 is
        bluebird-based (see stage 6).
      - **redis v4** — `Promise.promisifyAll(redis)` and `promisifyAll(warlock(redis))` supply the
        `*Async` methods the redis layer is written against. Removing them IS the redis migration.

      So the true order is **knex 3 → `.timeout` → redis v4 → drop bluebird**, not
      "bluebird → knex" as originally planned. The bluebird _idioms_ are gone from knex's chains,
      which is what actually unblocks knex 3.
      - [x] **Stage 6c — every bluebird `.bind` chain is gone.** The last 20 needed hand work:
            `session2.ts` and `challengeRemote.ts` had `.bind(this)` followed by `.timeout`, so the
            client `.timeout` sites were converted first (client code, so the knex blocker does not
            apply), which freed them. `rank.ts` had a `.bind(({}))` that was already a no-op, and
            `games_manager.ts` — which the codemod had refused because its output would not parse —
            was converted by hand.

        **A subtlety worth recording:** those chains pass METHOD REFERENCES as callbacks —
        `.then((this._checkResponse))`. bluebird invoked them with the bound `this`; native calls
        them unbound, and `_checkResponse` uses `this.emit(...)`. Simply deleting `.bind(this)`
        would have broken every error path in the session layer. All 13 such callbacks are now
        explicitly `.bind(this)`-ed at the call site before the chain bind was removed.
        Verified live: login, session restore (`GET /session/`), and a bad password still 400s.

        The only `.bind(` left in chain position is a DOM event bind in `dat.gui.ts`.

      🚧 **Stage 7 — genuinely blocked, not skipped.** `require('bluebird')` cannot be dropped
      until **knex 3** (`.timeout` 20 + `TimeoutError` 20 on the server) and **redis v4**
      (`promisifyAll(redis)` / `promisifyAll(warlock(redis))` supply the `*Async` API the redis
      layer is written against). Everything else bluebird provided is now gone.
      - [x] Stage 7 — after knex 3 and redis v4: drop `require('bluebird')` and the dependency
            (7a–7d, then `e72316ed`: bluebird is gone from the tree and the lockfile)

  **⚠ Reprioritisation, measured after the winston step.** The tier list above was written before
  anyone counted where the advisories actually come from. Of the 129 remaining, the top sources
  are **not** the tier-2 packages:

  | source           | paths  | installed | latest  | note                                               |
  | ---------------- | ------ | --------- | ------- | -------------------------------------------------- |
  | `firebase-tools` | 15     | 14.27     | 15.27   | **dev-only**; pinned to 14 because 15 needs JDK 21 |
  | `hbs`            | 12     | 4.1.0     | 4.2.1   | **patch bump** — server view engine                |
  | ~~`supertest`~~  | ~~11~~ | —         | —       | ✅ **removed with `test/rest`**                    |
  | `socket.io`      | 6      | 4.6.1     | 4.8.3   | minor bump                                         |
  | ~~`request`~~    | ~~5~~  | —         | —       | ✅ **removed** — replaced with native `fetch`      |
  | `kue`            | 5      | 0.11.6    | _final_ | unmaintained — replacement project, pins redis@2   |
  | `knex`           | 5      | 0.19.5    | 3.3.0   | gated on bluebird                                  |
  | `jquery`         | 4      | 2.1.4     | 4.0.0   | client                                             |
  | `helmet`         | 4      | 0.8.0     | 8.3.0   | security middleware, 8 majors behind               |
  | `validator`      | 3      | 3.43.0    | 13.15   |                                                    |

  **26 of the 129 were dev-only** (`firebase-tools` + `supertest`) and never shipped.

  - [x] **Deprecated packages removed, plus the safe bumps.** `pnpm outdated` review:
    - **`hbsfy`** (deprecated) — only ever used for `hbsfy/runtime`, which is literally
      `require("handlebars/runtime").default`. Replaced with that directly in both call sites;
      `handlebars` is already a direct dependency. It was a browserify-era transform that outlived
      the bundler.
    - **`node-uuid`** (deprecated) → `uuid` 13. Nine files required it; **only one actually called
      it** (`r-tokenmanager`), so eight dead imports went too. `desktop/renderer-preload.js` set
      `window.uuid` — a global nothing in the client ever read — removed rather than re-wired.
      Also dropped a deprecated `new Buffer(...)` at the one live call site.
    - Safe version bumps: `firebase` 12.18, `firebase-admin` 14.3, `@aws-sdk/client-s3`,
      `prettyjson`, `vite` 8.2.2, `sass`, `@firebase/rules-unit-testing`, `fast-stats`.
    - **`glicko2` 0.8.7 → 1.2.1** was mis-filed as a safe bump — it is a MAJOR version of the
      **ranked rating algorithm**. Verified properly rather than by API shape: the same
      `makePlayer`/`updateRatings` inputs produce **identical output to six decimal places** on
      both versions, checked by installing 0.8.7 side by side.
  - [x] **Deleted `test/rest`, removing `supertest` (101 → 90).** Five files, referenced by no
        script, no vitest config, no workflow and no compose service — so they had not run in a very
        long time. Confirmed dead by actually running them under a temporary config rather than
        trusting the plan's "broken" label: **all five fail**, and not for one fixable reason —
        `api.js` throws `ReferenceError: Cannot access 'api' before initialization`, `password_reset`
        dies on `express-jwt: 'secret' is a required option`, `version-check` on
        `Cannot read properties of undefined (reading 'get')`. Reviving them would be writing new
        tests, not fixing old ones, and the routes they cover are exercised by the e2e suite and the
        integration suites instead.
  - [x] **`request` → native `fetch` (106 → 101).** `request` was deprecated _and frozen at its
        final version_, so its advisories could never be patched — the only way off it was to stop
        using it. Its one consumer downloaded `index.html`/`register.html` from the CDN at boot in
        staging/production. Ported faithfully rather than deleted: the CDN model is still how a real
        deployment gets those files (the api Dockerfile does not copy `dist/`), so removing it would
        have been a deployment-architecture decision, not a dependency bump.
        Extracted to `server/lib/download_html.ts` because `server/api.ts` boots the server as a side
        effect of being required, so nothing in it can be tested — and **this path never runs in
        development**, so it would otherwise have shipped on "it looks right" with a failure mode of
        "the API refuses to boot". `test/unit/misc/download_html.js` covers success, non-200,
        connection failure, and **gzip** specifically (the old call passed `{ gzip: true }`; fetch
        handles it transparently rather than by option).
        A transitive `request@2.79.0` remains via `coveralls`, a dev-only coverage reporter — it no
        longer contributes any advisory path.
  - [x] **Acted on that batch: 129 → 106 advisories.** All four now contribute **0** paths.
    - `hbs` 4.1.0 → 4.2.1 and `socket.io`/`socket.io-client` 4.6.1 → 4.8.3 — drop-in (−16 alone).
    - `validator` 3.43 → 13.15. The hazard was `isLength`: the code calls it with a **positional**
      minimum (`isLength(code, 4)`), while modern validator documents an options object. Had the
      positional form been ignored, every length check would have started returning true for any
      input **including the empty string**, silently disabling invite/referral/gift-code
      validation, and nothing else in the suite would have noticed. v13 does still honour it —
      verified against the old version first, and now pinned by
      `test/unit/misc/validator_contract.js` so it is a decision rather than an assumption.
    - `helmet` 0.8 → 8.3. `helmet.noCache()` was **removed in helmet 4**; its four headers are now
      written explicitly and **verified byte-identical against the running API**
      (`Surrogate-Control`, `Cache-Control`, `Pragma`, `Expires`). `helmet.xssFilter()` survives
      but now emits `X-XSS-Protection: 0` where 0.8 emitted `1; mode=block` — deliberate on
      helmet's part, since the browser XSS auditor was removed from Chrome/Edge after it was shown
      to _introduce_ vulnerabilities. Documented at the call site.
  - [x] **Client `firebase` 2.0.3 → 12** — done as **Phase 9**, not as a tier-2 bump, because it
        crossed three API generations and changed the auth model. `firebase@2.0.3` is now gone from
        the repo entirely (9.5).

  **Latent bug found while doing this, deliberately NOT fixed here** (belongs with the other
  preserved bugs in the correctness pass, 5.2c): `config/config.js` documents
  `jwt.tokenExpiration` as _"Time (in minutes) before tokens expire"_ with a default of
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
- [x] **Firebase RTDB: KEEP** (owner, 2026-08-19). Settles the last open architectural question. The consequence is Phase 9 — the client SDK has to move off `firebase@2.0.3`.

### Phase 9 — Client Firebase SDK: 2.0.3 → 12 (RTDB kept)

**This is not a dependency bump.** Measured surface:

|                                             |                                                                                               |
| ------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `firebase` client                           | **2.0.3** (2015) → 12.17.1; three API generations                                             |
| direct `require('firebase')`                | 9 files                                                                                       |
| files touching Firebase at all              | 47                                                                                            |
| `Backbone.DuelystFirebase.Model/Collection` | **30 files, 53 usages** — all backed by `backfire`                                            |
| `backfire`                                  | vendored **minified 8 KB build, no source in repo**; a Firebase-**2.x**-only Backbone binding |
| live RTDB security rules                    | 21,869 bytes, **`auth.id` referenced 86 times**                                               |

**The hard constraint:** Firebase 2.x legacy auth tokens are only understood by the 2.x SDK.
Today ONE JWT does double duty — `server/routes/session.ts` signs `{d:{id,username},v:0}` HS256
with `firebase.legacyToken`, and the client both sends it as `Authorization: Bearer` (express-jwt,
149 `req.user.d.id` reads) AND passes it to `fbRef.authWithCustomToken()`, where Firebase v2
exposes `d` to the rules as `auth`. Any SDK upgrade forces a move to real Firebase custom tokens
(`signInWithCustomToken`), whose claims arrive as `auth.uid` + `auth.token.*` — so **all 86
`auth.id` references have to change**, on rules that guard live player data.
_Spiked and confirmed_: `firebase-admin`'s `getAuth().createCustomToken(uid, {username})` mints
the right thing (RS256, service-account-signed, `uid` + `claims.username`).

**Dual-accepting rules were considered and REJECTED** (owner discussion, 2026-08-19). The idea
was `auth.id == $uid || auth.uid == $uid` so old and new clients both work. It does not buy
safety: with `||`, a mistake in the new branch is _masked_ by the old branch still matching, so
a bad rewrite would surface only when the legacy branch is finally removed — far from the change
that caused it. There is also no third-party client population to stay compatible with (the
client is served by our own API container, the desktop app bundles its own copy). Single cutover
instead, rehearsed on `duelyst-ci`, where a wrong rule fails loudly and harmlessly.

**Also corrected:** the rules ARE version-controlled — `firebaseRules.json`, byte-identical to
the live ruleset. Changing them is a reviewable diff and a revert, not console archaeology.

**The rewrite itself is small.** The whole 21 KB file uses only three auth expressions, because
Firebase 2.x exposed every field of the token's `d` payload directly on `auth`, whereas a v9
custom token puts the subject on `auth.uid` and custom claims under `auth.token.*`:

| today                             | new                                     | count |
| --------------------------------- | --------------------------------------- | ----- |
| `auth.id`                         | `auth.uid`                              | 86    |
| `auth.continous_integration_user` | `auth.token.continous_integration_user` | 1     |
| `auth.uid` (line 717)             | unchanged — already the right form      | 1     |

- [x] 9.1 **Server mints a Firebase custom token alongside the existing API JWT.** Purely
      additive: `DuelystFirebase.createCustomToken()` on the existing seam (so the credential is
      initialised once), surfaced as `firebase_token` on both `POST /session/` and
      `POST /session/register`. The legacy `token` is untouched, so express-jwt and the 149
      `req.user.d.id` reads are unaffected, and **minting is deliberately non-fatal** — nothing
      consumes it yet, so a Firebase hiccup logs and returns null rather than breaking login.
      _Verified against the running API_: the custom token's `uid` is byte-identical to the legacy
      token's `d.id`, which is the invariant the whole 9.2 rewrite rests on. — (this commit)
- [x] 9.2 **Rules rewritten to the new shape, tested against the emulator, deployed from CI.**
      66 lines changed; `auth.id` → 0, `auth.uid` → 87, one `auth.token.*`. — (this commit)

  **Correction to the plan above:** the integration suite _cannot_ validate rules. It connects
  with a service account, and **admin credentials bypass security rules entirely** — it stays
  green with the rules completely broken. Deploying to `duelyst-ci` was never going to be the
  safety net on its own.

  So rules are tested against the **emulator** instead (`pnpm test:rules`,
  `test/rules/firebase_rules.spec.mjs`, `@firebase/rules-unit-testing`), which is the only thing
  that can assert a **denial** — and which needs no cloud project, no secrets, and therefore runs
  on fork PRs too. **Proven to discriminate**: run against the OLD `auth.id` rules the two
  "allow" cases fail while the denials still pass; against the new rules all 5 pass. A rules test
  that only ever denies would pass vacuously, so this was checked explicitly.

  _Attempted and abandoned_: validating against real Firebase by exchanging a custom token for an
  ID token. `signInWithCustomToken` needs Firebase Auth initialised, and
  `identityPlatform:initializeAuth` returns `BILLING_NOT_ENABLED` on the Spark plan. The emulator
  is the better tool anyway.

  **Enabling change — the two SDKs now coexist.** `@firebase/rules-unit-testing` requires
  `firebase@^12` under that exact name, but the client needs 2.0.3. So `firebase` is now **12.17.1**
  and the legacy SDK is aliased as **`firebase-v2` (`npm:firebase@2.0.3`)**, with all 15 legacy
  requires repointed. Client behaviour is byte-identical (verified: bundle still contains
  `authWithCustomToken`, contains **zero** v12 internals, e2e plays a practice game). This is not
  just for the tests — **it lets 9.3 migrate the 30 backfire files incrementally** instead of in
  one big-bang commit, which the project's rules forbid anyway.

  `firebase-tools` pinned to **^14**: v15 requires JDK 21 and the emulator JAR is what needs it;
  14 accepts the JDK 17 that is installed. Bump when JDK 21 is available.

  CI (`.github/workflows/firebase_rules.yaml`): emulator tests on every change (incl. fork PRs),
  automatic deploy to `duelyst-ci`, and production behind `workflow_dispatch` + an explicit
  checkbox + its own `FIREBASE_PRODUCTION_SERVICE_ACCOUNT` secret (deliberately **not set**).

  ⚠ **`firebaseRules.json` now DIVERGES from production on purpose.** Deploying it to
  `duelyst-universe` before 9.3 would make `auth.uid` undefined for every live player and deny
  them their own data. A warning to that effect is at the top of the file; the deploy happens in
  9.4, with the new client.

- [x] 9.3 **Client runs on `firebase@12`.** Merged from `phase-9.3` (`3282d293`).

  It turned out far smaller than planned. `firebase@12`'s **`compat`** entry points expose the
  same ref API the v2 code already calls, so `app/firebase.ts` initialises compat and re-exposes
  it as the v2-shaped global `Firebase` constructor — **~50 `new Firebase(url)` call sites work
  untouched**, and `backfire` did not need replacing at all. Only genuinely renamed things changed:
  `.name()` → `.key` (3), `.limit(1)` → `.limitToLast(1)` (1), `ref.parent()` → `ref.parent`,
  `authWithCustomToken` → `signInWithCustomToken`, `ref.unauth()` → `auth().signOut()`.
  backfire's one incompatibility (`_getKey` tests `typeof snap.key === 'function'`, which was true
  in 2.x and is false now, falling through to the removed `name()`) is fixed by a one-line
  prototype override in `duelyst_firebase.ts` — the minified vendored blob is untouched.
  `isAuthenticated` is inverted on purpose: custom tokens are short-lived (~1h) and cannot be
  stored and replayed the way the legacy token could, so it validates with our server first (which
  re-issues a fresh `firebase_token`) and authenticates to Firebase with that.

  **Three v2-isms had to be bridged, all found by RUNNING the client**, not by reading:
  1. `auth/invalid-api-key` — from v3 on `signInWithCustomToken` goes through Identity Toolkit,
     which authenticates the REQUEST with the web API key. It fails before any network call, so
     the only symptom was that no identitytoolkit request was ever made. `FIREBASE_API_KEY` is
     now a config value threaded through both build define blocks. **Not a secret** — the web API
     key ships in every Firebase web client and grants nothing on its own.
  2. backfire's `_getKey` (`typeof snap.key === 'function'`) — `key` was a method in 2.x and is a
     string property now, so it fell through to the removed `name()` and every synced model came
     back with `id === undefined`.
  3. `this.firebase.ref is not a function` — backfire keeps whatever ref it is handed and calls
     `.ref()` on it in six places; a method in 2.x, a getter now. Refs handed out by
     `app/firebase.ts` now carry a callable `ref` shadowing the getter.

  Also `.name()` → `.key`, `.limit(1)` → `.limitToLast(1)`, `ref.parent()` → `ref.parent`,
  `ref.unauth()` → `auth().signOut()`, `snapshot.ref()` → `snapshot.ref`. The minified vendored
  backfire build was never edited. `firebase-v2` stays installed for the legacy `scripts/` ops
  tools, which still speak the v2 API.

- [x] 9.4 **Cutover done.** ✅ **The client runs on `firebase@12` against `duelyst-universe`.**
      Owner enabled Firebase Auth on production; a `duelyst-client` web app was created for its API
      key; the live ruleset was backed up (21,869 bytes, 86 `auth.id`) before deploying; `phase-9.3`
      was merged; the `auth.uid` rules were released to `duelyst-universe`; and the client + stack
      were rebuilt. **Verified by playing a practice game end-to-end against the real database.**
      9.1's token minting is now **fatal** rather than logged-and-nulled — the client cannot read any
      of its own data without it, so a swallowed failure would hand back a session that silently
      cannot talk to Firebase. `FIREBASE_PRODUCTION_SERVICE_ACCOUNT` is set, so the manual
      `workflow_dispatch` production rules deploy is now armed.

  Rollback if ever needed: the pre-cutover ruleset is `e6a8ac0c^:firebaseRules.json`, and the
  client is one `git revert` of the `phase-9.3` merge.

- [x] 9.5 **`firebase@2.0.3` deleted from the repo entirely.** After the cutover it survived only
      as the `firebase-v2` alias for five legacy scripts. Each was tested rather than assumed, and
      all five were dead:
  - `clear_user_quests`, `generate_invite_codes`, `test/utils/dump-firebase` — read
    `config.get('firebaseToken')`, **a config key that does not exist**, and
    `config.get('firebase')`, which returns the config _namespace object_ rather than a URL since
    the config was namespaced. Both crash on load with
    `FIREBASE FATAL ERROR: Cannot parse Firebase url`.
  - `connect_users` — hangs forever connecting to `wargame.firebaseio.com`.
  - `add_quest_queue_job` — targets `duelyst-dev.firebaseio.com`.

  All four hosts are Counterplay infrastructure that died with the 2016 shutdown, and nothing in
  the repo referenced any of the five. Deleted, and `firebase-v2` removed: **0 references to
  `firebase@2.0.3` in the lockfile.** If invite codes are ever switched on
  (`INVITE_CODES_ACTIVE` defaults to false), `generate_invite_codes` is a few lines to
  reimplement against `firebase-admin`, which the server already uses.

**Phase 9 complete — the whole stack is off firebase@2.0.3, and the package is gone from the
repo entirely.**

_Sequencing note:_ tier-2 deps (7.3) come after this, per owner.

## Decisions log

| Date       | Decision                                                                                                  | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| ---------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2026-08-21 | Deleted the 12 cosmetic-chest prismatic tests; replaced them with one that pins the real behaviour        | `_generateChestOpeningRewards` contains no live prismatic drop -- every mention is inside a comment, and it was already commented out with `###` in the 2016 CoffeeScript, so chests have never awarded prismatics in any published version. Ten of the twelve had been failing and could not have passed; the other two passed only by asserting the absence of a reward nothing generates. The replacement fails if anyone re-enables the drop, so the feature cannot come back untested. |
| 2026-08-21 | Seasonal quest tests (Frostfire-2016, February-2017) are KEPT                                             | they looked like expired content worth deleting, but `app/sdk/quests/questFrostfire2016.ts` still exists and the tests drive it with an injected system time. Their failures are ordinary stale balance (50 vs 100 gold) and one possible real bug (0 cosmetic keys awarded instead of 1), not dead features.                                                                                                                                                                               |
| 2026-08-21 | Balance expectations derive from the constant that drives them, not from a copied number                  | the gauntlet tests hardcoded a 150-gold ticket that is now free, so they failed on the price rather than the behaviour. Deriving from `GAUNTLET_TICKET_GOLD_PRICE` keeps them meaningful at any price including zero, and the insufficient-funds case is skipped by the price itself so it returns if tickets are ever charged for again. Where a number is emergent rather than constant-driven (reward slot counts), it is spelled out WITH the reason it moved.                          |
| 2026-08-21 | Rift offers only card sets that actually hold cards, and the picker returns `null` not `NaN`              | fixing only the symptom (rejecting NaN) would have left the generator silently asking for cards from empty pools and returning five choices where six were due. Filtering by what the caches really hold, rather than by a hardcoded exclusion list, keeps this correct if Bloodborn or Unity are ever populated. Relative weighting of the sets that DO have cards is untouched, so no rift drop re-tuning.                                                                                |
| 2026-08-21 | Services run an ahead-of-time `build/`; esbuild transpile-only, tree mirrored not bundled                 | tsx _is_ esbuild, so AOT with the same tsconfig reproduces the runtime emit exactly, while `tsc` would change it and pull in the 364-error typecheck backlog. Mirroring rather than bundling keeps every root-absolute require working and preserves the "module.exports before require" idiom the codebase uses to survive circular requires. Cold boot 4,578 ms → ~900 ms.                                                                                                                |
| 2026-08-21 | The tsx hook is enabled by detection (`.ts` on disk), not by an env var                                   | a flag is one more thing to forget on a deploy, and the quiet failure mode — forgetting to set it — puts the require hook back in production while everything still appears to work.                                                                                                                                                                                                                                                                                                        |
| 2026-08-20 | `catalog:` for cross-package versions; transitive skew left to `pnpm.overrides`                           | only 3 deps were shared, but two were skewed: Backbone.VirtualCollection bundled its own backbone 1.2.1 + underscore 1.6.0 into the client beside the app's 1.1.2/1.13.8. Its Backbone surface is `Collection.extend` + `Events` and 11 underscore helpers, all unchanged, so collapsing was safe — verified with the e2e practice game. `backbone.babysitter`/`backbone.wreqr` still pin 1.2.1 transitively; a catalog cannot reach those.                                                 |
| 2026-08-20 | turborepo orchestrates tasks; pnpm keeps installs/linking                                                 | `packages/chroma-js` ships no `dist`, so every build needed a manual `pnpm tsc:chroma-js` first — documented in AGENTS.md and wired into two CI workflows. `dependsOn: ["^build"]` makes the ordering the graph's job and the script is gone. Caching covers lint/format/typecheck/test; `build:client` is deliberately uncached (dist/ is ~1.2 GB).                                                                                                                                        |
| 2026-08-20 | Root's own tasks carry a `:root` suffix (`lint:root`, `test:root`, `build:client`)                        | the app still lives at the repo root, so it is turbo's root package. A script named `X` cannot be `turbo run X` or turbo re-invokes it; suffixing the root's work keeps the familiar aggregates (`pnpm lint`, `pnpm test:unit`) as the thing you type. Containers call the `:root` scripts directly — turbo.json and the lint configs are not shipped into runtime images.                                                                                                                  |
| 2026-08-20 | One lint owner per file; formatting stays repo-wide from a single config                                  | lint emits diagnostics, so overlapping scopes double-report: the root `.oxlintrc.json` now ignores every directory that is a workspace package, and each package lints itself against the shared base. Formatting is an idempotent rewrite with no findings to double, so a second config would only add drift.                                                                                                                                                                             |
| 2026-08-20 | `packages/Backbone.VirtualCollection` is lint-only and never reformatted                                  | vendored verbatim from upstream 0.6.6 and untouched since the initial dump; its committed UMD bundle _is_ the shipped artifact. Reformatting would fork it from upstream for no gain. `packages/chroma-js` is the opposite case — we build it and have patched it, so it is fully owned.                                                                                                                                                                                                    |
| 2026-08-19 | pnpm only; never yarn/npm anywhere in the repo                                                            | user directive                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| 2026-08-19 | All work on `modernization` branch, one commit per step, baseline green each commit                       | user directive; cheap reverts                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 2026-08-19 | `desktop/` stays out of the workspace (own `yarn.lock`) until Phase 7.4                                   | its build shells out to yarn + Electron 2 pin; not worth blocking the main line                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-08-19 | Dummy `FIREBASE_URL` for builds/CI; real Firebase only needed to play                                     | matches upstream CI behavior                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-08-19 | vitest lands _beside_ mocha (Phase 1) instead of a one-shot swap                                          | 1287 passing tests are the safety net for the TS conversion; never lose them                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2026-08-19 | Phantom deps added explicitly rather than enabling hoisting shims                                         | keeps pnpm strictness as a lint for the monorepo split                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 2026-08-19 | Gate's coffee-lint criterion = CI scope (`pnpm lint:coffee app server worker`), not `lint:coffee:all`     | `lint:coffee:all` was red before this work: 59 pre-existing errors, all in dead ops dirs (`cli/`, `scripts/*`) that CI deliberately excludes; several are indentation errors that can't be auto-fixed safely in untested CoffeeScript. Those dirs are deletion candidates, not fix targets.                                                                                                                                                                                                 |
| 2026-08-19 | 4.3: no speculative CDN base-URL layer; regex-rewrite machinery dies with gulp                            | CDN deploys target dead AWS infra; YAGNI — build it if a CDN deployment returns                                                                                                                                                                                                                                                                                                                                                                                                             |
| 2026-08-19 | 3.2: SDK/common become workspace packages in place; physical `packages/sdk` move deferred to the TS phase | moving 1,400 files pre-TS forces a ~7,000-site require rewrite or symlink fragility for zero functional gain; package names + boundary land now, relocation lands when imports are rewritten anyway                                                                                                                                                                                                                                                                                         |
| 2026-08-19 | Vitest runs the CJS tests via native-require passthrough (no coffee plugin/aliases yet)                   | zero-risk parity with mocha's module loading; the Vite-pipeline transform belongs to Phase 4 where it's exercised by the client build. Cost: vitest wall-clock ~38s vs mocha 6s (each forked file re-imports the SDK); acceptable until the SDK is TS.                                                                                                                                                                                                                                      |
