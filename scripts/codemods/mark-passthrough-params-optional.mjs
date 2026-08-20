#!/usr/bin/env node
/*
 * Mark a trailing parameter optional when its ONLY use is being passed straight
 * through to a sink that defaults it.
 *
 * The SDK is full of attribute getters shaped like:
 *
 *   getMaxHP(withAuras) { return this.getBuffedAttribute(this.maxHP, 'maxHP', withAuras); }
 *
 * `getBuffedAttribute`/`getBaseAttribute` both do `if (withAuras == null)
 * withAuras = true`, so calling `getMaxHP()` is correct and TypeScript's TS2554
 * is wrong -- but the previous codemod could not see it, because the default
 * lives one level down rather than in this function's own body.
 *
 * DELIBERATELY NARROW. The sinks are an explicit allowlist, verified by reading
 * them, and the parameter must be used *only* as an argument to one of them.
 * A blanket "trust the call sites" rule would be the wrong tool here: the whole
 * reason for reading TS2554 rather than silencing it is that a genuinely
 * missing argument is a real bug, and this pass must not mask one.
 *
 * Type-only; emits no JavaScript.
 *
 * Usage: node scripts/codemods/mark-passthrough-params-optional.mjs <files...>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from '@typescript-eslint/parser';

// verified to default every parameter from index 2 onward
const SINKS = new Set(['getBuffedAttribute', 'getBaseAttribute']);

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

let files = 0; let marked = 0;
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  let ast;
  try { ast = parse(src, { range: true }); } catch { continue; }

  const edits = [];
  walk(ast, (node) => {
    if (node.type !== 'MethodDefinition' || !node.value || !node.value.body) return;
    const fn = node.value;
    const last = fn.params[fn.params.length - 1];
    if (!last || last.type !== 'Identifier' || last.optional) return;

    let uses = 0; let passThrough = 0;
    walk(fn.body, (n) => {
      if (n.type === 'Identifier' && n.name === last.name) uses += 1;
      if (n.type === 'CallExpression' && n.callee.type === 'MemberExpression'
          && n.callee.property && SINKS.has(n.callee.property.name)) {
        n.arguments.forEach((a, idx) => {
          if (a.type === 'Identifier' && a.name === last.name && idx >= 2) passThrough += 1;
        });
      }
    });
    // every mention of the parameter is one of the pass-through arguments
    if (passThrough > 0 && uses === passThrough) { edits.push(last.range[1]); marked += 1; }
  });

  if (!edits.length) continue;
  let out = src;
  for (const at of [...new Set(edits)].sort((a, b) => b - a)) out = `${out.slice(0, at)}?${out.slice(at)}`;
  try { parse(out, { range: true }); } catch (e) {
    console.error(`  !! ${file}: output does not parse (${e.message})`); continue;
  }
  writeFileSync(file, out);
  files += 1;
}
console.log(`marked ${marked} pass-through parameter(s) optional across ${files} file(s)`);
