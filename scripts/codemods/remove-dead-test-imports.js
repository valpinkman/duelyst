#!/usr/bin/env node
// Codemod (plan step 1.2): remove imports of test libraries that are never
// used — `sinon` (imported by 15 integration files, zero call sites) — so the
// packages can be dropped from devDependencies ahead of the vitest switch.
// Idempotent; run from the repo root: node scripts/codemods/remove-dead-test-imports.js
const fs = require('fs');
const path = require('path');

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) return walk(p);
    return p.endsWith('.js') ? [p] : [];
  });
}

let changed = 0;
for (const file of walk('test')) {
  const src = fs.readFileSync(file, 'utf8');
  // only remove the import when the identifier is otherwise unused
  const out = src.replace(/^(const|var|let)\s+(\w+)\s*=\s*require\('sinon'\);\r?\n/m, (m, _kw, id) => {
    const rest = src.replace(m, '');
    return new RegExp(`\\b${id}\\b`).test(rest) ? m : '';
  });
  if (out !== src) {
    fs.writeFileSync(file, out);
    changed += 1;
    console.log('cleaned', file);
  }
}
console.log(`${changed} file(s) changed`);
