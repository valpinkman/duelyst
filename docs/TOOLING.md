# Tooling: monorepo, build and the checks

Why the toolchain is shaped the way it is. [`../AGENTS.md`](../AGENTS.md) carries the rules an
agent needs while working; this file carries the reasoning behind them, which is mostly a record
of what went wrong first.

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
  package lints itself against `packages/oxlint-config/base.jsonc`. Formatting has no such problem
  (it is an idempotent rewrite), so `.oxfmtrc.json` at the root stays the single source of truth
  and package `format` scripts point back at it.
- `packages/sdk` and `packages/common` each carry their own `typecheck`, `lint` and `format`;
  the suites still live in `test/` as named vitest projects. Note the root `tsconfig.json` must
  name them in `include`: `tsc` does not follow CommonJS `require()`, so a package that is not
  listed is simply absent from the root program — silently, with no error and no diagnostic.
- `packages/chroma-js` is a fork we maintain (we build it, we lint and format it, it has one
  documented rule exception in its own `.oxlintrc.json`). `packages/Backbone.VirtualCollection`
  is vendored verbatim and untouched since the initial dump: lint-only, never reformatted, and
  its committed UMD bundle _is_ the shipped artifact.
- Caching is on for the cheap repeatable tasks and **off for `build:client`** — `dist/` is ~1.2 GB
  once resources are copied in, which costs more disk than the ~35 s it would save.
- **The services no longer compile TypeScript at boot.** `tools/build/build-server.mjs`
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
  `pnpm.overrides`, which is why `backbone: 'catalog:'` appears in both places. Overrides accept
  `catalog:`, so the version still has exactly one home.
- **The backbone override is install hygiene, not a fix.** marionette 2.2.2 ships
  `lib/backbone.marionette.js` as a prebuilt UMD with babysitter and wreqr _baked in_, so the npm
  packages pinning `backbone@1.2.1` were never loaded — `vendor.js` matches "wreqr" 44 times while
  no source file requires it. Both bundles read 1.1.2 before and after the override. Worth doing
  (one backbone in the tree, one fewer thing to reason about), worth not overselling.
