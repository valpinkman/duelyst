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
    setupFiles: ['./test/setup-tsx.mjs'],
    testTimeout: 60000,
    hookTimeout: 120000,
    pool: 'forks',
    isolate: true,
    sequence: { concurrent: false },
    fileParallelism: false, // they share database state and test users
  },
});
