import { defineConfig } from 'vitest/config';

/*
 * Integration suites: these need Postgres, Redis and a real Firebase Realtime
 * Database (see docs/QUICKSTART.md). CI runs only `misc`, which needs none of
 * them; the rest run locally via docker compose.
 */
export default defineConfig({
  test: {
    include: ['test/integration/**/*.{js,ts}'],
    globals: true,
    environment: 'node',
    /*
     * Pinned to UTC because these suites are compared against a recorded
     * baseline that CI shares. Rank seasons and the daily-quest / free-card
     * rollovers are date-boundary logic, so a developer in CEST and a runner in
     * UTC disagreed about one rank test -- which showed up as baseline drift
     * rather than as anything to do with the change under test.
     */
    env: { TZ: 'UTC' },
    setupFiles: ['./test/setup-tsx.mjs'],
    testTimeout: 60000,
    hookTimeout: 120000,
    pool: 'forks',
    isolate: true,
    sequence: { concurrent: false },
    fileParallelism: false, // they share database state and test users
  },
});
