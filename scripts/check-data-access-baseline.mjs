#!/usr/bin/env node
/**
 * Runs the data_access integration suites and compares the set of failing
 * tests against a recorded baseline.
 *
 * These suites carry 59 failures that are almost entirely stale 2016
 * game-balance expectations -- a booster pack asserted at 100 gold where the
 * SDK says 50, and so on. Waiting for all of them to be rewritten before CI
 * runs any of it would mean 575 tests, which have already found ten production
 * bugs, keep guarding nothing in the meantime.
 *
 * So the gate is a ratchet rather than a pass/fail: CI fails if a test that
 * used to pass starts failing, and equally if a known-failing test starts
 * passing without the baseline being updated. The second half is what stops
 * this becoming a place to quietly park regressions -- the list can only
 * shrink, and shrinking it is a deliberate edit.
 *
 * This is only honest because the suites are deterministic: three consecutive
 * fresh-database runs produce an identical failure set. If that stops being
 * true, fix the flake rather than widening the baseline.
 *
 *   node scripts/check-data-access-baseline.mjs            # check
 *   node scripts/check-data-access-baseline.mjs --update   # re-record
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(root, 'test/integration/data_access/known-failures.txt');
const UNSTABLE = join(root, 'test/integration/data_access/known-unstable.txt');

const readList = (file) =>
  new Set(
    readFileSync(file, 'utf8')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !l.startsWith('#')),
  );
const update = process.argv.includes('--update');

const outFile = join(mkdtempSync(join(tmpdir(), 'da-baseline-')), 'results.json');

const run = spawnSync(
  'node_modules/.bin/vitest',
  [
    'run',
    '--config',
    'vitest.integration.config.mjs',
    'test/integration/data_access',
    '--reporter=json',
    '--outputFile',
    outFile,
  ],
  { cwd: root, stdio: ['ignore', 'inherit', 'inherit'] },
);

if (!existsSync(outFile)) {
  console.error(
    `\nvitest produced no report (exit ${run.status}). That is an infrastructure ` +
      `failure, not a test result -- check Postgres, Redis and the Firebase emulator.`,
  );
  process.exit(1);
}

const report = JSON.parse(readFileSync(outFile, 'utf8'));

/*
 * The key carries the file, because the same test name can legitimately exist
 * in two suites and collapsing them would let one regress unnoticed.
 *
 * A file can also fail with NO failing assertion -- an empty describe reports
 * "No test found in suite", and a file that fails to load reports nothing at
 * all. Those must count as drift too, or a whole suite could stop running and
 * the ratchet would call it clean.
 */
const failing = new Set();
let total = 0;
for (const suite of report.testResults ?? []) {
  const file = suite.name.split('/').pop();
  let failedHere = 0;
  for (const t of suite.assertionResults ?? []) {
    total++;
    if (t.status === 'failed') {
      failedHere++;
      failing.add(`${file} > ${t.ancestorTitles.join(' > ')} > ${t.title}`);
    }
  }
  if (suite.status === 'failed' && failedHere === 0) {
    failing.add(`${file} :: suite failed without any failing assertion`);
  }
}

if (total === 0) {
  console.error('\nno tests ran at all -- treating as an infrastructure failure.');
  process.exit(1);
}

// --emit=<path>: write the raw failing set (before any exclusion) and stop.
// Used to derive the baseline and the unstable list from repeated runs.
const emitArg = process.argv.find((a) => a.startsWith('--emit='));
if (emitArg) {
  const out = emitArg.slice('--emit='.length);
  writeFileSync(out, [...failing].sort().join('\n') + '\n');
  console.log(`emitted ${failing.size} failing of ${total} to ${out}`);
  process.exit(0);
}

/*
 * Tests that are not reproducible even on a fresh database are excluded from
 * both sides of the comparison: they cannot fail the gate, and they cannot be
 * claimed as fixed either. Each one is debt recorded in known-unstable.txt.
 */
const unstable = readList(UNSTABLE);
for (const name of unstable) failing.delete(name);
const sorted = [...failing].sort();

if (update) {
  writeFileSync(
    BASELINE,
    `# Tests in test/integration/data_access that are known to fail.\n` +
      `# Regenerate deliberately with: pnpm check:data-access --update\n` +
      `# The list may shrink; it should not grow.\n` +
      sorted.map((n) => `${n}\n`).join(''),
  );
  console.log(
    `recorded ${sorted.length} known failures of ${total} tests ` +
      `(${unstable.size} unstable test(s) excluded)`,
  );
  process.exit(0);
}

const baseline = readList(BASELINE);
// Unstable tests are subtracted from BOTH sides. Dropping them only from the
// current run would make any that are also recorded in the baseline look like
// they had just started passing.
for (const name of unstable) baseline.delete(name);

const newlyFailing = sorted.filter((n) => !baseline.has(n));
const newlyPassing = [...baseline].filter((n) => !failing.has(n)).sort();

console.log(`\ndata_access: ${failing.size} failing of ${total} (baseline ${baseline.size})`);

if (newlyFailing.length > 0) {
  console.error(`\n${newlyFailing.length} test(s) that were passing now FAIL:`);
  for (const n of newlyFailing) console.error(`  ${n}`);
}
if (newlyPassing.length > 0) {
  console.error(
    `\n${newlyPassing.length} known-failing test(s) now PASS. Good -- shrink the baseline:\n` +
      `  pnpm check:data-access --update`,
  );
  for (const n of newlyPassing) console.error(`  ${n}`);
}

if (newlyFailing.length > 0 || newlyPassing.length > 0) process.exit(1);
console.log('no drift from the recorded baseline');
