# Modernization status log

What was done, when, and — mostly — what it cost to learn. Newest first.

- 2026-08-21 — **typecheck backlog 362 → 263, and the pass found four real defects rather than
  typing noise.** The plan expected low yield here; the yield was in the small error codes, not
  the big ones.
  `server/lib/promisifiers.ts` did `const args = [].slice.call(...args)` — a variable used in
  its own initializer, so calling it threw. Our conversion turned `arguments` into `...args`;
  the file has had no callers since the 2016 dump, so it is deleted rather than fixed.
  TS2551 ("did you mean") was the highest-signal code: 20 errors, **none a typo in our code**.
  Five were class members the code assigns and reads consistently but never declares, including
  `RedisTokenManager.locker`; they now carry `declare`, which emits nothing and so leaves the
  wire format alone. The only two that looked like real typos were inside vendored dat.gui.
  **73 errors were third-party.** `app/tools/dat.gui.ts` is Google's Apache-licensed library and
  was already excluded from lint and format as vendored — but not from typecheck. Excluding it
  there too is consistency, not silencing.
  **A hypothesis I tested and disproved:** five sites read `!x > 0`, which in JavaScript is
  `(!x) > 0`. I assumed decaffeination had mistranslated CoffeeScript's `not x > 0`. Compiling
  the original with coffeescript@2 shows it emits `!a > 0` as well — `not` binds tighter than
  `>` there too — so the translation is faithful and the oddity is upstream. Simplified to the
  exactly-equivalent `!x` with a note not to "correct" it to `!(x > 0)`, which differs for
  negative values.
  Three spells indexed with an array literal (`entities[[3]]`), which works only by coercion and
  is in the 2016 source too. Unwrapped; the SDK suite and the e2e practice game confirm it.

- 2026-08-21 — **the data_access tail is closed: 0 known failures, from 59 when the gate went
  in.** The last nine came apart into four different causes, none of which was a stale number in
  the sense the plan assumed.
  **Faction XP is not flat.** `winsBeforeLVLTenGiveFullLvlOfXp` grants a whole level per win
  below level 10, so ten wins reach level 10 rather than the fifteen `totalXPForLevel(10) /
winXP` predicts, and 22 wins are worth 279 XP rather than 220. The tests now simulate the
  schedule with the SDK's own `xpEarnedForGameOutcome`, the same way `data_access/users` drives
  it.
  **Two tests were unsatisfiable.** `isAllowedToUseDeck` rejects decks holding _unreleased_
  cards — a release-date gate, not a level gate; there is no level gate in the method at all.
  Zero of 2,378 cards are still unreleased in 2026, so the rule is intact and nothing can
  trigger it. Gated on the data, like the other rules that outlived their content.
  **One depended on a worker.** The referral achievement is granted by the
  `update-user-achievements` BullMQ job, and this suite runs no worker — the original worked
  around it with a `delay(500)`, which cannot help when nothing consumes the queue. The test now
  runs what the job's handler runs.
  **Two more shadowed bindings**, in `rank` and the codex chapter count, plus a `.catch` that
  swallowed assertion failures and re-reported them as "expected {Object} to not exist", hiding
  which assertion actually failed.
  One test is newly quarantined rather than fixed: the orb spirit refund asserts `3 * 300`, but
  the refund is only paid by sets declaring `orbSpiritRefund` and the single enabled unlockable
  set declares none. What it really measures is leftover wallet spirit, which depends on what
  earlier tests spent — 0 alone, 900 in a full run. It needs its own setup, not a new number.

This is history, not instruction: an agent starting work needs
[`MODERNIZATION_PLAN.md`](MODERNIZATION_PLAN.md) (the checklist and resume point) and
[`../AGENTS.md`](../AGENTS.md) (the rules that still apply). Entries here are kept because
most carry a lesson that took real time to find, and because several correct-looking
decisions were later shown to be wrong by one.

