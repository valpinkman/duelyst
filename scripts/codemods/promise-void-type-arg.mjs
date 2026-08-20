#!/usr/bin/env node
/*
 * `new Promise((resolve) => { ... resolve() ... })`
 *   -> `new Promise<void>((resolve) => { ... resolve() ... })`
 *
 * TS2794: "Expected 1 arguments, but got 0. Did you forget to include 'void' in
 * your type argument to 'Promise'?" -- 128 of them, all the same shape: a
 * promise that resolves with no value, which TypeScript types as
 * Promise<unknown> and then rejects the argument-less resolve() call.
 *
 * The type argument is erased at compile time; no JavaScript changes.
 *
 * ONLY applied when EVERY call to that executor's resolve parameter passes no
 * argument. A promise that resolves with a value somewhere else would be
 * mistyped by `<void>`, so those are left for a human. Promises that already
 * carry a type argument are skipped.
 *
 * Usage: node scripts/codemods/promise-void-type-arg.mjs <files...>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from '@typescript-eslint/parser';

const walk = (node, fn) => {
  if (!node || typeof node.type !== 'string') return;
  fn(node);
  for (const k of Object.keys(node)) {
    if (k === 'parent') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, fn));
    else if (v && typeof v.type === 'string') walk(v, fn);
  }
};

let total = 0; let files = 0; let skipped = 0;
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  let ast;
  try { ast = parse(src, { range: true }); } catch { continue; }

  const edits = [];
  walk(ast, (node) => {
    if (node.type !== 'NewExpression') return;
    if (!node.callee || node.callee.name !== 'Promise') return;
    if (node.typeArguments || node.typeParameters) return;      // already typed
    const fn = node.arguments && node.arguments[0];
    if (!fn || !['ArrowFunctionExpression', 'FunctionExpression'].includes(fn.type)) return;
    const resolveParam = fn.params && fn.params[0];
    if (!resolveParam || resolveParam.type !== 'Identifier') return;

    let zeroArg = 0; let withArg = 0;
    walk(fn.body, (n) => {
      if (n.type === 'CallExpression' && n.callee
          && n.callee.type === 'Identifier' && n.callee.name === resolveParam.name) {
        if (n.arguments.length === 0) zeroArg += 1; else withArg += 1;
      }
    });
    if (zeroArg === 0) return;
    if (withArg > 0) { skipped += 1; return; }                  // mixed: leave alone

    edits.push(node.callee.range[1]);                           // just after `Promise`
  });

  if (!edits.length) continue;
  let out = src;
  for (const at of edits.sort((a, b) => b - a)) out = `${out.slice(0, at)}<void>${out.slice(at)}`;
  try { parse(out, { range: true }); } catch (e) {
    console.error(`  !! ${file}: output does not parse (${e.message})`);
    continue;
  }
  writeFileSync(file, out);
  total += edits.length; files += 1;
}
console.log(`added <void> to ${total} promise(s) across ${files} file(s); ${skipped} skipped as mixed resolve()/resolve(x)`);
