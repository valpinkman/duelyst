/*
 * Batch decaffeinate runner (MODERNIZATION_PLAN.md Phase 5).
 *
 * For each given .coffee file:
 *   1. decaffeinate --disallow-invalid-constructors  (X.coffee -> X.js)
 *   2. delete the .coffee source
 *   3. repo-wide, rewrite requires that referenced "<dir>/<name>.coffee" to
 *      the extension-less form (eslint's import/extensions demands the
 *      extension while the target is coffee and forbids it once it is js)
 *   4. eslint --fix the new .js files
 *
 * Usage: node scripts/codemods/decaffeinate-batch.mjs <file.coffee> [...]
 * Verify after every batch: mocha + vitest + build:client + gulp build.
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();
const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('usage: node scripts/codemods/decaffeinate-batch.mjs <file.coffee> [...]');
  process.exit(1);
}

const SEARCH_ROOTS = ['app', 'server', 'worker', 'test', 'scripts', 'cli', 'gulp'];
const SKIP_DIRS = new Set([
  'app/vendor',
  'app/resources',
  'app/original_resources',
  'node_modules',
  'scripts/codemods',
]);

function* walk(dir) {
  if (SKIP_DIRS.has(dir)) return;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) yield* walk(p);
    else if (/\.(js|coffee|mjs)$/.test(p)) yield p;
  }
}

const converted = [];
const failed = [];
for (const file of files) {
  if (!file.endsWith('.coffee') || !fs.existsSync(file)) {
    console.error(`skip (not a coffee file or missing): ${file}`);
    continue;
  }
  try {
    execFileSync(
      'node',
      ['node_modules/decaffeinate/bin/decaffeinate', '--disallow-invalid-constructors', file],
      { stdio: 'pipe' },
    );
    // decaffeinate exits 0 even when it refuses a file (e.g. invalid
    // constructors) - only trust it if the .js actually materialized
    if (!fs.existsSync(file.replace(/\.coffee$/, '.js'))) {
      throw new Error('decaffeinate produced no output (likely an unconvertible constructor)');
    }
    fs.rmSync(file);
    converted.push(file);
    console.log(`converted ${file}`);
  } catch (err) {
    failed.push(file);
    console.error(`FAILED ${file}: ${String(err.stderr || err.message).slice(0, 300)}`);
  }
}

// rewrite requires of the converted files: match on the last two path
// segments so same-named files in different directories don't collide
if (converted.length > 0) {
  // two forms per converted file: "<dir>/<name>.coffee" and same-directory
  // "./<name>.coffee"
  const suffixes = converted.flatMap((f) => {
    const segs = f.split('/');
    return [segs.slice(-2).join('/'), `./${segs[segs.length - 1]}`];
  });
  let rewrites = 0;
  for (const root of SEARCH_ROOTS) {
    for (const p of walk(root)) {
      let src = fs.readFileSync(p, 'utf8');
      let out = src;
      for (const suffix of suffixes) {
        const bare = suffix.replace(/\.coffee$/, '');
        out = out.split(suffix).join(bare);
      }
      if (out !== src) {
        fs.writeFileSync(p, out);
        rewrites += 1;
      }
    }
  }
  console.log(`${rewrites} file(s) had .coffee requires rewritten`);
  try {
    execFileSync(
      'node',
      [
        'node_modules/eslint/bin/eslint.js',
        '--quiet',
        '--fix',
        ...converted.map((f) => f.replace(/\.coffee$/, '.js')),
      ],
      { stdio: 'inherit', cwd: rootDir },
    );
  } catch {
    console.error('eslint --fix left unfixable problems; inspect manually');
  }
}

console.log(`\n${converted.length} converted, ${failed.length} failed`);
if (failed.length > 0) {
  console.log('failed files:');
  failed.forEach((f) => console.log(`  ${f}`));
  process.exitCode = 2;
}
