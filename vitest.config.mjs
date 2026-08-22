import { defineConfig } from 'vitest/config';

/*
 * Vitest is the project's test runner (mocha was retired in plan step 7.1).
 *
 * The suites are CommonJS and register `app-module-path` themselves, so app
 * modules load through node's require() chain; `test/setup-tsx.mjs` gives that
 * chain the ability to load TypeScript.
 *
 * The suites are split into named projects along package lines, so a package
 * can be exercised on its own: `pnpm vitest --project sdk`. The files still
 * live under test/ rather than inside packages/sdk -- see docs/REORG_AUDIT.md. The
 * names are the point: they make the boundary explicit now, so that relocating
 * the files later is a path change and not a restructuring.
 */

// Every project needs these; project configs do not inherit the root `test`
// block, so they are spread into each one rather than written once above.
const shared = {
  globals: true, // the suites use bare describe/it/before hooks
  environment: 'node',
  setupFiles: ['./test/setup-tsx.mjs'],
  // mocha ran with -t 1000 plus per-suite this.timeout() overrides up to
  // 300s; those calls are gone (see scripts/codemods/mocha-to-vitest.mjs)
  // and the budget lives here instead.
  testTimeout: 30000,
  hookTimeout: 60000,
  // The SDK GameSession is a per-process singleton: parallel FILES are fine
  // (each fork gets its own module registry), tests within a file are not.
  pool: 'forks',
  isolate: true,
  sequence: { concurrent: false },
};

export default defineConfig({
  test: {
    projects: [
      { test: { ...shared, name: 'sdk', include: ['test/unit/sdk/**/*.{js,ts}'] } },
      { test: { ...shared, name: 'misc', include: ['test/unit/misc/**/*.{js,ts}'] } },
      { test: { ...shared, name: 'firebase', include: ['test/unit/firebase/**/*.{js,ts}'] } },
    ],
  },
});
