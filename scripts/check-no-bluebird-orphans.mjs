#!/usr/bin/env node
/*
 * Fails if any file uses a bluebird-only Promise API without requiring bluebird.
 *
 * Written after exactly that slipped through: worker/worker.ts and server/api.ts
 * kept calling Promise.longStackTraces() after their bluebird require was
 * dropped, because the scan that cleared them checked a hand-written list of
 * idioms that happened not to include it. The services crashed on boot with
 * "Promise.longStackTraces is not a function".
 *
 * The list below is the bluebird surface that native Promise does NOT have.
 * Prefer adding to it over trimming it: a false positive costs a look, a false
 * negative costs a production crash.
 */
import fs from 'node:fs';
import cp from 'node:child_process';

const BLUEBIRD_ONLY = [
  'promisifyAll', 'promisify', 'defer', 'join', 'method', 'attempt', 'props',
  'each', 'mapSeries', 'reduce', 'some', 'filter', 'map', 'delay', 'config',
  'longStackTraces', 'onPossiblyUnhandledRejection', 'coroutine', 'spawn',
  'using', 'disposer', 'settle', 'fromCallback', 'fromNode', 'bind',
  'TimeoutError', 'CancellationError', 'OperationalError',
];
const STATIC = new RegExp(`\\bPromise\\s*\\.\\s*(${BLUEBIRD_ONLY.join('|')})\\b`);
const CHAIN = /^[ \t]*\.(spread|tap|nodeify|asCallback|thenReturn|thenThrow|error|cancellable|timeout|delay|bind|return|throw)\s*\(/m;

/*
 * bluebird's SYNCHRONOUS INSPECTION api. Called on a stored promise rather than
 * in chain position, so it looks nothing like a promise combinator and none of
 * the other patterns here catch it. Dropping bluebird from 206 files left eight
 * call sites asking `.isFulfilled()` of a native promise; the first one to run
 * threw "this._contentOnlyPromise.isFulfilled is not a function" and hung the
 * login -> registration transition. Unit tests, lint and typecheck were all
 * green; only the e2e run caught it.
 *
 * A file is considered fine if it obtains its promise from something that
 * returns an inspectable one -- either PromiseUtils.inspectable directly, or
 * whenRequiredResourcesReady(), which package_manager wraps centrally.
 */
const INSPECT = /\.(isFulfilled|isPending|isRejected|isCancelled|value|reason)\s*\(\s*\)/;

/*
 * bluebird's `.call('method')` / `.get('prop')`, which invoke a method or read a
 * property on the resolved value. These appear MID-LINE (`.then(_).call('size')`
 * in r-timeseries), so the line-anchored CHAIN pattern above cannot see them.
 *
 * Matching is deliberately narrow -- `.call(` followed by a STRING LITERAL --
 * because Function.prototype.call is everywhere in this codebase and takes a
 * thisArg, virtually never a bare string. Widening this to all `.call(`/`.get(`
 * would drown the check in false positives from Backbone's .get and config.get,
 * which is the mistake every earlier scan in this migration made.
 */
const CALL_GET = /\)\s*\.(call|get)\s*\(\s*['"`]/;
const INSPECT_OK = /inspectable|whenRequiredResourcesReady/;

function strip(src) {
  let out = ''; let i = 0; const n = src.length;
  while (i < n) {
    const c = src[i]; const d = src[i + 1];
    if (c === '/' && d === '/') { while (i < n && src[i] !== '\n') i += 1; continue; }
    if (c === '/' && d === '*') { i += 2; while (i < n && !(src[i] === '*' && src[i + 1] === '/')) i += 1; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; out += ' '; i += 1;
      while (i < n && src[i] !== q) { if (src[i] === '\\') i += 1; i += 1; }
      i += 1; continue;
    }
    out += c; i += 1;
  }
  return out;
}

/*
 * bin/ and config/ are in this list because leaving them out is exactly how the
 * last one got through: `bin/api` did `global.Promise = require('bluebird')`,
 * replacing the global Promise for the whole api process, and a scan limited to
 * app/server/worker/test/scripts could not see it. The api container then
 * failed to boot with "Cannot find module 'bluebird'" once the dependency was
 * removed. bin/* have no extension, hence the explicit paths.
 */
const files = cp.execSync(
  "{ grep -rl 'Promise' app server worker test scripts config --include='*.ts' --include='*.js' --include='*.mjs'; grep -rl 'Promise' bin cli 2>/dev/null; } 2>/dev/null || true",
).toString().trim().split('\n').filter(Boolean)
  .filter((f) => !f.startsWith('scripts/codemods/') && !f.startsWith('scripts/check-'));

const orphans = [];
for (const f of files) {
  const raw = fs.readFileSync(f, 'utf8');
  if (/require\(['"]bluebird['"]\)/.test(raw)) continue;   // legitimately has bluebird
  const live = strip(raw);
  const hits = [];
  const m = live.match(STATIC);
  if (m) hits.push(`Promise.${m[1]}`);
  const c = live.match(CHAIN);
  // `.delay(ms)` is also kue's JOB BUILDER method, and conflating the two is not
  // hypothetical: a stage 6 codemod rewrote `Jobs.create(...).delay(ms)` into
  // `.then((v) => PromiseUtils.delay(ms, v))` in all four matchmaking jobs. A kue
  // Job has no .then, so every matchmaking re-queue threw TypeError -- retry and
  // backoff were dead until it was found while measuring the kue replacement.
  if (c && !(c[1] === 'delay' && /Jobs\.create\(/.test(live))) hits.push(`.${c[1]}()`);
  const ins = live.match(INSPECT);
  if (ins && !INSPECT_OK.test(live) && ins[1] !== 'value' && ins[1] !== 'reason') hits.push(`.${ins[1]}()`);
  const cg = live.match(CALL_GET);
  if (cg) hits.push(`.${cg[1]}('...')`);
  if (hits.length) orphans.push([f, hits]);
}

if (orphans.length) {
  console.error('bluebird-only API used without requiring bluebird:');
  for (const [f, h] of orphans) console.error(`  ${f}: ${h.join(', ')}`);
  process.exit(1);
}
console.log(`no bluebird orphans (${files.length} files checked)`);
