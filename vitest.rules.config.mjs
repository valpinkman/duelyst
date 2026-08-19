import { defineConfig } from 'vitest/config';

/*
 * Security-rules tests. Separate from the other configs because they need the
 * Firebase database emulator running (see the `test:rules` script, which wraps
 * this in `firebase emulators:exec`) and nothing else in the repo does.
 */
export default defineConfig({
  test: {
    include: ['test/rules/**/*.spec.mjs'],
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
    fileParallelism: false,
  },
});
