#!/usr/bin/env node
/*
 * `Array.from(x)` -> `Array.from<any>(x)`.
 *
 * decaffeinate emits `Array.from(...)` for CoffeeScript `for x in y` loops, and
 * did so inconsistently: 834 sites already carry the explicit `<any>` and ~194
 * do not. Without it TypeScript infers `unknown[]`, so the LOOP VARIABLE is
 * `unknown` and every property access on it inside the loop body is an error -
 * which is why the errors report on the body lines rather than on the
 * `Array.from` line itself.
 *
 * This is consistency with the existing majority, not typing: `<any>` silences
 * rather than describes. Real safety at these boundaries means defining
 * interfaces for the data flowing through them (game session data, knex rows),
 * which is a much larger and separate exercise.
 *
 * Only the single-argument form is rewritten. The two-argument
 * `Array.from(iter, mapFn)` overload takes two type parameters, so a lone
 * `<any>` would not compile - there are none today, and this keeps it that way.
 *
 * Usage: node scripts/codemods/array-from-any.mjs <files...>
 */
import { readFileSync, writeFileSync } from 'node:fs';

let changed = 0;
let sites = 0;
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  let n = 0;
  const out = src.replace(/\bArray\.from\(/g, (m) => {
    n += 1;
    return 'Array.from<any>(';
  });
  if (n) {
    writeFileSync(file, out);
    changed += 1;
    sites += n;
  }
}
console.log(`${changed} file(s), ${sites} site(s) annotated`);
