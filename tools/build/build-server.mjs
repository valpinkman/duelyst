#!/usr/bin/env node
/**
 * Ahead-of-time build for the server-side runtime (api, game, single_player,
 * worker, worker-ui).
 *
 * Until now every service registered `tsx/cjs` and compiled TypeScript at
 * require time, on every boot. That is fine for the dev loop and wasteful for
 * a deploy: a cold container spent ~4.6 s reaching /health where a warm one
 * needed ~0.9 s, and tsx wrote a 13 MB compile cache into /tmp each time.
 *
 * Two deliberate choices:
 *
 * 1. **Transpile-only, with esbuild -- not `tsc`.** tsx *is* esbuild, so
 *    compiling the same files with the same tsconfig ahead of time produces
 *    what the hook produced at runtime. Going through `tsc` instead would
 *    change the emit and drag in the 364-error typecheck backlog, which is a
 *    metric here, not a gate. Types are checked by `pnpm typecheck`; this step
 *    only strips them.
 *
 * 2. **Mirror the source tree instead of bundling.** Root-absolute requires
 *    (`require('@duelyst/config')`, `require('@duelyst/sdk/...')`) resolve through
 *    node's own resolution, so as long as build/ has the same shape, every require
 *    string keeps working untouched. Bundling would also flatten the
 *    "module.exports before require" idiom the codebase uses to survive
 *    circular requires -- see AGENTS.md.
 *
 * `useDefineForClassFields` is the detail that matters most: the real
 * tsconfig is handed to esbuild verbatim, because instance property layout IS
 * the wire format for game state and replays. With target es2020 that setting
 * is false, so `declare` fields emit nothing and initialised fields assign in
 * the constructor -- exactly what the runtime hook does today.
 */
import { transform } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const outRoot = path.join(root, 'build');

/** Everything a service process can reach. Mirrors what the Dockerfiles COPY. */
const TREES = [
  'packages/sdk',
  'packages/common',
  'packages/data',
  'apps/server',
  'apps/worker',
  'packages/config',
  'bin',
];

/*
 * name -> path, relative to build/node_modules/<scope>/. Every tree above that
 * is consumed as a named package needs an entry here.
 */
const WORKSPACE_LINKS = [
  { name: '@duelyst/sdk', target: '../../packages/sdk' },
  { name: '@duelyst/common', target: '../../packages/common' },
  { name: '@duelyst/data', target: '../../packages/data' },
  { name: '@duelyst/server', target: '../../apps/server' },
  { name: '@duelyst/worker', target: '../../apps/worker' },
  { name: '@duelyst/config', target: '../../packages/config' },
];
const ROOT_FILES = ['version.json'];

/** Not reachable at runtime, or actively unwanted in a deployed tree. */
const SKIP_DIRS = new Set(['node_modules', '.turbo', '__snapshots__']);
const SKIP_EXT = new Set(['.md', '.log', '.map']);

/** The real compiler options, so the emit cannot drift from `pnpm typecheck`. */
const tsconfig = JSON.parse(
  fs.readFileSync(path.join(root, 'tsconfig.json'), 'utf8').replace(/^\s*\/\/.*$/gm, ''),
);
const tsconfigRaw = JSON.stringify({ compilerOptions: tsconfig.compilerOptions });

function* walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') && entry.name !== '.gitignore') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      yield* walk(full);
    } else if (entry.isFile()) {
      yield full;
    }
  }
}

const stats = { transpiled: 0, copied: 0, skipped: 0 };

async function emit(file) {
  const rel = path.relative(root, file);
  const ext = path.extname(file);

  if (SKIP_EXT.has(ext) || rel.endsWith('.d.ts')) {
    stats.skipped++;
    return;
  }

  // .ts -> .js at the same path; everything else (.js, .json, .hbs, and the
  // extensionless bin/* scripts) is already runnable and is copied verbatim.
  const isTs = ext === '.ts';
  const outPath = path.join(outRoot, isTs ? rel.slice(0, -3) + '.js' : rel);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  if (!isTs) {
    fs.copyFileSync(file, outPath);
    stats.copied++;
    return;
  }

  const source = fs.readFileSync(file, 'utf8');
  const result = await transform(source, {
    loader: 'ts',
    format: 'cjs',
    target: 'node24',
    tsconfigRaw,
    sourcemap: 'inline',
    sourcefile: rel,
    sourcesContent: false,
  });
  for (const warning of result.warnings) {
    console.warn(`[build-server] ${rel}: ${warning.text}`);
  }
  fs.writeFileSync(outPath, result.code);
  stats.transpiled++;
}

const started = Date.now();
fs.rmSync(outRoot, { recursive: true, force: true });

const files = [];
for (const tree of TREES) {
  const dir = path.join(root, tree);
  if (!fs.existsSync(dir)) {
    console.warn(`[build-server] missing tree, skipped: ${tree}`);
    continue;
  }
  files.push(...walk(dir));
}
for (const f of ROOT_FILES) {
  const full = path.join(root, f);
  if (fs.existsSync(full)) files.push(full);
}

await Promise.all(files.map(emit));

/*
 * Workspace packages are required by package name (`require('@duelyst/sdk/...')`),
 * which node resolves through node_modules.
 * The repo-root symlink points at the *source* tree, so from build/ that would
 * reach packages/sdk/*.ts -- and production runs without the tsx hook, so the
 * require fails outright. Giving the build tree its own node_modules makes the
 * same specifier land on the transpiled copy: node walks up from
 * build/server/api.js and finds build/node_modules first.
 *
 * The link is relative on purpose, so it still points somewhere real after
 * `COPY build/ ...` into an image.
 */
for (const pkg of WORKSPACE_LINKS) {
  const linkPath = path.join(root, 'build', 'node_modules', pkg.name);
  fs.mkdirSync(path.dirname(linkPath), { recursive: true });
  fs.rmSync(linkPath, { force: true, recursive: true });
  fs.symlinkSync(pkg.target, linkPath, 'junction');
}

console.log(
  `[build-server] build/ ready in ${Date.now() - started}ms ` +
    `(${stats.transpiled} transpiled, ${stats.copied} copied, ${stats.skipped} skipped)`,
);
