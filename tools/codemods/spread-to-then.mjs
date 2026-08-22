#!/usr/bin/env node
/*
 * bluebird `.spread(fn)` -> native `.then(([...]) => ...)`.
 *
 * `.spread` takes a promise resolving to an ARRAY and applies it as separate
 * arguments. Native promises have no such thing; destructuring in the `.then`
 * parameter does exactly the same job:
 *
 *   .spread((a, b) => ...)              ->  .then(([a, b]) => ...)
 *   .spread(function (a, b) { ... })    ->  .then(function ([a, b]) { ... })
 *
 * The `function` form is preserved rather than arrowed, because these chains
 * rely on bluebird's `.bind()` to set `this` and an arrow would capture the
 * enclosing `this` instead. Those `.bind()` chains are converted separately;
 * this step must not change what `this` means.
 *
 * Safe to run while bluebird is still installed: a bluebird promise's `.then`
 * behaves identically here, so this stage stands alone and stays green.
 *
 * Verified before running: none of the 402 call sites use default values, rest
 * params or existing destructuring, so a parameter-list rewrite is sufficient.
 *
 * Usage: node tools/codemods/spread-to-then.mjs <files...>
 */
import { readFileSync, writeFileSync } from 'node:fs';

const RE = /\.spread\(\s*(function\s*[A-Za-z0-9_$]*\s*)?\(([^)]*)\)/g;

let changed = 0;
let sites = 0;
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  let n = 0;
  const out = src.replace(RE, (m, fn, params) => {
    n += 1;
    // a trailing comma in the param list would become one inside the array
    // pattern, which is a lint error
    const inner = params.trim().replace(/,\s*$/, '');
    // `.spread(() => ...)` has nothing to destructure; `([])` is an empty
    // array pattern, which is both meaningless and a lint error.
    return inner ? `.then(${fn || ''}([${inner}])` : `.then(${fn || ''}()`;
  });
  if (n) {
    writeFileSync(file, out);
    changed += 1;
    sites += n;
  }
}
console.log(`${changed} file(s), ${sites} .spread call(s) converted`);
