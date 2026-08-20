/*
 * Fix the decaffeinated ".then(function (x) { this.y = x; ... })" pattern
 * (MODERNIZATION_PLAN.md Phase 6 follow-up).
 *
 * CoffeeScript thin-arrow promise callbacks compiled to sloppy-mode functions
 * where `this` was the GLOBAL object - the original code passed chain state
 * between .then callbacks through accidental globals (shared across
 * concurrent requests!). decaffeinate faithfully emits `this.x` in plain
 * function expressions, but inside ES6 class bodies those run in strict mode
 * where `this` is undefined -> TypeError at runtime.
 *
 * Transform, per top-level function/method: any ThisExpression whose nearest
 * enclosing non-arrow function is a plain FunctionExpression passed to a
 * promise combinator (.then/.catch/.finally/.tap/.spread/.map/.each/.reduce/
 * .filter/.nodeify/.done) becomes `_chainState`, declared once at the top of
 * the enclosing method. This preserves the author's intent (state shared
 * along one promise chain) while scoping it per call instead of per process.
 *
 * `this` inside callbacks to anything else (e.g. knex grouped-where
 * callbacks, which bind `this` on purpose) is left untouched.
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const espree = require(require.resolve('espree', { paths: [require.resolve('eslint')] }));

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
]);

function walk(node, visit, parents = []) {
  if (!node || typeof node.type !== 'string') return;
  visit(node, parents);
  const nextParents = parents.concat(node);
  for (const key of Object.keys(node)) {
    if (key === 'parent') continue;
    const value = node[key];
    if (Array.isArray(value)) {
      value.forEach((child) => walk(child, visit, nextParents));
    } else if (value && typeof value.type === 'string') {
      walk(value, visit, nextParents);
    }
  }
}

function isPromiseCallback(fnNode, parents) {
  // fnNode must be an argument of a call like <expr>.then(fnNode)
  const parent = parents[parents.length - 1];
  if (!parent || parent.type !== 'CallExpression') return false;
  if (!parent.arguments.includes(fnNode)) return false;
  const callee = parent.callee;
  return (
    callee &&
    callee.type === 'MemberExpression' &&
    !callee.computed &&
    callee.property.type === 'Identifier' &&
    COMBINATORS.has(callee.property.name)
  );
}

let totalFiles = 0;
let totalRewrites = 0;
for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  const ast = espree.parse(src, {
    ecmaVersion: 2022,
    sourceType: 'script',
    loc: true,
    range: true,
  });

  // collect: for every ThisExpression, its chain of enclosing functions
  const edits = []; // {start, end, text}
  const methodsNeedingDecl = new Map(); // methodBodyStart -> true

  walk(ast, (node, parents) => {
    if (node.type !== 'ThisExpression') return;
    // nearest enclosing non-arrow function
    let fn = null;
    let fnIdx = -1;
    for (let i = parents.length - 1; i >= 0; i--) {
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
    // find the enclosing METHOD (or top-level function) to host the declaration:
    // nearest enclosing MethodDefinition value / FunctionDeclaration above fn
    let host = null;
    for (let i = fnIdx - 1; i >= 0; i--) {
      const p = parents[i];
      if (
        (p.type === 'FunctionExpression' &&
          parents[i - 1] &&
          (parents[i - 1].type === 'MethodDefinition' || parents[i - 1].type === 'Property')) ||
        p.type === 'FunctionDeclaration'
      ) {
        host = p;
        break;
      }
    }
    if (!host) host = fn; // fall back: declare inside the callback's own body? avoid - use file top-level function
    const bodyStart = host.body.range[0] + 1; // after '{'
    methodsNeedingDecl.set(bodyStart, true);
    edits.push({ start: node.range[0], end: node.range[1], text: '_chainState' });
  });

  if (edits.length === 0) continue;
  for (const start of methodsNeedingDecl.keys()) {
    edits.push({ start, end: start, text: '\n    const _chainState = {};' });
  }
  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) {
    out = out.slice(0, e.start) + e.text + out.slice(e.end);
  }
  fs.writeFileSync(file, out);
  totalFiles += 1;
  totalRewrites += edits.length - methodsNeedingDecl.size;
  console.log(
    `${file}: ${edits.length - methodsNeedingDecl.size} this-refs scoped in ${methodsNeedingDecl.size} function(s)`,
  );
}
console.log(`\n${totalRewrites} rewrites across ${totalFiles} file(s)`);
