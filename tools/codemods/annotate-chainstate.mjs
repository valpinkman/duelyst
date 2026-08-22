#!/usr/bin/env node
/*
 * `const _chainState = {}` -> `const _chainState: Record<string, any> = {}`.
 *
 * These objects come from the promise-chain codemod that replaced bluebird's
 * `.bind(this)` state passing (see MODERNIZATION_PLAN.md). They are untyped
 * bags whose shape is built up across a chain, so TypeScript infers `{}` and
 * every subsequent property access is a TS2339 error - thousands of them.
 *
 * The annotation is erased at runtime. It is deliberately `Record<string, any>`
 * rather than a real shape: these bags are per-chain scratch space, and
 * inventing an interface for each would be noise. Giving them real types is a
 * later, per-file exercise.
 *
 * Usage: node tools/codemods/annotate-chainstate.mjs <files...>
 */
import { readFileSync, writeFileSync } from 'node:fs';

let changed = 0;
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  const out = src.replaceAll(
    'const _chainState = {};',
    'const _chainState: Record<string, any> = {};',
  );
  if (out !== src) {
    writeFileSync(file, out);
    changed += 1;
  }
}
console.log(`${changed} file(s) changed`);
