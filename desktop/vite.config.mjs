import { defineConfig } from 'vite';
import path from 'node:path';
import { builtinModules } from 'node:module';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url));

/*
 * Builds the Electron main and preload processes.
 *
 * Everything except `electron` itself is BUNDLED, so the packaged app carries
 * no node_modules at all. That keeps the shell a couple of files instead of a
 * dependency tree, and it sidesteps the packager's dependency walking, which
 * does not cope with pnpm's symlinked store.
 *
 * The renderer is not built here: it is the game client, produced by the root
 * `pnpm build`, and copied in as an unpacked resource at package time.
 */
/*
 * Built once per entry (`vite build --mode main`, then `--mode preload`).
 * They cannot share a build: with two entries the bundler hoists common code
 * into a chunk, and an Electron preload must be a SINGLE self-contained file -
 * it cannot require a sibling, which fails at runtime with
 * "module not found: ./rolldown-runtime-*.js".
 */
const ENTRIES = {
  main: { entry: 'desktop.js', out: 'main.cjs' },
  preload: { entry: 'renderer-preload.js', out: 'preload.cjs' },
};

export default defineConfig(({ mode }) => {
  const target = ENTRIES[mode];
  if (!target) throw new Error(`run with --mode main or --mode preload (got: ${mode})`);
  return {
    root: rootDir,
    build: {
      outDir: 'build',
      emptyOutDir: mode === 'main', // the first build clears, the second adds
      target: 'node22', // Electron 43 ships Node 22
      minify: false,
      sourcemap: true,
      lib: {
        entry: path.resolve(rootDir, target.entry),
        formats: ['cjs'],
        fileName: () => target.out,
      },
      rollupOptions: {
        external: ['electron', ...builtinModules.flatMap((m) => [m, `node:${m}`])],
        output: { inlineDynamicImports: true },
      },
    },
  };
});
