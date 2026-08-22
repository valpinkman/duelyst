#!/usr/bin/env node
/*
 * bluebird `.bind(someVar)` chains -> reference `someVar` directly.
 *
 *     const this_obj = { cardSetData };
 *     knex.first().where(...).bind(this_obj)
 *       .then(function (row) { this.row = row; })
 *       .then(function ()    { return use(this.row, this.cardSetData); })
 *
 * The bound object is already a named variable in scope, so unlike the
 * `.bind({})` case there is nothing to declare - `this` simply becomes that
 * name. Simpler and safer: no new binding is introduced, and the object keeps
 * whatever initial properties it was given.
 *
 * Only `this` whose nearest enclosing non-arrow function is a promise-combinator
 * callback is rewritten; `this` in a knex transaction callback (which knex binds
 * on purpose) is left alone.
 *
 * Usage: node tools/codemods/bind-named-to-variable.mjs <files...>
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tsParser = require('@typescript-eslint/parser');

const COMBINATORS = new Set([
  'then',
  'catch',
  'finally',
  'tap',
  'spread',
  'map',
  'each',
  'reduce',
  'filter',
  'nodeify',
  'done',
  'caught',
  'error',
  'bind',
]);

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
  return (
    c &&
    c.type === 'MemberExpression' &&
    !c.computed &&
    c.property.type === 'Identifier' &&
    COMBINATORS.has(c.property.name)
  );
}

let files = 0;
let binds = 0;
let refs = 0;

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = tsParser.parse(src, { ecmaVersion: 2022, sourceType: 'script', loc: true, range: true });
  } catch (e) {
    console.log(`skipped ${file}: parse error (${e.message.slice(0, 60)})`);
    continue;
  }

  const edits = [];
  const bound = []; // {start, end, name} of each .bind(name) call

  walk(ast, (node) => {
    if (node.type !== 'CallExpression') return;
    const c = node.callee;
    if (!c || c.type !== 'MemberExpression' || c.computed) return;
    if (c.property.type !== 'Identifier' || c.property.name !== 'bind') return;
    if (node.arguments.length !== 1) return;
    const arg = node.arguments[0];
    if (arg.type !== 'Identifier') return; // only `.bind(someVar)`
    if (arg.name === 'this') return;
    bound.push({ start: node.range[0], end: node.range[1], name: arg.name });
    edits.push({ start: c.object.range[1], end: node.range[1], text: '' });
  });
  if (!bound.length) continue;

  walk(ast, (node, parents) => {
    if (node.type !== 'ThisExpression') return;
    let fn = null;
    let fnIdx = -1;
    for (let i = parents.length - 1; i >= 0; i -= 1) {
      const p = parents[i];
      if (p.type === 'FunctionExpression' || p.type === 'FunctionDeclaration') {
        fn = p;
        fnIdx = i;
        break;
      }
      if (p.type === 'ArrowFunctionExpression') continue;
    }
    if (!fn || fn.type !== 'FunctionExpression') return;
    if (!isPromiseCallback(fn, parents.slice(0, fnIdx))) return;
    // attribute to the nearest preceding .bind(name) in source order
    const owner = bound.filter((b) => b.start < node.range[0]).pop();
    if (!owner) return;
    edits.push({ start: node.range[0], end: node.range[1], text: owner.name });
    refs += 1;
  });

  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  fs.writeFileSync(file, out);
  files += 1;
  binds += bound.length;
  console.log(`${file}: ${bound.length} .bind(name) removed`);
}
console.log(`\n${binds} .bind(name) and ${refs} this-refs across ${files} file(s)`);