- 2026-08-21 — **TypeScript 5.9 → 7.0.2 (the native compiler).** The pin existed for one
  reason — `@typescript-eslint` refused TS 7 — and eslint left with the oxlint switch, so the
  blocker went with it. **A full typecheck went 3.47 s → 0.39 s**, measured A/B on the same
  tree. Error count 360 → 362: TS2339 +2, TS2345 −1, TS2739 +1, which is compiler inference
  differing, not new defects — and **TS2304, the only gated code, is still zero**.
  Three config changes were needed. `moduleResolution: node10` is removed in TS 7, so both
  tsconfigs moved to `bundler` + `module: preserve`; that costs nothing here because the
  codebase has **zero `import` statements** — all 2,026 files use `require()`, which TS resolves
  without consulting `moduleResolution` at all. And TS 7 defaults `strict` to **true**, which
  broke `packages/chroma-js` (a fork that never opted in); its tsconfig now says `strict: false`
  explicitly rather than relying on a default that moved.
- 2026-08-21 — **quests is green; baseline 15 → 9.** All six remaining failures were one
  omission: the tests derived the catch-up quest's gold from
  `CATCH_UP_CHARGE_GOLD_VALUE` and multiplied by the charge count, but never applied
  `CATCH_UP_MAX_GOLD_VALUE`, which production caps the total at. That was invisible while the cap
  sat above the values in play; it is 50 now, the same as a single charge, so every multi-charge
  expectation overshot. They mirror the whole formula now, cap included.
  A seventh quests failure — the February-2017 seasonal quest awarding a cosmetic key — was
  already fixed by yesterday's `giveUserChestKey` restoration, which is a useful measure of how
  far that one bug reached.
- 2026-08-21 — **chased the inventory TypeError to its real cause; cosmetic chests are green and
  the baseline is 23 → 15.** `NOW_UTC_MOMENT.toDate is not a function` was raised deep in
  `giveUserCosmeticId`, three calls away from the mistake. **`openChest(userId, chestId,
systemTime)` has no `keyId` parameter** — the key checks inside it are commented out, and the
  2016 source is identical, so this is upstream rather than ours; the live route calls it
  correctly as `openChest(user_id, chest_id)`. The tests were passing `keyId` third, so a push-id
  string became the system time and blew up much later as a date.
  **The tool that found it was our own AOT build.** tsx flattens stacks to
  `inventory.ts:2:17547`; running the same reproduction against `build/` — which carries inline
  source maps and enables `setSourceMapsEnabled` — gave a real line number immediately. Worth
  reaching for whenever a stack in these suites is useless.
  With that fixed, the `giveUserChestKey` restoration reverted yesterday lands safely: it grants
  a chest key again instead of a chest. Two tests that assert key _validation_ stay skipped,
  because openChest genuinely does not validate keys and `ChestAndKeyTypeDoNotMatchError` is
  defined but never thrown. Also fixed the crate-guarantee test, which set `win_count` while the
  probability reads `game_count`, and had been leaning on state accumulated by earlier tests.
- 2026-08-21 — **cosmetic chests: baseline 29 → 23, and a production bug found but NOT shipped.**
  The chest probability tests asserted 0.33 and 0.0417, right when `CHEST_GAME_COUNT_WINDOW` was
  3 and wrong now it is 10. Rather than copy the new decimals in, they now assert the two
  properties the formula is built from — the time factor saturates at four days and decays by
  four per day below it — so they survive the next tuning pass. Four Monte Carlo calibration
  tests went the same way, replaced by the shape that actually matters (play more often, earn
  more, never run away); the four higher-frequency cases still passed and were left alone.
  **Found and deliberately reverted:** `giveUserChestKey` grants a CHEST, not a key. The 2016
  source defined it twice — a stub forwarding to `giveUserChest`, then the real implementation —
  and the later definition won. Decaffeination kept the stub live and left the real one as a
  comment, inverting that, so no chest key is ever created and chests cannot be opened.
  Restoring it fixes the two `giveUserChestKeys` tests but unmasks a second defect deeper in the
  path (`NOW_UTC_MOMENT.toDate is not a function`, raised inside `inventory.ts`), which turns two
  passing tests red. Every call from the chest path was checked against its signature and they
  match, so the cause is deeper. The fix is reverted rather than shipped half-verified — the
  patch is straightforward to redo from this note once the inventory defect is located.
  **Process note:** the first attempt at the chest work deleted eight tests when only four were
  failing. The baseline gate tracks failures, so it would NOT have caught the loss of four
  passing ones; the git diff did. Check what a bulk edit removed, not just what still fails.
