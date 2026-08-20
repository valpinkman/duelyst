#!/usr/bin/env node
/*
 * Drops `const Promise = require('bluebird')` from files that no longer use any
 * bluebird-only API, letting the native global Promise take over.
 *
 * Only ever run against a list produced by a COMMENT-STRIPPED scan. Scanning raw
 * text over-reports badly in this repo: dead CoffeeScript sitting in block
 * comments, `_.chain(...).filter().map()` from underscore, and PromiseUtils'
 * own helper names all look like bluebird idioms to a plain grep.
 *
 * Refuses to touch a file whose remaining text still mentions a bluebird-only
 * name, so a mistake in the caller's list fails loudly here instead of at
 * runtime.
 */
import fs from 'node:fs';

// The guard below must look at LIVE code only. This repo is full of dead
// CoffeeScript parked in block comments, which still reads as bluebird usage.
function stripCommentsAndStrings(src) {
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

const GUARD = /\bPromise\s*\.\s*(promisifyAll|promisify|defer|join|method|try|attempt|props|each|mapSeries|reduce|some|filter|map|delay|config|longStackTraces|onPossiblyUnhandledRejection|coroutine|using|disposer|settle|any|race|bind|TimeoutError|CancellationError|OperationalError|AggregateError)\b/;
const REQUIRE = /^[ \t]*(?:const|let|var)\s+Promise\s*=\s*require\(['"]bluebird['"]\);?[ \t]*\r?\n/m;

let dropped = 0;
const skipped = [];

for (const file of process.argv.slice(2)) {
  const before = fs.readFileSync(file, 'utf8');
  if (!REQUIRE.test(before)) { skipped.push([file, 'no bluebird require']); continue; }

  const after = before.replace(REQUIRE, '');
  if (GUARD.test(stripCommentsAndStrings(after))) { skipped.push([file, 'still uses a bluebird-only static']); continue; }

  fs.writeFileSync(file, after);
  dropped += 1;
}

console.log(`dropped the bluebird require from ${dropped} file(s)`);
for (const [f, why] of skipped) console.log(`  skipped ${f} (${why})`);
