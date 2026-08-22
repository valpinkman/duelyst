#!/usr/bin/env node
/*
 * mocha `before`/`after` -> vitest `beforeAll`/`afterAll`.
 *
 * vitest's `globals: true` provides beforeAll/beforeEach/afterAll/afterEach but
 * NOT mocha's bare `before`/`after`. test/unit had none, so the original
 * mocha-to-vitest codemod never needed this; test/integration is full of them,
 * and because CI only ever ran `test:integration:misc` (which has none), the
 * other 14 files have been failing to even LOAD since mocha was retired.
 *
 * Line-anchored on purpose: only a call at the start of a line is a hook.
 * There are no `.before(`/`.after(` method calls in these files (checked), but
 * anchoring means a future one cannot be caught by accident.
 *
 * Usage: node tools/codemods/mocha-hooks-to-vitest.mjs <files...>
 */
import { readFileSync, writeFileSync } from 'node:fs';

let changed = 0;
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  const out = src
    .replace(/^(\s*)before\(/gm, '$1beforeAll(')
    .replace(/^(\s*)after\(/gm, '$1afterAll(');
  if (out !== src) {
    writeFileSync(file, out);
    changed += 1;
    console.log(`rewrote ${file}`);
  }
}
console.log(`${changed} file(s) changed`);