- 2026-08-21 — **inventory: 17 failures → 2, baseline 44 → 29.** Nearly all of it was one idea:
  assert against the constant that drives the behaviour rather than a number copied from 2016.
  A spirit orb costs 50 gold, not 100; a common cosmetic 250 spirit, not 500; and the whole
  rarity table moved, so `disenchant one of each rarity` now computes its own expectation from
  `spiritCost`/`spiritReward` instead of asserting 480. Two more shadowed `spiritBefore`
  bindings turned up on the way, same decaffeination artifact as yesterday.
  **Three tests were asserting rules that cannot fire in this build.** The prismatic
  "needs the base card" guard only applies to cards flagged unlockable, and the cards those
  tests named (Drogon, Sirocco) are no longer flagged — so the craft succeeded and the test
  failed. They now pick a qualifying card _from the rule's own predicate_; where no card
  qualifies at all (nothing is unlockable through spirit orbs any more) the test is skipped by
  that fact rather than deleted, so it returns if the data ever changes.
  One number resisted derivation and is spelled out with a pointer: buying three orbs at once
  costs 140 rather than 150, from a hardcoded bundle table inside `buyBoosterPacksWithGold`.
- 2026-08-21 — **cleared the crashes hiding in the data_access tail: 51 known failures → 44, and
  every remaining one is now an assertion rather than an error.** Six defects, five of them the
  same shape — a variable declared at suite scope and _re-declared_ with `const` inside a
  callback, so the inner one shadowed instead of assigning and every later read saw `null`. That
  is a decaffeination artifact: CoffeeScript had one mutable binding per scope, and the
  conversion gave each assignment its own declaration. It cost `sync` its `userId` ("Could not
  find user" from production code), `inventory` its `openedBoosterId` (`.child(null)` →
  "invalid path") and its `spiritBefore` (asserted the wallet against `null`), and `rift` its
  `firstTicketId` earlier today. A sixth was the same idea one step further: three `const
lastRewardOrder` declarations in one block, so the assertion read a binding declared beneath
  it and died on a TDZ ReferenceError.
  **The best of them explains the non-idempotence noted yesterday**: `inventory`'s `fbRootRef`
  was only fetched inside the `AlreadyExistsError` branch of its setup, so on a _fresh_ database
  — where the user is created and the catch never runs — it stayed null and every test reaching
  Firebase through it threw. Also removed an assertion on `SDK.Races.Warmaster`, which is not a
  race and never was; `getRace(undefined)` had been failing the test rather than checking a cache.
- 2026-08-21 — **started on the stale-balance tail: gauntlet is green, 58 known failures → 51.**
  The headline number is that arena tickets are free now (`GAUNTLET_TICKET_GOLD_PRICE === 0`)
  and the tests hardcoded the old 150, so they failed on the price rather than the behaviour.
  They now derive from the module's own constant, and the insufficient-funds case — which cannot
  exist at price 0 — is skipped _by the price itself_, so it returns automatically if tickets are
  ever charged for again. The reward-slot counts each dropped by one for a single reason worth
  recording: the run used to award a free arena ticket above 6 wins, and that was disabled when
  tickets became free.
  **Two real problems came out of it.** The tests fired every game outcome at once through
  `Promise.all`, and `updateArenaRunWithGameOutcome` is a read-modify-write of `win_count` on one
  row — so a run billed as "10 wins" reached `claimRewards` with fewer, and the wrong reward
  count looked like stale balance rather than a race (same shape as `users updateGameCounters`).
  And gauntlet was never seeded, so which rarities a box drew changed how many reward slots
  collapsed into one. Fixing the race also removed one entry from `known-unstable.txt`: that
  flake had a cause, and the cause was in the test.
