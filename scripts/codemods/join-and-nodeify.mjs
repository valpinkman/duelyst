#!/usr/bin/env node
/*
 * bluebird `Promise.join` and `.nodeify` -> native equivalents.
 *
 *   Promise.join(a, b, (x, y) => ...)   ->  Promise.all([a, b]).then(([x, y]) => ...)
 *   somePromise.nodeify(cb)             ->  somePromise.then((v) => cb(null, v), (e) => cb(e))
 *
 * `Promise.join` is just `Promise.all` with the results spread as arguments, so
 * the handler's parameter list becomes an array pattern - exactly the `.spread`
 * transform from stage 1.
 *
 * `.nodeify` bridged a promise back to a node-style callback. Both arms are
 * needed: a single `.then(v => cb(null, v))` would leave rejections unhandled
 * and silently drop the error.
 *
 * AST-driven, and the output is re-parsed before writing.
 *
 * Usage: node scripts/codemods/join-and-nodeify.mjs <files...>
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const tsParser = require('@typescript-eslint/parser');

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

let files = 0; let joins = 0; let nodeifies = 0;

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try { ast = tsParser.parse(src, { ecmaVersion: 2022, sourceType: 'script', range: true }); }
  catch (e) { console.log(`skipped ${file}: parse error`); continue; }

  const edits = [];

  walk(ast, (node) => {
    if (node.type !== 'CallExpression') return;
    const c = node.callee;
    if (!c || c.type !== 'MemberExpression' || c.computed || c.property.type !== 'Identifier') return;

    // Promise.join(p1, ..., handler)
    if (c.property.name === 'join' && c.object.type === 'Identifier' && c.object.name === 'Promise'
      && node.arguments.length >= 2) {
      const args = node.arguments;
      const handler = args[args.length - 1];
      if (handler.type !== 'FunctionExpression' && handler.type !== 'ArrowFunctionExpression') return;
      const promises = args.slice(0, -1).map((a) => src.slice(a.range[0], a.range[1])).join(', ');
      const params = handler.params.length
        ? src.slice(handler.params[0].range[0], handler.params[handler.params.length - 1].range[1])
        : '';
      const bodyText = src.slice(handler.body.range[0], handler.body.range[1]);
      const isArrow = handler.type === 'ArrowFunctionExpression';
      const head = isArrow
        ? `(${params ? `[${params}]` : ''}) => `
        : `function (${params ? `[${params}]` : ''}) `;
      edits.push({
        start: node.range[0],
        end: node.range[1],
        text: `Promise.all([${promises}]).then(${head}${bodyText})`,
      });
      joins += 1;
      return;
    }

    // <promise>.nodeify(cb)
    if (c.property.name === 'nodeify' && node.arguments.length === 1) {
      const cb = src.slice(node.arguments[0].range[0], node.arguments[0].range[1]);
      edits.push({
        start: c.property.range[0] - 1, // the '.'
        end: node.range[1],
        text: `.then((v) => ${cb}(null, v), (e) => ${cb}(e))`,
      });
      nodeifies += 1;
    }
  });

  if (!edits.length) continue;
  edits.sort((a, b) => b.start - a.start);
  let out = src;
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);

  try { tsParser.parse(out, { ecmaVersion: 2022, sourceType: 'script' }); }
  catch (e) { console.log(`SKIPPED ${file}: output would not parse`); continue; }

  fs.writeFileSync(file, out);
  files += 1;
  console.log(`${file}: ${edits.length} converted`);
}
console.log(`\n${joins} Promise.join, ${nodeifies} .nodeify across ${files} file(s)`);
