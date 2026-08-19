import { defineConfig } from 'vitest/config';

// Vitest runs alongside mocha during the modernization (MODERNIZATION_PLAN.md
// Phase 1). The unit tests are CommonJS files which register
// `app-module-path` + `coffeescript/register` in their own preludes, exactly
// as they do under mocha, so no CoffeeScript transform or alias is needed
// here yet: vite-node executes the CJS test file and every `require` from
// there on (including all of app/sdk's .coffee modules) resolves natively.
// This changes when the client moves to Vite (Phase 4).
export default defineConfig({
  test: {
    include: ['test/unit/**/*.js'],
    globals: true, // tests use bare mocha-style describe/it/before hooks
    environment: 'node',
    testTimeout: 10000, // mocha runs with -t 1000; a whole-file run is ~6s, 10s catches hangs
    hookTimeout: 30000,
    // The SDK GameSession is a per-process singleton: parallel files are fine
    // (each fork has its own module registry), tests within a file are not.
    pool: 'forks',
    isolate: true,
    sequence: { concurrent: false },
  },
});
