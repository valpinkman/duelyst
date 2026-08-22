#!/usr/bin/env node
/*
 * Mark trailing parameters optional when the function itself defaults them.
 *
 * Decaffeinate rendered CoffeeScript default parameters as a guard at the top
 * of the body:
 *
 *   getObstructionAtPosition(pos, allowUntargetable, allowQueued) {
 *     if (allowUntargetable == null) { allowUntargetable = true; }
 *     if (allowQueued == null) { allowQueued = true; }
 *
 * TypeScript sees three REQUIRED parameters and reports TS2554 on every caller
 * that passes one -- even though passing one is exactly what the defaults are
 * for. These are not bugs; the signature is simply lying about optionality.
 *
 * Marks the longest TRAILING RUN of such parameters with `?`, because TypeScript
 * requires optional parameters to come last. A defaulted parameter followed by a
 * non-defaulted one is left alone and reported.
 *
 * Adding `?` is type-only and emits no JavaScript; the runtime guard that
 * actually applies the default is untouched.
 *
 * Arrow functions passed DIRECTLY as call arguments are skipped. Those are
 * callbacks invoked by a promise or a library, never by a call site of ours, so
 * they are never what TS2554 is complaining about -- marking their parameters
 * optional would be pure noise (`.catch((err?) => ...)`). Arrows assigned to a
 * variable are kept, because our own code does call those.
 *
 * Usage: node tools/codemods/mark-defaulted-params-optional.mjs <files...>
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { parse } from '@typescript-eslint/parser';

const FN = new Set([
  'FunctionDeclaration',
  'FunctionExpression',
  'ArrowFunctionExpression',
  'MethodDefinition',
  'TSDeclareFunction',
]);

const walk = (node, fn, parent = null) => {
  if (!node || typeof node.type !== 'string') return;
  fn(node, parent);
  for (const k of Object.keys(node)) {
    if (k === 'parent') continue;
    const v = node[k];
    if (Array.isArray(v)) v.forEach((c) => c && typeof c.type === 'string' && walk(c, fn, node));
    else if (v && typeof v.type === 'string') walk(v, fn, node);
  }
};

/**
 * Does the body default `name` itself?
 *
 * Two spellings, both from decaffeinate:
 *   if (name == null) { name = X; }          <- CoffeeScript default parameter
 *   const NOW = name || moment.utc();        <- `name ? default` idiom
 * The second is how ~81 data_access functions treat their trailing `systemTime`
 * parameter, which is why they all reported TS2554 at every caller.
 */
const defaultsParam = (body, name) => {
  if (!body || body.type !== 'BlockStatement') return false;

  /*
   * `const NOW = name || moment.utc()`.
   *
   * Deliberately requires the fallback to be a moment() call rather than
   * accepting any `name || X`. A bare `||` is NOT evidence of optionality --
   * `const limit = maxCount || 100` is falsy-tolerance for a required
   * parameter, and an earlier, looser version of this rule happily produced
   * `setIsDeveloperMode(val?)`, which is wrong. The moment form is the
   * "systemTime defaults to now" idiom used by ~81 data_access functions, and
   * it does mean the parameter is optional.
   */
  let timeDefaulted = false;
  walk(body, (n) => {
    if (n.type !== 'LogicalExpression' || n.operator !== '||') return;
    if (n.left.type !== 'Identifier' || n.left.name !== name) return;
    // unwrap both spellings: `moment.utc()` and `moment().utc()`
    let right = n.right;
    for (let i = 0; i < 6 && right; i += 1) {
      if (right.type === 'CallExpression') right = right.callee;
      else if (right.type === 'MemberExpression') right = right.object;
      else break;
    }
    if (right && right.type === 'Identifier' && right.name === 'moment') timeDefaulted = true;
  });
  if (timeDefaulted) return true;

  for (const stmt of body.body) {
    if (stmt.type !== 'IfStatement') continue;
    const t = stmt.test;
    if (t.type !== 'BinaryExpression') continue;
    if (!['==', '==='].includes(t.operator)) continue;
    const isNullish = (n) =>
      (n.type === 'Literal' && n.value === null) ||
      (n.type === 'Identifier' && n.name === 'undefined');
    const named = (n) => n.type === 'Identifier' && n.name === name;
    if (!((named(t.left) && isNullish(t.right)) || (named(t.right) && isNullish(t.left)))) continue;
    return true;
  }
  return false;
};

let files = 0;
let marked = 0;
const blocked = [];
for (const file of process.argv.slice(2)) {
  const src = readFileSync(file, 'utf8');
  let ast;
  try {
    ast = parse(src, { range: true });
  } catch {
    continue;
  }

  const edits = [];
  walk(ast, (node, parent) => {
    const fn = node.type === 'MethodDefinition' ? node.value : node;
    if (!FN.has(node.type) && node.type !== 'MethodDefinition') return;
    // a callback handed straight to something else: not our call site
    if (
      node.type === 'ArrowFunctionExpression' &&
      parent &&
      parent.type === 'CallExpression' &&
      parent.arguments.includes(node)
    )
      return;
    if (!fn || !fn.params || !fn.params.length || !fn.body) return;

    // longest trailing run of self-defaulted, plain identifier params
    let i = fn.params.length - 1;
    for (; i >= 0; i -= 1) {
      const p = fn.params[i];
      if (p.type !== 'Identifier' || p.optional) break;
      if (!defaultsParam(fn.body, p.name)) break;
      edits.push(p.range[1]);
      marked += 1;
    }
    // a defaulted param sitting before a non-defaulted one cannot be marked
    for (let j = i; j >= 0; j -= 1) {
      const p = fn.params[j];
      if (p.type === 'Identifier' && !p.optional && defaultsParam(fn.body, p.name)) {
        blocked.push(`${file}: ${p.name} (a later parameter is not defaulted)`);
      }
    }
  });

  if (!edits.length) continue;
  let out = src;
  for (const at of [...new Set(edits)].sort((a, b) => b - a))
    out = `${out.slice(0, at)}?${out.slice(at)}`;
  try {
    parse(out, { range: true });
  } catch (e) {
    console.error(`  !! ${file}: output does not parse (${e.message})`);
    continue;
  }
  writeFileSync(file, out);
  files += 1;
}

console.log(`marked ${marked} parameter(s) optional across ${files} file(s)`);
if (blocked.length) {
  console.log(`${blocked.length} defaulted parameter(s) left alone (not in a trailing run):`);
  for (const b of blocked.slice(0, 8)) console.log(`  ${b}`);
}
