#!/usr/bin/env node
/*
 * bluebird `.bind(this)` chains -> an explicit `_self` capture.
 *
 *     somePromise.bind(this)
 *       .then(function () { this.render(); })
 *
 * becomes
 *
 *     const _self = this;
 *     somePromise
 *       .then(function () { _self.render(); })
 *
 * Deliberately NOT done by arrowing the callbacks, even though an arrow
 * captures the enclosing `this` and looks equivalent. Two earlier attempts at
 * that broke the client:
 *
 *   1. Matching `.bind(this)` without checking what it is attached to caught
 *      `Function.prototype.bind` - `setTimeout(function () {...}.bind(this))` -
 *      and stripping it made `this` undefined
 *      (TypeError: this.showBrand is not a function).
 *   2. Treating `map`/`each`/`filter` as promise combinators caught UNDERSCORE
 *      callbacks (`_.each(data, function (d) {...})`) and arrowed those too,
 *      silently changing `this` in code that has nothing to do with promises.
 *
 * So this version changes as little as possible: it only rewrites `this` inside
 * callbacks, never the callback's form, and only for a bind whose result is
 * immediately chained into a promise-only combinator.
 *
 * Usage: node scripts/codemods/bind-this-to-self.mjs <files...>
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tsParser = require('@typescript-eslint/parser');

// promise-only. `map`/`each`/`filter`/`reduce` are omitted ON PURPOSE: they
// collide with underscore and Array, and matching them caused a real breakage.
const COMBINATORS = new Set(['then', 'catch', 'finally', 'tap', 'spread', 'caught', 'done']);

function walk(node, visit, parents = []) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parents);
  const next = parents.concat(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent' || key === 'loc' || key === 'range') continue;
    const v = node[key];
    if (Array.isArray(v)) v.forEach((c) => walk(c, visit, next));
    else if (v && typeof v.type === 'string') walk(v, visit, next);
  }
}

function isPromiseCallback(fnNode, parents) {
  const parent = parents[parents.length - 1];
  if (!parent || parent.type !== 'CallExpression') return false;
  if (!parent.arguments.includes(fnNode)) return false;
  const c = parent.callee;
  return c && c.type === 'MemberExpression' && !c.computed
    && c.property.type === 'Identifier' && COMBINATORS.has(c.property.name);
}

function hostFor(parents, fnIdx) {
  for (let i = fnIdx - 1; i >= 0; i -= 1) {
    const p = parents[i];
    if ((p.type === 'FunctionExpression' || p.type === 'FunctionDeclaration'
      || p.type === 'ArrowFunctionExpression') && p.body && p.body.type === 'BlockStatement') return p;
  }
  return null;
}

let files = 0; let removed = 0; let refs = 0;

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = tsParser.parse(src, { ecmaVersion: 2022, sourceType: 'script', loc: true, range: true });
  } catch (e) { console.log(`skipped ${file}: parse error`); continue; }

  const binds = [];
  walk(ast, (node, parents) => {
    if (node.type !== 'CallExpression') return;
    const c = node.callee;
    if (!c || c.type !== 'MemberExpression' || c.computed) return;
    if (c.property.type !== 'Identifier' || c.property.name !== 'bind') return;
    if (node.arguments.length !== 1 || node.arguments[0].type !== 'ThisExpression') return;
    // must be `X.bind(this).then(...)`, and X must not be a function literal
    const grand = parents[parents.length - 1];
    const chained = grand && grand.type === 'MemberExpression' && grand.object === node
      && !grand.computed && grand.property.type === 'Identifier'
      && COMBINATORS.has(grand.property.name);
    if (!chained) return;
    if (c.object.type === 'FunctionExpression' || c.object.type === 'ArrowFunctionExpression') return;
    binds.push({ node, objEnd: c.object.range[1] });
  });
  if (!binds.length) continue;

  const edits = binds.map((b) => ({ start: b.objEnd, end: b.node.range[1], text: '' }));
  const hosts = new Map();
  let unhosted = 0;

  walk(ast, (node, parents) => {
    if (node.type !== 'ThisExpression') return;
    let fn = null; let fnIdx = -1;
    for (let i = parents.length - 1; i >= 0; i -= 1) {
      const p = parents[i];
      if (p.type === 'FunctionExpression' || p.type === 'FunctionDeclaration') { fn = p; fnIdx = i; break; }
      if (p.type === 'ArrowFunctionExpression') continue;
    }
    if (!fn || fn.type !== 'FunctionExpression') return;
    if (!isPromiseCallback(fn, parents.slice(0, fnIdx))) return;
    // only `this` belonging to one of the binds we are removing
    if (!binds.some((b) => b.node.range[0] < node.range[0])) return;
    const host = hostFor(parents, fnIdx);
    if (!host) { unhosted += 1; return; }
    hosts.set(host.body.range[0], host);
    edits.push({ start: node.range[0], end: node.range[1], text: '_self' });
    refs += 1;
  });

  if (unhosted) { console.log(`SKIPPED ${file}: ${unhosted} this-ref(s) with nowhere to declare _self`); continue; }

  for (const [bodyStart, host] of hosts) {
    const body = src.slice(host.body.range[0], host.body.range[1]);
    if (/const _self = this;/.test(body)) continue;
    const first = host.body.body && host.body.body[0];
    const indent = first ? (src.slice(0, first.range[0]).match(/[^\n]*$/) || [''])[0].match(/^\s*/)[0] : '  ';
    edits.push({ start: bodyStart + 1, end: bodyStart + 1, text: `\n${indent}const _self = this;` });
  }

  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);

  /*
   * Refuse to write output that does not parse. Overlapping or mis-ranged
   * edits produce things like `onSyncOrReady())` - a stray paren that a diff
   * review can easily miss but that breaks the whole bundle. Cheap to check,
   * and it turns a silent corruption into a skipped file.
   */
  try {
    tsParser.parse(out, { ecmaVersion: 2022, sourceType: 'script' });
  } catch (e) {
    console.log(`SKIPPED ${file}: output would not parse (${e.message.slice(0, 50)})`);
    continue;
  }

  fs.writeFileSync(file, out);
  files += 1; removed += binds.length;
  console.log(`${file}: ${binds.length} bind(this) removed`);
}
console.log(`\n${removed} .bind(this) removed, ${refs} this-ref(s) -> _self across ${files} file(s)`);
