#!/usr/bin/env node
/*
 * bluebird `.timeout(ms)` -> `PromiseUtils.withTimeout(chain, ms)`.
 *
 * `.timeout` applies to the promise it is called ON - everything earlier in the
 * chain - so this is a WRAP, not another step:
 *
 *     fetch(url).then(parse).timeout(10000).then(use)
 *     PromiseUtils.withTimeout(fetch(url).then(parse), 10000).then(use)
 *
 * ⚠ SERVER-SIDE LIMIT: do NOT run this on code inside knex transactions while
 * knex 0.19 is in use. bluebird's `.timeout` CANCELS the operation it wraps; a
 * Promise.race does not, and knex 0.19 is itself bluebird-based, so a native
 * promise returned from a transaction callback leaves the transaction to commit
 * and then see further queries - "Transaction query already complete". That is
 * why only client-side call sites are converted today; the rest wait for knex 3.
 *
 * Output is re-parsed before writing.
 *
 * Usage: node scripts/codemods/timeout-to-helper.mjs <files...>
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

let files = 0; let sites = 0;
for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');
  let ast;
  try { ast = tsParser.parse(src, { ecmaVersion: 2022, sourceType: 'script', range: true }); }
  catch { console.log(`skipped ${file}: parse error`); continue; }

  const hits = [];
  walk(ast, (node) => {
    if (node.type !== 'CallExpression') return;
    const c = node.callee;
    if (!c || c.type !== 'MemberExpression' || c.computed) return;
    if (c.property.type !== 'Identifier' || c.property.name !== 'timeout') return;
    if (node.arguments.length !== 1) return;
    const arg = node.arguments[0];
    if (arg.type !== 'Literal' || typeof arg.value !== 'number') return;
    hits.push({ objStart: c.object.range[0], objEnd: c.object.range[1], end: node.range[1], ms: arg.value });
  });
  if (!hits.length) continue;

  hits.sort((a, b) => b.objStart - a.objStart);
  let out = src;
  for (const h of hits) {
    const chain = out.slice(h.objStart, h.objEnd);
    out = `${out.slice(0, h.objStart)}PromiseUtils.withTimeout(${chain}, ${h.ms})${out.slice(h.end)}`;
    sites += 1;
  }

  // insert the BINDING, not merely the module path - a file may already import
  // `{ onType }` from here and still lack `PromiseUtils`
  if (!/(?:const|var|let)\s+PromiseUtils\s*=/.test(out)) {
    const reqs = [...out.matchAll(/^(?:const|var|let) .*= require\(.*\);$/gm)];
    if (reqs.length) {
      const last = reqs[reqs.length - 1];
      const depth = file.startsWith('app/') ? 0 : (file.match(/\//g) || []).length;
      const rel = depth ? `${'../'.repeat(depth)}app/common/utils/utils_promise` : 'app/common/utils/utils_promise';
      out = `${out.slice(0, last.index + last[0].length)}\nconst PromiseUtils = require('${rel}');${out.slice(last.index + last[0].length)}`;
    }
  }

  try { tsParser.parse(out, { ecmaVersion: 2022, sourceType: 'script' }); }
  catch { console.log(`SKIPPED ${file}: output would not parse`); continue; }

  fs.writeFileSync(file, out);
  files += 1;
  console.log(`${file}: ${hits.length} .timeout wrapped`);
}
console.log(`\n${sites} .timeout(ms) converted across ${files} file(s)`);