- 2026-08-21 — **the data_access suites are in CI**, as a `data_access_tests` job that gates on
  **drift** rather than on green: 59 of 565 still fail (stale 2016 balance numbers), so
  `scripts/check-data-access-baseline.mjs` compares the failing set against
  `known-failures.txt` and fails if a passing test regresses _or_ if a known-failing test starts
  passing without the list being shrunk. The list can only go down. Runs outside a container,
  because the RTDB emulator is a JAR and needs a JDK; Postgres and Redis are service containers
  and the Firebase side is `firebase emulators:exec`, so no cloud project and no secrets — which
  means it also runs on pull requests from forks.
  **Correction to yesterday's determinism claim:** deterministic given a fresh Postgres _and a
  fresh emulator_. The earlier measurement reused a long-lived emulator and masked two rare
  flakes (each seen once in ~8 runs); they are in `known-unstable.txt`, excluded from the gate
  both ways, and recorded as debt rather than as fixed. Five consecutive runs under the exact CI
  condition give an identical 59. The suites are also **not idempotent** — re-running against a
  database they already wrote to flips three inventory tests — so never diagnose a failure here
  by re-running against a persistent database.
- 2026-08-21 — **the rift `NaN` was a dead feature, not a bad input — rift card upgrades were
  broken in production.** The upgrade-choice generator sampled card sets that hold no cards:
  `Bloodborn` has 0 and is flagged disabled, `Unity` has 0 too, and together they carried about
  a third of the sampling weight. An empty pool indexes to `undefined`,
  `getBaseCardId(undefined)` is `NaN`, and the dedupe loop passed it straight through because
  `NaN !== null` and `_.contains(list, NaN)` is always false — so `NaN` reached Postgres inside
  `card_choices` (`int4[]`) and threw. Six slots are drawn per upgrade, so the overwhelming
  majority of attempts failed. Fixed at both levels: only sets that actually hold cards are
  offered, and the picker returns `null` so an empty pool resamples. Rift suite 11–12 failures
  → **0 of 43**. Two more bugs fell out: the sanitize test read `riftData.firstTicketId`, a
  property nothing sets — 2016 used an implicit global and our strict-mode conversion scoped it
  to a callback, so knex 3 rejected the `undefined` binding where knex 0.19 sent null; and an
  unordered `SELECT` in inventory was indexed positionally. **The whole suite is now
  deterministic: three fresh-database runs give an identical 59 / 59 / 59** (was 70 / 70 / 71),
  which is the precondition for making it a CI gate.
- 2026-08-21 — **seeded the flaky data_access tests; what is left is a bug, not noise.**
  `test/helpers/seeded_random.js` (mulberry32, fixed arbitrary seed) now backs the chest Monte
  Carlo simulations, and `users updateGameCounters` — which fired ~25 concurrent
  read-modify-writes at the same counter rows through an unbounded `PromiseUtils.map` — is now
  `{ concurrency: 1 }`. That race is upstream: the 2016 original used bluebird's `Promise.map`
  with no concurrency option either. **The seed was picked a priori, not by trying values until
  the suite went green** — seed-shopping would fit the seed to the assertions and hide the
  disagreements these tests exist to surface. Chest and users flakiness: gone across three
  fresh-database runs. The residual variance is entirely rift, and it is not flakiness: all
  11–12 rift failures cascade from one defect, `card_id_to_upgrade` reaching Postgres as `NaN`,
  and only the cascade depth varies. Fixing that bug removes the last non-determinism.
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
  lookups renamed to TypeScript; TS pinned to 5.9 for eslint compatibility (lifted 2026-08-21).
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
