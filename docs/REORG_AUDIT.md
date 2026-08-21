# Folder reorg audit — moving `app/sdk` and `app/common` out of `app/`

**Measured 2026-08-21 at `dafded4e`.** Written because
[`MODERNIZATION_PLAN.md`](MODERNIZATION_PLAN.md) item 4 asks for "an audit of what breaks before
anything moves". Everything below is measured; §7 has the commands.

## Verdict first

**The move is feasible, but its stated justification does not hold, and the work it would take is
not the work that is actually blocking anything.**

The plan says the reorg "is also what unblocks per-package `typecheck`/`test`". That is not the
case. Both packages typecheck standalone **where they are today**:

| Package      | Standalone typecheck, in place | tsconfig needed |
| ------------ | -----------------------------: | --------------- |
| `app/common` |                   **0 errors** | 12 lines        |
| `app/sdk`    |   **1 error** (a real bug, §5) | 12 lines        |

What blocked it was never the directory. It was two ambient-type details: the `colors` package's
`String.prototype` augmentation, and `app/types/globals.d.ts`. Both are `tsconfig` fields.

The actual blocker to these being real, independent packages is the **dependency cycle** (§2),
which a folder move does not touch.

## 1. What a move would cost

**7,595 specifier rewrites.** Root-absolute requires resolve through one alias per top-level
directory (`app` → `./app`) in `app-module-path`, Vite, vitest and `tsconfig.paths`.
`app-module-path` adds _directories_ to the search path; it cannot remap a prefix. So relocating
means rewriting the specifiers to `@duelyst/sdk/…` and `@duelyst/common/…`, which pnpm's
workspace symlinks resolve natively everywhere:

| Prefix         | References |
| -------------- | ---------: |
| `app/sdk/…`    |  **5,613** |
| `app/common/…` |  **1,982** |

Mechanical — a codemod — but it lands on roughly 1,500 files.

**Six pieces of tooling hardcode the paths.** `scripts/generate_packages.js` is the delicate one,
with four filesystem paths (`${dir}/../app/sdk` recursive read, `/cards/factory`,
`/cards/factionFactory`, `/codex/codex`). Then `scripts/build/build-server.mjs`'s `TREES` list,
`.oxlintrc.json`, `pnpm-workspace.yaml`, `tsconfig.json` paths, and the Vite alias.

## 2. The real blocker: the graph is cyclic

```
app/sdk  ──899──▶  app/common
app/sdk  ──127──▶  app/data/resources
app/common ──3──▶  app/sdk          ← the cycle
app/common ──1──▶  app/firebase
```

Two packages that require each other are one package with a directory between them. Until this is
broken, `@duelyst/sdk` and `@duelyst/common` cannot be independently built, versioned or consumed
no matter where the folders sit.

**The good news: the cycle is three requires in two files.**

- `app/common/analyticsTracker.ts` → `app/sdk` (the barrel)
- `app/common/utils/utils_game_session.ts` → `app/sdk/cards/cardType`, `app/sdk/gameType`

Both are plausibly the wrong way round — a game-session utility and an analytics tracker are SDK
concerns that ended up in `common`. Moving those two files into `app/sdk` likely breaks the cycle
outright. That is a **two-file change**, not a 1,500-file one.

`app/common/session2.ts` → `app/firebase` is a fourth outbound edge to a non-package.

## 3. `app/data` is the unowned third party

Both packages depend on it, and it is not a package:

| Module                                     | Requires |
| ------------------------------------------ | -------: |
| `app/data/resources`                       |  **350** |
| `app/data/packages`                        |       72 |
| `app/data/shop`                            |       12 |
| others (`premium_shop`, `game_tips`, `fx`) |        5 |

`app/data/packages.js` is **generated and gitignored**, produced by `generate_packages.js`, which
itself reads `app/sdk` off disk. So `sdk → data → (generator) → sdk`. Any packaging plan has to
decide what `app/data` is: a third package, part of the SDK, or a build artifact.

## 4. Two plan concerns that are smaller than feared

- **RSX paths are safe.** `app/data/resources.js` holds _runtime URL strings_
  (`'resources/core_gem/inner_ring_light.png'`), resolved against the built `dist/src`, not
  filesystem paths relative to `app/data`. The build copies `app/resources/` separately. Moving
  `app/data` would not break them.
- **`generate_packages.js` is less entangled than its reputation.** It reads the card factories
  through ordinary `require()` for data, and text-scans one directory tree for `//pragma PKGS:`.
  Four hardcoded paths, all in one file.

