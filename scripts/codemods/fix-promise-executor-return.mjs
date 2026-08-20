#!/usr/bin/env node
/*
 * Fixes eslint's no-promise-executor-return.
 *
 * These violations are PRE-EXISTING; they only became visible when the local
 * `const Promise = require('bluebird')` shadow was removed, because until then
 * eslint could not tell that `new Promise(...)` was the native constructor.
 *
 * Two shapes, both transformed so control flow is provably unchanged:
 *
 *   new Promise((res) => doThing())      ->  new Promise((res) => { doThing(); })
 *   return resolve(x);   (last stmt)     ->  resolve(x);
 *   return resolve(x);   (mid-block)     ->  resolve(x); return;
 *   if (err) return reject(err);         ->  if (err) { reject(err); return; }
 *
 * That last case is why placement is parent-aware rather than a blanket
 * rewrite. A bare `return X;` can be the UN-BRACED body of an `if`, and
 * rewriting it to `if (err) reject(err); return;` would make the return
 * unconditional and silently change behaviour. Only there is a block added;
 * adding one everywhere would be safe too but trips no-lone-blocks, and a
 * trailing `return;` on the final statement trips no-useless-return.
 *
 * Only the executor's OWN body is touched; returns inside nested callbacks are
 * left alone, matching the rule's own scope.
 */
import fs from 'node:fs';
import { parse } from '@typescript-eslint/parser';

const FN = new Set(['FunctionExpression', 'ArrowFunctionExpression']);

const collect = (node, visit) => {
  if (!node || typeof node.type !== 'string') return;
  visit(node);
  for (const k of Object.keys(node)) {
    if (k === 'parent') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && collect(c, visit));
    else if (v && typeof v.type === 'string') collect(v, visit);
  }
};

// returns directly inside fn's body, not inside a nested function.
// Each is returned with its parent, so placement can be decided per site.
const ownReturns = (fn) => {
  const out = [];
  const walk = (node, parent) => {
    if (!node || typeof node.type !== 'string') return;
    if (node !== fn && FN.has(node.type)) return;
    if (node.type === 'ReturnStatement' && node.argument) out.push({ node, parent });
    for (const k of Object.keys(node)) {
      if (k === 'parent') continue;
      const v = node[k];
      if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, node));
      else if (v && typeof v.type === 'string') walk(v, node);
    }
  };
  walk(fn.body, null);
  return out;
};

let files = 0;
let fixed = 0;

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(src, { range: true, loc: true, jsx: false });
  } catch (e) {
    console.error(`  parse failed ${file}: ${e.message}`);
    continue;
  }

  const edits = [];
  collect(ast, (node) => {
    if (node.type !== 'NewExpression') return;
    if (!node.callee || node.callee.name !== 'Promise') return;
    const fn = node.arguments && node.arguments[0];
    if (!fn || !FN.has(fn.type)) return;

    if (fn.type === 'ArrowFunctionExpression' && fn.body.type !== 'BlockStatement') {
      const [s, e] = fn.body.range;
      edits.push([s, e, `{ ${src.slice(s, e)}; }`]);
      return;
    }
    for (const { node: r, parent } of ownReturns(fn)) {
      const [s, e] = r.range;
      const [as, ae] = r.argument.range;
      const expr = src.slice(as, ae);
      const inBlock = parent && parent.type === 'BlockStatement';
      if (!inBlock) {
        // un-braced `if (x) return y;` - a block is required to keep the
        // return conditional
        edits.push([s, e, `{ ${expr}; return; }`]);
      } else if (parent.body[parent.body.length - 1] === r) {
        // last statement: falling off the end is the same as returning
        edits.push([s, e, `${expr};`]);
      } else {
        edits.push([s, e, `${expr}; return;`]);
      }
    }
  });

  if (!edits.length) continue;
  edits.sort((a, b) => b[0] - a[0]); // apply back-to-front so ranges stay valid
  let out = src;
  for (const [s, e, text] of edits) out = out.slice(0, s) + text + out.slice(e);

  try {
    parse(out, { range: true });
  } catch (e) {
    console.error(`  !! ${file}: output does not parse, skipping (${e.message})`);
    continue;
  }
  fs.writeFileSync(file, out);
  files += 1;
  fixed += edits.length;
  console.log(`  ${file}: ${edits.length} fixed`);
}
console.log(`\n${fixed} executor return(s) fixed across ${files} file(s)`);
