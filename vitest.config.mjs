import { defineConfig } from 'vitest/config';

/*
 * Vitest is the project's test runner (mocha was retired in plan step 7.1).
 *
 * The suites are CommonJS and register `app-module-path` themselves, so app
 * modules load through node's require() chain; `test/setup-tsx.mjs` gives that
 * chain the ability to load TypeScript.
 */
export default defineConfig({
  test: {
    include: ['test/unit/**/*.{js,ts}'],
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
  },
});
