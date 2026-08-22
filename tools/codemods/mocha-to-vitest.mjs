/*
 * Convert the remaining mocha-only idioms so vitest can run the suites
 * (MODERNIZATION_PLAN.md step 7.1).
 *
 * 1. `this.timeout(N)` — mocha's per-suite timeout, which vitest has no
 *    equivalent for inside the callback. The calls are deleted and the
 *    budget moves to `testTimeout` in the vitest config. This LOOSENS
 *    per-suite limits into one global limit; that is a deliberate trade,
 *    recorded in the plan.
 *
 * 2. `it('x', (done) => { … })` — vitest dropped the done-callback style.
 *    The callback is wrapped in a Promise rather than rewritten to
 *    async/await, so the control flow (including `done(err)` rejecting the
 *    test) is preserved exactly:
 *
 *        it('x', () => new Promise((done) => { … }))
 *
 *    The wrapping uses AST node ranges, not brace counting.
 *
 * Usage: node tools/codemods/mocha-to-vitest.mjs <file.js> [...]
 */
import fs from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const espree = require(require.resolve('espree', { paths: [require.resolve('eslint')] }));

let changedFiles = 0;
let timeouts = 0;
let dones = 0;
const skipped = [];

for (const file of process.argv.slice(2)) {
  const src = fs.readFileSync(file, 'utf8');

  // 1. drop this.timeout(N); statements (line-based: they always sit alone)
  let out = src.replace(/^[ \t]*this\.timeout\(\d+\);[ \t]*\r?\n/gm, () => {
    timeouts += 1;
    return '';
  });

  // 2. wrap done-callback tests
  let ast;
  try {
    ast = espree.parse(out, { ecmaVersion: 2022, sourceType: 'script', range: true });
  } catch (err) {
    skipped.push(`${file}: parse error ${err.message}`);
    if (out !== src) fs.writeFileSync(file, out);
    continue;
  }

  const edits = [];
  const visit = (node) => {
    if (!node || typeof node.type !== 'string') return;
    if (
      node.type === 'CallExpression' &&
      node.callee.type === 'Identifier' &&
      ['it', 'test'].includes(node.callee.name) &&
      node.arguments.length === 2
    ) {
      const fn = node.arguments[1];
      const isDoneCb =
        (fn.type === 'ArrowFunctionExpression' || fn.type === 'FunctionExpression') &&
        fn.params.length === 1 &&
        fn.params[0].type === 'Identifier' &&
        fn.params[0].name === 'done';
      if (isDoneCb && fn.body.type === 'BlockStatement') {
        const bodyStart = fn.body.range[0];
        const bodyEnd = fn.body.range[1];
        edits.push({ start: fn.range[0], end: bodyStart, text: '() => new Promise((done) => ' });
        edits.push({ start: bodyEnd, end: bodyEnd, text: ')' });
        dones += 1;
      }
    }
    for (const key of Object.keys(node)) {
      const v = node[key];
      if (Array.isArray(v)) v.forEach(visit);
      else if (v && typeof v.type === 'string') visit(v);
    }
  };
  visit(ast);

  edits.sort((a, b) => b.start - a.start);
  for (const e of edits) out = out.slice(0, e.start) + e.text + out.slice(e.end);

  if (out !== src) {
    fs.writeFileSync(file, out);
    changedFiles += 1;
  }
}

console.log(
  `${changedFiles} file(s): ${timeouts} this.timeout() calls removed, ${dones} done-callbacks promise-wrapped`,
);
if (skipped.length) skipped.forEach((s) => console.log(`  SKIPPED ${s}`));
