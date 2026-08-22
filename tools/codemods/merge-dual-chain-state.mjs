#!/usr/bin/env node
/*
 * Merge `this_obj` into `_chainState` in functions that use BOTH for the same
 * property.
 *
 * The bluebird `.bind(this)` migration replaced chain-bound state with an
 * explicit object. Where a function had been converted twice -- or partially --
 * it ended up with two bags, and code writes a property on one while reading it
 * from the other. The read then yields undefined, silently.
 *
 * Only functions where a property is genuinely written on one bag and read from
 * the other are rewritten. Functions that merely declare both and keep them
 * separate are left alone: merging those could collide two unrelated properties
 * of the same name.
 *
 * Usage: node tools/codemods/merge-dual-chain-state.mjs <files...>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from '@typescript-eslint/parser';

const NAMES = ['_chainState', 'this_obj'];

const analyse = (fnNode) => {
  const acc = {
    _chainState: { read: new Set(), write: new Set() },
    this_obj: { read: new Set(), write: new Set() },
  };
  const decls = [];
  const refs = [];
  const scan = (n, parent) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'VariableDeclarator' && n.id.type === 'Identifier' && n.id.name === 'this_obj') {
      decls.push(parent && parent.type === 'VariableDeclaration' ? parent : n);
    }
    if (n.type === 'Identifier' && n.name === 'this_obj') refs.push(n);
    if (
      n.type === 'MemberExpression' &&
      n.object.type === 'Identifier' &&
      NAMES.includes(n.object.name) &&
      n.property &&
      n.property.name
    ) {
      const isWrite = parent && parent.type === 'AssignmentExpression' && parent.left === n;
      acc[n.object.name][isWrite ? 'write' : 'read'].add(n.property.name);
    }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && scan(c, n));
      else if (v && typeof v.type === 'string') scan(v, n);
    }
  };
  scan(fnNode.body || fnNode, null);

  const cross =
    [...acc.this_obj.write].some((p) => acc._chainState.read.has(p)) ||
    [...acc._chainState.write].some((p) => acc.this_obj.read.has(p));
  return { cross, decls, refs };
};

let files = 0;
let fixed = 0;
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(src, { range: true });
  } catch {
    continue;
  }

  const edits = [];
  const walk = (n) => {
    if (!n || typeof n.type !== 'string') return;
    if (n.type === 'MethodDefinition' || n.type === 'FunctionDeclaration') {
      const fn = n.type === 'MethodDefinition' ? n.value : n;
      const { cross, decls, refs } = analyse(fn);
      if (cross) {
        fixed += 1;
        for (const d of decls) edits.push({ kind: 'drop', range: d.range });
        const dropped = new Set(decls.map((d) => d.range[0]));
        for (const r of refs) {
          // skip identifiers that belong to a declaration we are removing
          if ([...dropped].some((s) => r.range[0] > s && r.range[0] < s + 60)) continue;
          edits.push({ kind: 'rename', range: r.range });
        }
      }
      return; // do not descend into nested fns twice
    }
    for (const k of Object.keys(n)) {
      const v = n[k];
      if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c));
      else if (v && typeof v.type === 'string') walk(v);
    }
  };
  walk(ast);

  if (!edits.length) continue;
  let out = src;
  for (const e of edits.sort((a, b) => b.range[0] - a.range[0])) {
    if (e.kind === 'rename') {
      out = out.slice(0, e.range[0]) + '_chainState' + out.slice(e.range[1]);
    } else {
      let s = e.range[0];
      while (s > 0 && out[s - 1] !== '\n') s -= 1;
      let en = e.range[1];
      while (en < out.length && out[en] !== '\n') en += 1;
      out = out.slice(0, s) + out.slice(en + 1);
    }
  }
  try {
    parse(out, { range: true });
  } catch (err) {
    console.error(`  !! ${file}: output does not parse (${err.message})`);
    continue;
  }
  writeFileSync(file, out);
  files += 1;
  console.log(`  ${file}`);
}
console.log(`\nmerged the two state bags in ${fixed} function(s) across ${files} file(s)`);