## 5. Bugs the audit surfaced

Scoping the typecheck to one package found things the whole-program run cannot see, which is an
argument for per-package configs independent of any move:

**All three are fixed (2026-08-21); kept here because each one says something about the packages.**

1. **`challengeRemote.ts` uses `_` without requiring underscore.** It calls `_.without(…)` in its
   constructor. The root program hides this because `app/types/globals.d.ts` declares
   `declare const _: any` for the vendor globals — correct for the browser, where underscore is on
   `window`. Latent rather than live: every construction site is client-side
   (`app/application.ts`, `app/ui/views2/quests/`, `app/tools/editor.ts`), and the module is only
   _loaded_ server-side via the SDK barrel, which does not run the constructor. It would be a
   ReferenceError the moment anything constructs it on a server. Fixed by requiring underscore —
   and `app/sdk/tsconfig.json` now excludes `globals.d.ts` on purpose, so the SDK cannot pick up a
   browser global again without failing its own typecheck. It passes at **0 errors** under that
   rule, which is a useful thing to know: the engine is genuinely server-safe.
2. **`app/sdk/package.json` declares `"main": "index.js"` and only `index.ts` exists.** So
   `require('app/sdk')` fails under plain Node; it works only via the tsx hook or the compiled
   `build/` tree. This is the `DEP0128 Invalid 'main' field` warning printed on every test run.
   Fixed by deleting the field: Node's default directory-index lookup then finds `index.ts` in the
   source tree (through tsx) and `index.js` in `build/`, verified in both.
3. **Both manifests describe themselves as "Still CoffeeScript"** and promise that "physical
   relocation happens with the TypeScript conversion". The conversion finished; the descriptions
   did not. Rewritten.

Measuring `app/common` under the scoped config also sharpened §3's question. Without the browser
globals it reports 148 errors — but **136 of them are in one file** (`utils/utils_engine.ts`,
cocos2d helpers) and the rest in six others (`utils_resources`, `landing`, `openUrl`, `discord`,
`session2`, `analyticsTracker`). The server requires only `config` (30 files) and `logger` (105)
out of the package, and none of the browser-coupled ones. So `app/common` is a server-safe core
and a client-side half sharing a directory, which is worth knowing before step 3 decides where the
boundaries go.

## 6. Recommended sequence

Cheapest-first, each step independently valuable and revertable:

1. ~~**Per-package `tsconfig` + vitest projects, in place.**~~ **Done 2026-08-21.** Both packages
   now carry their own `tsconfig.json` and a `typecheck` script, so `pnpm typecheck` runs five
   turbo tasks instead of two and each package is checked in isolation as well as in the whole
   program. Unit tests are split into named vitest projects (`--project sdk|misc|firebase`,
   102/7/1 files) along the same boundary. All three defects in §5 are fixed; §5 records what the
   scoped typecheck proved about each package.
2. **Break the cycle** by moving `analyticsTracker.ts` and `utils_game_session.ts` into `app/sdk`.
   Two files. After this the packages are genuinely independent, which is the property that
   actually matters.
3. **Decide what `app/data` is.** It is the shared dependency of both and currently belongs to
   neither.
4. **Only then, and only if still wanted, the physical move** plus the 7,595-specifier codemod.
   Once the graph is acyclic and the configs are per-package, this is a rename with a codemod
   behind it rather than an architectural change — and it can be judged on its own merits, which
   are mostly aesthetic.

Steps 1–3 capture essentially all the engineering value. Step 4 is the part that carries the risk
and the 1,500-file diff.

## 7. How to re-verify

```bash
# reference counts
grep -rhoE "['\"]app/sdk/[A-Za-z0-9_./-]+['\"]" --include='*.ts' --include='*.js' app server worker test bin scripts | wc -l
# the cycle
grep -rn "require(['\"]app/sdk" app/common --include='*.ts'
grep -rhoE "require\(['\"]app/(common|data)[^']*" app/sdk --include='*.ts' | sed -E 's|(app/[a-z]+).*|\1|' | sort | uniq -c
# standalone typecheck (write the 12-line tsconfig from §"Verdict first" first)
pnpm exec tsc -p app/common/tsconfig.json
# hardcoded filesystem paths
grep -nE '\$\{dir\}/\.\./app' scripts/generate_packages.js
grep -n "TREES" scripts/build/build-server.mjs
```
