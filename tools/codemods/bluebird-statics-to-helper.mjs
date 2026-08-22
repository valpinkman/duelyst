#!/usr/bin/env node
/*
 * bluebird statics -> PromiseUtils helpers.
 *
 *   Promise.map(...)   -> PromiseUtils.map(...)     (63 sites)
 *   Promise.each(...)  -> PromiseUtils.each(...)    (14)
 *   Promise.delay(...) -> PromiseUtils.delay(...)   (22)
 *   Promise.props(...) -> PromiseUtils.props(...)   (1)
 *
 * Safe as a textual replace, unusually: every one of the 215 files that pulls
 * in bluebird binds it as `const Promise = require('bluebird')` (verified: 175
 * const / 38 var / 2 let, 0 import-style), and NATIVE Promise has none of these
 * four statics. So `Promise.map(` in this repo is unambiguously bluebird.
 *
 * The bluebird require is deliberately left in place -- files still use
 * Promise.all/resolve/reject through it, and dropping the require is a separate
 * step so that this one is revertible on its own.
 */
import fs from 'node:fs';
import path from 'node:path';

const STATICS = ['map', 'each', 'props', 'delay'];
const HELPER = '@duelyst/common/utils/utils_promise';
const files = process.argv.slice(2);

const requirePathFor = (file) => {
  const rel = path.relative(path.dirname(path.resolve(file)), path.resolve(HELPER));
  return rel.startsWith('.') ? rel : `./${rel}`;
};

let totalSites = 0;
let totalFiles = 0;
let bindingsAdded = 0;

for (const file of files) {
  // never rewrite the helper itself, nor this codemod's own doc comment
  if (path.resolve(file) === path.resolve(`${HELPER}.ts`)) continue;
  if (path.resolve(file) === path.resolve(process.argv[1])) continue;

  const before = fs.readFileSync(file, 'utf8');
  let after = before;
  let sites = 0;

  for (const name of STATICS) {
    const re = new RegExp(`\\bPromise\\.${name}\\s*\\(`, 'g');
    const hits = (after.match(re) || []).length;
    if (hits) {
      after = after.replace(re, `PromiseUtils.${name}(`);
      sites += hits;
    }
  }

  if (!sites) continue;

  // Ensure PromiseUtils is bound. Missing bindings are the failure mode this
  // migration keeps producing (ReferenceError at runtime, invisible to lint),
  // so tools/check-promise-utils-bindings.mjs re-checks it afterwards.
  if (!/(?:const|let|var)\s+PromiseUtils\s*=\s*require\(/.test(after)) {
    const requires = [...after.matchAll(/^(?:const|let|var) .*= require\(.*\);$/gm)];
    if (!requires.length) {
      console.error(`  !! ${file}: ${sites} site(s) but no require to anchor a binding - SKIPPED`);
      continue;
    }
    const last = requires[requires.length - 1];
    const insertAt = last.index + last[0].length;
    const line = `\nconst PromiseUtils = require('${requirePathFor(file)}');`;
    after = after.slice(0, insertAt) + line + after.slice(insertAt);
    bindingsAdded += 1;
  }

  fs.writeFileSync(file, after);
  totalSites += sites;
  totalFiles += 1;
  console.log(`${file}: ${sites} site(s)`);
}

console.log(
  `\n${totalSites} bluebird static(s) converted across ${totalFiles} file(s); ${bindingsAdded} binding(s) added`,
);
