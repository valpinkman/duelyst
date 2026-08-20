#!/usr/bin/env node
/*
 * Remove `const _chainState = {}` declarations that SHADOW an outer one.
 *
 * The bluebird `.bind(this)` migration replaced chain-bound state with a
 * per-call `_chainState` object. Where a nested callback got its own
 * declaration, it hides the outer one: the callback writes to the inner object
 * and the caller then reads the outer, which is still empty.
 *
 * In the data_access suites that silently returns `undefined` for a created
 * user id, so the next call gets undefined and dies somewhere unrelated
 * (`wipeUserData` throwing on `userId.blue`). Production code was fixed at the
 * time; the suites were not, because they were not runnable and nobody saw it.
 *
 * Deleting the inner declaration makes the callback assign to the outer object,
 * which is what the code intends.
 *
 * Usage: node scripts/codemods/fix-shadowed-chainstate.mjs <files...>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from '@typescript-eslint/parser';

const FN = new Set(['FunctionDeclaration', 'FunctionExpression', 'ArrowFunctionExpression']);

const chainStateDecl = (node) => {
  const body = node.body && node.body.type === 'BlockStatement' ? node.body.body : [];
  return body.find((s) => s.type === 'VariableDeclaration'
    && s.declarations.length === 1
    && s.declarations[0].id.type === 'Identifier'
    && s.declarations[0].id.name === '_chainState');
};

let files = 0; let removed = 0;
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  let ast;
  try { ast = parse(src, { range: true }); } catch { continue; }

  const cuts = [];
  const visit = (node, depth) => {
    if (!node || typeof node.type !== 'string') return;
    let next = depth;
    if (FN.has(node.type)) {
      const decl = chainStateDecl(node);
      if (decl) {
        if (depth > 0) cuts.push(decl.range);      // nested: shadows an outer one
        next = depth + 1;
      }
    }
    for (const k of Object.keys(node)) {
      if (k === 'parent') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && visit(c, next));
      else if (v && typeof v.type === 'string') visit(v, next);
    }
  };
  visit(ast, 0);

  if (!cuts.length) continue;
  let out = src;
  for (const [start, end] of cuts.sort((a, b) => b[0] - a[0])) {
    // take the whole line, including its indentation and newline
    let s = start; while (s > 0 && out[s - 1] !== '\n') s -= 1;
    let e = end; while (e < out.length && out[e] !== '\n') e += 1;
    out = out.slice(0, s) + out.slice(e + 1);
    removed += 1;
  }
  try { parse(out, { range: true }); } catch (err) {
    console.error(`  !! ${file}: output does not parse (${err.message})`); continue;
  }
  writeFileSync(file, out);
  files += 1;
  console.log(`  ${file}: ${cuts.length} removed`);
}
console.log(`\nremoved ${removed} shadowing declaration(s) across ${files} file(s)`);
