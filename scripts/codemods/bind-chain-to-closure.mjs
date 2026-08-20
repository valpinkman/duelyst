#!/usr/bin/env node
/*
 * bluebird `.bind({})` promise chains -> an explicit `_chainState` object.
 *
 * bluebird let a chain carry state by binding `this` for every callback:
 *
 *     doThing()
 *       .bind({})
 *       .then(function (row) { this.row = row; return next(); })
 *       .then(function ()    { return use(this.row); })
 *
 * Native promises have no equivalent, so the shared object becomes an ordinary
 * closure variable declared beside the chain. This is the same transform
 * `fix-then-this.mjs` applied earlier for chains that leaked state through
 * accidental GLOBALS; this one handles the chains that bound it explicitly.
 *
 * Rules, all of which matter:
 *  - only `this` whose nearest enclosing non-arrow function is a callback to a
 *    promise combinator is rewritten. `this` in a knex grouped-where callback,
 *    or in a class method, means something else and is left alone.
 *  - the declaration is hosted on the nearest enclosing method/function, and
 *    only added if that function does not already declare `_chainState` - some
 *    files were converted by the earlier codemod and must not double-declare.
 *  - `function` callbacks are NOT arrowed. An arrow would capture the
 *    enclosing `this`, which is exactly what we are removing.
 *
 * Usage: node scripts/codemods/bind-chain-to-closure.mjs <files...>
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
/*
 * espree parses JavaScript only, and most of this codebase is TypeScript now -
 * it fails on the first type annotation with "Unexpected token :". The
 * typescript-eslint parser produces an ESTree-compatible AST with the same node
 * types, so the walk below is unchanged.
 */
const tsParser = require('@typescript-eslint/parser');
const espree = {
  parse: (code) => tsParser.parse(code, { ecmaVersion: 2022, sourceType: 'script', loc: true, range: true }),
};

const COMBINATORS = new Set(['then', 'catch', 'finally', 'tap', 'spread', 'map', 'each',
  'reduce', 'filter', 'nodeify', 'done', 'caught', 'error', 'bind']);

function walk(node, visit, parents = []) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parents);
  const next = parents.concat(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
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

/**
 * The function that should host `const _chainState = {}`: the nearest
 * enclosing function ABOVE the callback, whatever form it takes.
 *
 * All four forms occur here, and missing one is not a cosmetic failure - the
 * `this` refs still get rewritten, so a missed declaration means
 * `ReferenceError: _chainState is not defined` at runtime:
 *   - a method             `foo() { ... }`
 *   - an object property   `foo: function () { ... }`
 *   - a declaration        `function foo() { ... }`
 *   - a variable           `const foo = function () { ... }`   <- easily missed
 *   - an arrow             `const foo = () => { ... }`
 */
function hostFor(parents, fnIdx) {
  for (let i = fnIdx - 1; i >= 0; i -= 1) {
    const p = parents[i];
    if (p.type === 'FunctionExpression' || p.type === 'FunctionDeclaration'
      || p.type === 'ArrowFunctionExpression') {
      // an arrow with an expression body has nowhere to put a declaration
      if (p.body && p.body.type === 'BlockStatement') return p;
    }
  }
  return null;
}

let files = 0;
let binds = 0;
let thisRefs = 0;

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try {
    ast = espree.parse(src, { ecmaVersion: 2022, sourceType: 'script', loc: true, range: true });
  } catch (e) {
    console.log(`skipped ${file}: parse error (${e.message.slice(0, 60)})`);
    continue;
  }

  const edits = [];
  const hostsNeedingDecl = new Map();
  let unhosted = 0;
  let bindCount = 0;

  // 1. drop every `.bind({})` in a chain
  walk(ast, (node) => {
    if (node.type !== 'CallExpression') return;
    const c = node.callee;
    if (!c || c.type !== 'MemberExpression' || c.computed) return;
    if (c.property.type !== 'Identifier' || c.property.name !== 'bind') return;
    if (node.arguments.length !== 1) return;
    const arg = node.arguments[0];
    if (arg.type !== 'ObjectExpression' || arg.properties.length !== 0) return;
    // remove from the end of the object being bound to the closing paren
    edits.push({ start: c.object.range[1], end: node.range[1], text: '' });
    bindCount += 1;
  });
  if (!bindCount) continue;

  // 2. rewrite `this` inside promise callbacks
  walk(ast, (node, parents) => {
    if (node.type !== 'ThisExpression') return;
    let fn = null;
    let fnIdx = -1;
    for (let i = parents.length - 1; i >= 0; i -= 1) {
      const p = parents[i];
      if (p.type === 'FunctionExpression' || p.type === 'FunctionDeclaration') { fn = p; fnIdx = i; break; }
      if (p.type === 'ArrowFunctionExpression') continue;
    }
    if (!fn || fn.type !== 'FunctionExpression') return;
    if (!isPromiseCallback(fn, parents.slice(0, fnIdx))) return;
    const host = hostFor(parents, fnIdx);
    if (!host) {
      // rewriting `this` without somewhere to declare _chainState would produce
      // a ReferenceError, so refuse rather than emit broken code
      unhosted += 1;
      return;
    }
    hostsNeedingDecl.set(host.body.range[0], host);
    edits.push({ start: node.range[0], end: node.range[1], text: '_chainState' });
    thisRefs += 1;
  });

  // 3. declare, unless this host already has one
  for (const [bodyStart, host] of hostsNeedingDecl) {
    const body = src.slice(host.body.range[0], host.body.range[1]);
    if (/const _chainState = \{\}/.test(body)) continue;
    // match the indentation the host's own first statement uses, so the result
    // does not need a follow-up lint --fix
    const first = host.body.body && host.body.body[0];
    const indent = first
      ? (src.slice(0, first.range[0]).match(/[^\n]*$/) || [''])[0].match(/^\s*/)[0]
      : '  ';
    edits.push({ start: bodyStart + 1, end: bodyStart + 1, text: `\n${indent}const _chainState = {};` });
  }

  if (unhosted) {
    console.log(`SKIPPED ${file}: ${unhosted} this-ref(s) with no place to declare _chainState`);
    continue;
  }
  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);
  fs.writeFileSync(file, out);
  files += 1;
  binds += bindCount;
  console.log(`${file}: ${bindCount} .bind({}) removed`);
}
console.log(`\n${binds} .bind({}) and ${thisRefs} this-refs across ${files} file(s)`);
