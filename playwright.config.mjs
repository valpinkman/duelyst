import { defineConfig, devices } from '@playwright/test';

/*
 * End-to-end tests (MODERNIZATION_PLAN.md "Later / optional" → now real).
 *
 * These drive the actual game client against a running local stack. They exist
 * because the migration repeatedly produced bugs that BUILD FINE and only fail
 * at runtime — a bundler plugin that stopped matching renamed files, an env
 * value baked in from the wrong config, a require whose extension went stale.
 * Unit tests and a green build cannot see any of those; a browser can.
 *
 * Prerequisites (see docs/QUICKSTART.md):
 *   1. a real Firebase Realtime Database configured in .env
 *   2. pnpm build
 *   3. docker compose up -d db redis api sp game worker
 *
 * Run: pnpm test:e2e        (headless)
 *      pnpm test:e2e:headed (watch it play)
 */
export default defineConfig({
  testDir: './test/e2e',
  // the client boots cocos2d, loads ~50 MB of assets and talks to Firebase
  timeout: 420_000, // registration + asset streaming + a full game turn
  expect: { timeout: 30_000 },
  fullyParallel: false,
  workers: 1, // the suite registers accounts and plays games against one stack
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['list']] : [['list']],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
    // WebGL is required: the game renders through cocos2d
    launchOptions: { args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] },
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
